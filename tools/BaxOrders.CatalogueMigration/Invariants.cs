using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Decisions;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Orders.Pricing;
using BaxOrders.Application.Reports;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.CatalogueMigration;

/// <summary>
/// The figures Task 3 must not move, read through the application's own queries — the numbers the screens show.
/// </summary>
/// <remarks>
/// <para>
/// Each figure is a key and a value. Location-level figures are keyed by the object's <b>code</b>, which the
/// migration never changes, so a renamed object is still compared with itself.
/// </para>
/// <para>
/// What is here: the order and line counts; the Qiymət təsnifatı counters; the 94 reclassified lines of HD-002,
/// hashed so a single changed field shows; every dashboard month on every standard basis, with each object's
/// money; every year of the monthly report, month by month and object by object; the Obyektlər figures of every
/// object; and every number the order screens show for orders 153 and 154.
/// </para>
/// <para>
/// What is deliberately not here: how many objects a screen counts. Those are the figures Task 3 exists to
/// change, and <c>--verify</c> checks them against the owner's expected result instead.
/// </para>
/// </remarks>
internal static class Invariants
{
    /// <summary>The two orders the specification names.</summary>
    private static readonly long[] Orders = [153, 154];

    private static readonly AnalyticsComparisonBasis[] Bases =
    [
        AnalyticsComparisonBasis.PreviousMonth,
        AnalyticsComparisonBasis.Previous3MonthAverage,
        AnalyticsComparisonBasis.Previous6MonthAverage,
        AnalyticsComparisonBasis.AllPriorMonths,
    ];

