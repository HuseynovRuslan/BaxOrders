using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Decisions;
using BaxOrders.Application.Orders.Pricing;
using BaxOrders.Application.Reports;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.ImportPricingMigration;

/// <summary>
/// The figures Task 16a must not move (its specification's §4.9), read through the application's own queries — the
/// numbers the screens show.
/// </summary>
/// <remarks>
/// <para>
/// Each figure is a key and a value. Location-level figures are keyed by the object's <b>code</b>. Lists are hashed
/// with SHA-256, so a single changed field in a single row shows.
/// </para>
/// <para>
/// Every figure Task 13a's tool recorded is here, copied rather than referenced: every order and line, hashed; the
/// catalogue — products, variants and aliases — hashed; the Qiymət təsnifatı counters and HD-002's decisions, hashed
/// as Task 3 hashed them; every dashboard month on every standard basis; every year of the monthly report; and every
/// number of Heydər Əliyev Mərkəzi's September 2026 order on every basis. Added for this task: the location aliases
/// (Task 3's alternative names, "H.Ə.M Təmizlik" among them), the suppliers with their price requirement, the
/// product-match decisions, and the import staging — batches, rows, their materialization, corrections and
/// resolutions.
/// </para>
/// <para>
/// Nothing here reads the four new columns, so the same capture runs before the migration and after it.
/// </para>
/// </remarks>
internal static class Invariants
{
    /// <summary>Heydər Əliyev Mərkəzi, by the code the migrations seeded it with.</summary>
    public const string HeydarAliyevCentre = "HEM";

    public static readonly DateOnly September2026 = new(2026, 9, 1);

    /// <summary>The key of the Task 13 brief's figure: Heydər Əliyev, Sentyabr 2026, "Keçən ay".</summary>
    public const string HeydarAliyevSeptemberDelta = "hem.2026-09.PreviousMonth.Primary.DeltaAmount";

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

        // ---- 1. orders and lines ---------------------------------------------------------------------------
        Put("orders.requests", await db.OrderRequests.CountAsync(cancellationToken));
        var lines = await db.OrderRequestItems.AsNoTracking()
            .OrderBy(item => item.Id)
            .Select(item => new
            {
                item.Id,
                item.OrderRequestId,
                item.ProductVariantId,
                item.Quantity,
                item.UnitPrice,
                item.PricingMode,
                item.SupplierId,
                item.OriginalProductName,
            })
            .ToListAsync(cancellationToken);
        Put("orders.lines", lines.Count);
        Put("orders.lines.sha256", Hash(lines.Select(line => string.Join('|',
            line.Id, line.OrderRequestId, line.ProductVariantId, Format(line.Quantity), Format(line.UnitPrice),
            line.PricingMode, line.SupplierId, line.OriginalProductName))));

        // ---- 2. the catalogue ------------------------------------------------------------------------------
        var products = await db.Products.AsNoTracking()
            .OrderBy(product => product.Id)
            .Select(product => new { product.Id, product.Code, product.Name, product.NormalizedName, product.CategoryId, product.IsActive })
            .ToListAsync(cancellationToken);
        Put("catalogue.products", products.Count);
        Put("catalogue.products.sha256", Hash(products.Select(product => string.Join('|',
            product.Id, product.Code, product.Name, product.NormalizedName, product.CategoryId, product.IsActive))));

        var variants = await db.ProductVariants.AsNoTracking()
            .OrderBy(variant => variant.Id)
            .Select(variant => new { variant.Id, variant.ProductId, variant.NormalizedVariantKey, variant.OrderUnitId, variant.IsActive })
            .ToListAsync(cancellationToken);
        Put("catalogue.variants", variants.Count);
        Put("catalogue.variants.sha256", Hash(variants.Select(variant => string.Join('|',
            variant.Id, variant.ProductId, variant.NormalizedVariantKey, variant.OrderUnitId, variant.IsActive))));

        var aliases = await db.ProductAliases.AsNoTracking()
            .OrderBy(alias => alias.Id)
            .Select(alias => new { alias.Id, alias.ProductId, alias.NormalizedAlias })
            .ToListAsync(cancellationToken);
        Put("catalogue.aliases", aliases.Count);
        Put("catalogue.aliases.sha256", Hash(aliases.Select(alias => string.Join('|', alias.Id, alias.ProductId, alias.NormalizedAlias))));