    public static async Task<SortedDictionary<string, string>> CaptureAsync(
        IServiceProvider provider, CancellationToken cancellationToken)
    {
        var db = Program.Db(provider);
        var figures = new SortedDictionary<string, string>(StringComparer.Ordinal);
        void Put(string key, object? value) => figures[key] = Format(value);

        Put("orders.requests", await db.OrderRequests.CountAsync(cancellationToken));
        Put("orders.lines", await db.OrderRequestItems.CountAsync(cancellationToken));

        var codes = await db.Locations.AsNoTracking().ToDictionaryAsync(location => location.Id, location => location.Code, cancellationToken);

        // ---- Qiymət təsnifatı, and the 94 lines of HD-002 --------------------------------------------------
        var pricing = await provider.GetRequiredService<PricingModeReviewService>()
            .GetAsync(new PricingModeReviewQuery(PageSize: 1), cancellationToken);
        Put("pricing.total", pricing.TotalCount);
        Put("pricing.unresolved", pricing.Unresolved);
        Put("pricing.missingRequiredPrice", pricing.MissingRequiredPrice);
        Put("pricing.internalFreeSupply", pricing.InternalFreeSupply);

        var decisions = await db.OrderItemPricingDecisions.AsNoTracking()
            .OrderBy(decision => decision.Id)
            .Select(decision => new
            {
                decision.Id,
                decision.OrderRequestItemId,
                decision.PreviousMode,
                decision.NewMode,
                decision.ActorUserId,
                decision.ActorDisplayName,
                decision.Reason,
                decision.OccurredAtUtc,
                CurrentMode = decision.OrderRequestItem.PricingMode,
                decision.OrderRequestItem.UnitPrice,
            })
            .ToListAsync(cancellationToken);
        Put("pricing.decisions.count", decisions.Count);
        Put("pricing.decisions.sha256", Hash(decisions.Select(decision => string.Join('|',
            decision.Id, decision.OrderRequestItemId, decision.PreviousMode, decision.NewMode, decision.ActorUserId,
            decision.ActorDisplayName, decision.Reason, decision.OccurredAtUtc.ToString("O", CultureInfo.InvariantCulture)))));
        Put("pricing.decisions.lines.sha256", Hash(decisions.Select(decision => string.Join('|',
            decision.OrderRequestItemId, decision.CurrentMode, Format(decision.UnitPrice)))));

        // ---- the dashboard: every month, every standard basis ------------------------------------------------
        var dashboard = provider.GetRequiredService<ManagementDashboardQueries>();
        var periods = await dashboard.GetPeriodsAsync(cancellationToken);
        foreach (var period in periods.Periods)
        {
            var month = period.Period.ToString("yyyy-MM", CultureInfo.InvariantCulture);
            Put($"dashboard.{month}.requests", period.RequestCount);
            Put($"dashboard.{month}.lines", period.ItemCount);

            foreach (var basis in Bases)
            {
                var result = await dashboard.GetAsync(
                    period.Period, new DashboardQuery(basis, PageSize: ManagementDashboardQueries.MaxPageSize), cancellationToken);
                if (result is null)
                {
                    Put($"dashboard.{month}.{basis}", "none");
                    continue;
                }

                var summary = result.Summary;
                var prefix = $"dashboard.{month}.{basis}";
                PutAmount(Put, $"{prefix}.current", summary.Current);
                PutAmount(Put, $"{prefix}.comparedCurrent", summary.ComparedCurrent);
                PutAmount(Put, $"{prefix}.baseline", summary.Baseline);
                Put($"{prefix}.delta", summary.KnownAmountDelta);
                Put($"{prefix}.percent", summary.KnownAmountPercentChange);
                Put($"{prefix}.locationsWithRequest", summary.LocationsWithCurrentRequest);
                Put($"{prefix}.requests", summary.CurrentRequestCount);
                Put($"{prefix}.compared", summary.Partition.Compared.Count);
                Put($"{prefix}.noOrderThisMonth", summary.Partition.NoOrderThisMonth.Count);
                Put($"{prefix}.noBaseline", summary.Partition.NoBaseline.Count);

                foreach (var row in result.Rows.Items.Where(row => row.HasCurrentRequest || row.Baseline.KnownAmount is not null))
                {
                    var rowPrefix = $"{prefix}.row.{row.LocationCode}";
                    Put($"{rowPrefix}.current", row.Current.KnownAmount);
                    Put($"{rowPrefix}.currentLines", row.Current.ItemCount);
                    Put($"{rowPrefix}.baseline", row.Baseline.KnownAmount);
                    Put($"{rowPrefix}.delta", row.KnownAmountDelta);
                    Put($"{rowPrefix}.percent", row.KnownAmountPercentChange);
                }
            }
        }

        // ---- the monthly report: every year ------------------------------------------------------------------
        var reports = provider.GetRequiredService<MonthlyReportQueries>();
        var first = await reports.GetAsync(new MonthlyReportQuery(), cancellationToken);
        foreach (var year in first.AvailableYears)
        {
            var report = await reports.GetAsync(new MonthlyReportQuery(year), cancellationToken);
            var prefix = $"report.{year}";
            Put($"{prefix}.total", report.KnownAmount);
            Put($"{prefix}.requests", report.RequestCount);
            Put($"{prefix}.missingPrices", report.MissingPriceItemCount);
            foreach (var month in report.Months)
            {
                Put($"{prefix}.month.{month.Month:D2}.amount", month.KnownAmount);
                Put($"{prefix}.month.{month.Month:D2}.locationsWithRequest", month.LocationsWithRequest);
                Put($"{prefix}.month.{month.Month:D2}.missingPrices", month.MissingPriceItemCount);
            }

            foreach (var row in report.Rows.Where(row => row.RequestCount > 0))
            {
                Put($"{prefix}.row.{row.LocationCode}.amount", row.KnownAmount);
                Put($"{prefix}.row.{row.LocationCode}.requests", row.RequestCount);
                Put($"{prefix}.row.{row.LocationCode}.missingPrices", row.MissingPriceItemCount);
                foreach (var cell in row.Months.Where(cell => cell.OrderRequestId is not null))
                {
                    Put($"{prefix}.row.{row.LocationCode}.month.{cell.Month:D2}.amount", cell.KnownAmount);
                    Put($"{prefix}.row.{row.LocationCode}.month.{cell.Month:D2}.delta", cell.DeltaAmount);
                }
            }
        }

        // ---- Obyektlər: every object that has ordered --------------------------------------------------------
        var list = await provider.GetRequiredService<LocationOrderQueries>().ListAsync(
            new LocationOrderListQuery(IncludeInactive: true, PageSize: LocationOrderQueries.MaxPageSize), cancellationToken);
        Put("locations.requests", list.OrderRequestCount);
        foreach (var row in list.Locations.Items.Where(row => row.OrderRequestCount > 0))
        {
            var prefix = $"locations.{row.Code}";
            Put($"{prefix}.requests", row.OrderRequestCount);
            Put($"{prefix}.periods", row.DistinctPeriodCount);
            Put($"{prefix}.lines", row.TotalItemCount);
            Put($"{prefix}.amount", row.KnownAmountTotal);
            Put($"{prefix}.missingPrices", row.MissingPriceItemCount);
            Put($"{prefix}.internalSupply", row.InternalSupplyItemCount);
            Put($"{prefix}.latestAmount", row.LatestKnownAmount);
            Put($"{prefix}.latestDelta", row.KnownAmountDelta);
        }

        // ---- orders 153 and 154: every number both order screens show ----------------------------------------
        var details = provider.GetRequiredService<OrderRequestQueries>();
        var contexts = provider.GetRequiredService<OrderDecisionContextQueries>();
        foreach (var orderId in Orders)
        {
            var detail = await details.GetAsync(orderId, new OrderItemQuery(PageSize: 100), cancellationToken);
            Put($"order.{orderId}.location", detail is null ? "none" : codes.GetValueOrDefault(detail.LocationId));
            Flatten($"order.{orderId}.detail", detail, Put);

            foreach (var basis in Bases)
            {
                var context = await contexts.GetAsync(orderId, new DecisionContextQuery(basis), cancellationToken);
                Flatten($"order.{orderId}.{basis}", context, Put);
            }
        }

        return figures;
    }