        // Task 3's alternative object names: the import recognises objects by these, "H.Ə.M Təmizlik" among them.
        var locationAliases = await db.LocationAliases.AsNoTracking()
            .OrderBy(alias => alias.Id)
            .Select(alias => new { alias.Id, alias.LocationId, alias.NormalizedAlias })
            .ToListAsync(cancellationToken);
        Put("catalogue.locationAliases", locationAliases.Count);
        Put("catalogue.locationAliases.sha256", Hash(locationAliases.Select(alias => string.Join('|',
            alias.Id, alias.LocationId, alias.NormalizedAlias))));

        // A supplier's price requirement no longer decides an imported line's mode; the setting itself stays as it is.
        var suppliers = await db.Suppliers.AsNoTracking()
            .OrderBy(supplier => supplier.Id)
            .Select(supplier => new { supplier.Id, supplier.NormalizedName, supplier.PriceRequirement })
            .ToListAsync(cancellationToken);
        Put("catalogue.suppliers", suppliers.Count);
        Put("catalogue.suppliers.sha256", Hash(suppliers.Select(supplier => string.Join('|',
            supplier.Id, supplier.NormalizedName, supplier.PriceRequirement))));

        var matches = await db.ProductMatchDecisions.AsNoTracking()
            .OrderBy(decision => decision.Id)
            .Select(decision => new
            {
                decision.Id,
                decision.Kind,
                decision.Outcome,
                decision.SourceVariantId,
                decision.TargetVariantId,
                decision.SourceProductId,
                decision.TargetProductId,
                decision.VariantLabel,
                decision.Reason,
                decision.DecidedByUserId,
                decision.DecidedByDisplayName,
                decision.DecidedAtUtc,
                decision.UndoneByUserId,
                decision.UndoneByDisplayName,
                decision.UndoneAtUtc,
                decision.UndoReason,
            })
            .ToListAsync(cancellationToken);
        Put("catalogue.productMatchDecisions", matches.Count);
        Put("catalogue.productMatchDecisions.sha256", Hash(matches.Select(decision => string.Join('|',
            decision.Id, decision.Kind, decision.Outcome, decision.SourceVariantId, decision.TargetVariantId,
            decision.SourceProductId, decision.TargetProductId, decision.VariantLabel, decision.Reason,
            decision.DecidedByUserId, decision.DecidedByDisplayName, Timestamp(decision.DecidedAtUtc),
            decision.UndoneByUserId, decision.UndoneByDisplayName, Timestamp(decision.UndoneAtUtc), decision.UndoReason))));

        // ---- 3. Qiymət təsnifatı, and the 94 lines of HD-002 ---------------------------------------------------
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

        // ---- 4. the dashboard: every month, every standard basis ------------------------------------------------
        var dashboard = provider.GetRequiredService<ManagementDashboardQueries>();
        var periods = await dashboard.GetPeriodsAsync(cancellationToken);
        foreach (var period in periods.Periods)
        {
            var month = Report.Month(period.Period);
            Put($"dashboard.{month}.requests", period.RequestCount);
            Put($"dashboard.{month}.lines", period.ItemCount);

            foreach (var basis in Bases)
            {
                var result = await dashboard.GetAsync(
                    period.Period, new DashboardQuery(basis, PageSize: ManagementDashboardQueries.MaxPageSize), cancellationToken);
                var prefix = $"dashboard.{month}.{basis}";
                if (result is null)
                {
                    Put(prefix, "none");
                    continue;
                }

                var summary = result.Summary;
                PutAmount(Put, $"{prefix}.current", summary.Current);
                PutAmount(Put, $"{prefix}.comparedCurrent", summary.ComparedCurrent);
                PutAmount(Put, $"{prefix}.baseline", summary.Baseline);
                Put($"{prefix}.delta", summary.KnownAmountDelta);
                Put($"{prefix}.percent", summary.KnownAmountPercentChange);
                Put($"{prefix}.locationsWithRequest", summary.LocationsWithCurrentRequest);
                Put($"{prefix}.requests", summary.CurrentRequestCount);

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

        // ---- 5. the monthly report: every year -----------------------------------------------------------------
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
            }

            foreach (var row in report.Rows.Where(row => row.RequestCount > 0))
            {
                Put($"{prefix}.row.{row.LocationCode}.amount", row.KnownAmount);
                Put($"{prefix}.row.{row.LocationCode}.requests", row.RequestCount);
                foreach (var cell in row.Months.Where(cell => cell.OrderRequestId is not null))
                {
                    Put($"{prefix}.row.{row.LocationCode}.month.{cell.Month:D2}.amount", cell.KnownAmount);
                    Put($"{prefix}.row.{row.LocationCode}.month.{cell.Month:D2}.delta", cell.DeltaAmount);
                }
            }
        }