    private static void PutAmount(Action<string, object?> put, string prefix, DashboardAmountDto amount)
    {
        put($"{prefix}.amount", amount.KnownAmount);
        put($"{prefix}.lines", amount.ItemCount);
        put($"{prefix}.pricedLines", amount.KnownPriceItemCount);
        put($"{prefix}.missingPrices", amount.MissingPriceItemCount);
        put($"{prefix}.priceNotRequired", amount.PriceNotRequiredItemCount);
    }

    /// <summary>Every number in a response, by its path. Names and dates are left out: a rename is allowed to change a name.</summary>
    private static void Flatten(string prefix, object? value, Action<string, object?> put)
    {
        if (value is null)
        {
            put(prefix, "none");
            return;
        }

        using var document = JsonDocument.Parse(JsonSerializer.Serialize(value));
        Walk(prefix, document.RootElement, put);
    }

    private static void Walk(string path, JsonElement element, Action<string, object?> put)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                {
                    Walk($"{path}.{property.Name}", property.Value, put);
                }

                break;
            case JsonValueKind.Array:
                var index = 0;
                foreach (var item in element.EnumerateArray())
                {
                    Walk($"{path}[{index++}]", item, put);
                }

                break;
            case JsonValueKind.Number:
                put(path, element.GetRawText());
                break;
        }
    }

    private static string Format(object? value) => value switch
    {
        null => "—",
        decimal amount => amount.ToString("0.00####", CultureInfo.InvariantCulture),
        IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
        _ => value.ToString() ?? "—",
    };

    private static string Hash(IEnumerable<string> lines) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(string.Join('\n', lines))));

    // ---- the baseline file ------------------------------------------------------------------------------

    public static string BaselinePath(ToolSettings settings) =>
        Path.Combine(settings.BackupDirectory, $"{settings.DatabaseName}-{CatalogueDecisions.Version}-baseline.tsv");

    public static async Task WriteAsync(string path, IReadOnlyDictionary<string, string> figures, IEnumerable<string> header)
    {
        var lines = header.Select(line => "# " + line)
            .Concat(figures.Select(figure => $"{figure.Key}\t{figure.Value}"));
        await File.WriteAllLinesAsync(path, lines, new UTF8Encoding(false));
    }

    public static async Task<SortedDictionary<string, string>> ReadAsync(string path)
    {
        var figures = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var line in await File.ReadAllLinesAsync(path))
        {
            if (line.StartsWith('#') || line.Length == 0)
            {
                continue;
            }

            var tab = line.IndexOf('\t', StringComparison.Ordinal);
            figures[line[..tab]] = line[(tab + 1)..];
        }

        return figures;
    }
}