        // ---- 6. Heydər Əliyev Mərkəzi, September 2026: every number of its order page, on every basis ---------------
        var september = await HeydarAliyevSeptemberAsync(db, cancellationToken);
        Put("hem.2026-09.order", september);
        if (september is { } orderId)
        {
            var contexts = provider.GetRequiredService<OrderDecisionContextQueries>();
            foreach (var basis in Bases)
            {
                Flatten($"hem.2026-09.{basis}", await contexts.GetAsync(orderId, new DecisionContextQuery(basis), cancellationToken), Put);
            }
        }

        // ---- 7. import staging: every batch, row, link, correction and resolution ------------------------------
        // Projected column by column, never as whole rows: before the migration the four new columns do not exist.
        var batches = await db.ImportBatches.AsNoTracking()
            .OrderBy(batch => batch.Id)
            .Select(batch => new
            {
                batch.Id,
                batch.Status,
                batch.TotalRows,
                batch.ValidRows,
                batch.WarningRows,
                batch.InvalidRows,
                batch.ExcludedRows,
            })
            .ToListAsync(cancellationToken);
        Put("imports.batches", batches.Count);
        Put("imports.batches.sha256", Hash(batches.Select(batch => string.Join('|',
            batch.Id, batch.Status, batch.TotalRows, batch.ValidRows, batch.WarningRows, batch.InvalidRows, batch.ExcludedRows))));

        var rows = await db.ImportRows.AsNoTracking()
            .OrderBy(row => row.Id)
            .Select(row => new
            {
                row.Id,
                row.ImportBatchId,
                row.ParsedUnitPrice,
                row.ParsedQuantity,
                row.ParsedRequestPeriod,
                row.IsExcluded,
                row.MatchedLocationId,
                row.MatchedProductVariantId,
                row.MatchedSupplierId,
            })
            .ToListAsync(cancellationToken);
        Put("imports.rows", rows.Count);
        Put("imports.rows.sha256", Hash(rows.Select(row => string.Join('|',
            row.Id, row.ImportBatchId, Format(row.ParsedUnitPrice), Format(row.ParsedQuantity), Format(row.ParsedRequestPeriod),
            row.IsExcluded, row.MatchedLocationId, row.MatchedProductVariantId, row.MatchedSupplierId))));

        var materializations = await db.ImportRowMaterializations.AsNoTracking()
            .OrderBy(link => link.Id)
            .Select(link => new { link.Id, link.ImportMaterializationId, link.ImportRowId, link.OrderRequestItemId, link.CreatedAtUtc })
            .ToListAsync(cancellationToken);
        Put("imports.materializations", materializations.Count);
        Put("imports.materializations.sha256", Hash(materializations.Select(link => string.Join('|',
            link.Id, link.ImportMaterializationId, link.ImportRowId, link.OrderRequestItemId, Timestamp(link.CreatedAtUtc)))));

        var corrections = await db.ImportRowCorrections.AsNoTracking()
            .OrderBy(correction => correction.Id)
            .Select(correction => new
            {
                correction.Id,
                correction.ImportRowId,
                correction.Field,
                correction.CorrectedValue,
                correction.CreatedAtUtc,
                correction.UpdatedAtUtc,
            })
            .ToListAsync(cancellationToken);
        Put("imports.corrections", corrections.Count);
        Put("imports.corrections.sha256", Hash(corrections.Select(correction => string.Join('|',
            correction.Id, correction.ImportRowId, correction.Field, correction.CorrectedValue,
            Timestamp(correction.CreatedAtUtc), Timestamp(correction.UpdatedAtUtc)))));

        var resolutions = await db.ImportResolutions.AsNoTracking()
            .OrderBy(resolution => resolution.Id)
            .Select(resolution => new
            {
                resolution.Id,
                resolution.ImportBatchId,
                resolution.Kind,
                resolution.SourceKey,
                resolution.SourceKeyHash,
                resolution.Scope,
                resolution.Action,
                resolution.LocationId,
                resolution.SupplierId,
                resolution.ResponsiblePersonId,
                resolution.UnitOfMeasureId,
                resolution.CategoryId,
                resolution.ProductId,
                resolution.ProductVariantId,
                resolution.CreatedAtUtc,
            })
            .ToListAsync(cancellationToken);
        Put("imports.resolutions", resolutions.Count);
        Put("imports.resolutions.sha256", Hash(resolutions.Select(resolution => string.Join('|',
            resolution.Id, resolution.ImportBatchId, resolution.Kind, resolution.SourceKey, resolution.SourceKeyHash,
            resolution.Scope, resolution.Action, resolution.LocationId, resolution.SupplierId, resolution.ResponsiblePersonId,
            resolution.UnitOfMeasureId, resolution.CategoryId, resolution.ProductId, resolution.ProductVariantId,
            Timestamp(resolution.CreatedAtUtc)))));

        return figures;
    }

    /// <summary>The highest version of Heydər Əliyev Mərkəzi's September 2026 order — the one every screen reads.</summary>
    public static Task<long?> HeydarAliyevSeptemberAsync(BaxOrdersDbContext db, CancellationToken cancellationToken) =>
        db.OrderRequests.AsNoTracking()
            .Where(request => request.Location.Code == HeydarAliyevCentre && request.RequestPeriod == September2026)
            .OrderByDescending(request => request.Version)
            .Select(request => (long?)request.Id)
            .FirstOrDefaultAsync(cancellationToken);

    /// <summary>
    /// Every figure present on either side must be present on both and be equal. There are no exceptions: this task
    /// may change none of them.
    /// </summary>
    public static (int Identical, IReadOnlyList<string> Differences) Compare(
        IReadOnlyDictionary<string, string> before, IReadOnlyDictionary<string, string> after)
    {
        ArgumentNullException.ThrowIfNull(before);
        ArgumentNullException.ThrowIfNull(after);

        var identical = 0;
        var differences = new List<string>();
        foreach (var (key, value) in before)
        {
            if (!after.TryGetValue(key, out var now))
            {
                differences.Add($"{key}: {value} → (gone)");
            }
            else if (now == value)
            {
                identical++;
            }
            else
            {
                differences.Add($"{key}: {value} → {now}");
            }
        }

        differences.AddRange(after.Where(entry => !before.ContainsKey(entry.Key)).Select(entry => $"{entry.Key}: (new) → {entry.Value}"));
        return (identical, differences);
    }

    private static void PutAmount(Action<string, object?> put, string prefix, DashboardAmountDto amount)
    {
        put($"{prefix}.amount", amount.KnownAmount);
        put($"{prefix}.lines", amount.ItemCount);
        put($"{prefix}.pricedLines", amount.KnownPriceItemCount);
        put($"{prefix}.missingPrices", amount.MissingPriceItemCount);
        put($"{prefix}.priceNotRequired", amount.PriceNotRequiredItemCount);
    }

    /// <summary>Every number in a response, by its path. Names and dates are left out.</summary>
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

    private static string Timestamp(DateTime? value) =>
        value?.ToString("O", CultureInfo.InvariantCulture) ?? "—";

    private static string Hash(IEnumerable<string> lines) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(string.Join('\n', lines))));

    // ---- the baseline file ------------------------------------------------------------------------------

    public static string BaselinePath(ToolSettings settings) =>
        Path.Combine(settings.BackupDirectory, $"{settings.DatabaseName}-{ToolSettings.TaskTag}-baseline.tsv");

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
