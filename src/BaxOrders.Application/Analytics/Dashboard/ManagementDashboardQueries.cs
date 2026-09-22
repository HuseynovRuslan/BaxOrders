using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports;
using BaxOrders.Application.Orders;
using BaxOrders.Domain.Normalization;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Analytics.Dashboard;

/// <summary>
/// The company's month, one row per location.
/// </summary>
/// <remarks>
/// This is not the location comparison run once per location. Every location's months are fetched together —
/// four queries whatever the number of objects — and the comparison itself is the very same
/// <see cref="OrderAnalyticsCalculator"/> the location screen uses, so the dashboard and the screen cannot
/// drift apart. Nothing here writes.
/// <para>
/// Three facts about a location are kept apart, because they are three different situations and collapsing
/// any two of them would misreport the object: it has no request this month; it has one but no history to
/// compare it with; it has both.
/// </para>
/// </remarks>
public sealed class ManagementDashboardQueries(IBaxOrdersDbContext db)
{
    public const int DefaultPageSize = 25;
    public const int MaxPageSize = 100;

    /// <summary>The months the company has permanent orders for, newest first.</summary>
    public async Task<DashboardPeriodsDto> GetPeriodsAsync(CancellationToken cancellationToken)
    {
        // Permanent requests only: what was staged for import is not what the company ordered.
        var periods = await db.OrderRequests.AsNoTracking()
            .GroupBy(request => request.RequestPeriod)
            .Select(group => new
            {
                Period = group.Key,
                LocationCount = group.Select(request => request.LocationId).Distinct().Count(),
                RequestCount = group.Count(),
            })
            .OrderByDescending(row => row.Period)
            .ToListAsync(cancellationToken);

        // Lines are counted in their own query: counting a navigation inside a grouping is not translatable.
        var itemCounts = await db.OrderRequestItems.AsNoTracking()
            .GroupBy(item => item.OrderRequest.RequestPeriod)
            .Select(group => new { Period = group.Key, ItemCount = group.Count() })
            .ToDictionaryAsync(row => row.Period, row => row.ItemCount, cancellationToken);

        return new DashboardPeriodsDto(
            [.. periods.Select(row => new DashboardPeriodDto(
                row.Period, row.LocationCount, row.RequestCount, itemCounts.GetValueOrDefault(row.Period)))]);
    }

    /// <returns>Null when no location has a permanent request for the selected month.</returns>
    public async Task<ManagementDashboardDto?> GetAsync(
        DateOnly currentPeriod, DashboardQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        var baselinePeriods = BaselineWindow.PeriodsFor(currentPeriod, query.Basis);
        var wanted = baselinePeriods.Append(currentPeriod).ToArray();

        // Every location that has ever ordered is in the dashboard, so an object that ordered nothing this
        // month is visible as exactly that. A location that has never ordered is not part of the company's
        // order history and would only be noise.
        var locations = await db.Locations.AsNoTracking()
            .Where(location => db.OrderRequests.Any(request => request.LocationId == location.Id))
            .Select(location => new LocationRef(location.Id, location.Code, location.Name))
            .ToListAsync(cancellationToken);

        // The highest version of each location and month, in one query for the whole company.
        var requests = await db.OrderRequests.AsNoTracking()
            .Where(request => wanted.Contains(request.RequestPeriod)
                && !db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version))
            .Select(request => new RequestRef(
                request.LocationId, request.RequestPeriod, request.Id, request.Version, request.Status))
            .ToListAsync(cancellationToken);

        if (!requests.Any(request => request.Period == currentPeriod))
        {
            return null;
        }

        var requestIds = requests.Select(request => request.OrderRequestId).ToArray();
        var snapshots = await SnapshotsAsync(requestIds, cancellationToken);
        var kinds = await KindsAsync(snapshots.Values.SelectMany(byVariant => byVariant.Keys).Distinct().ToArray(), cancellationToken);

        var byLocation = requests.ToLookup(request => request.LocationId);
        var rows = new List<LocationDashboardRowDto>(locations.Count);
        foreach (var location in locations)
        {
            rows.Add(Build(location, byLocation[location.Id], currentPeriod, baselinePeriods, query.Basis, snapshots, kinds));
        }

        rows = [.. rows.OrderBy(row => row.LocationName, StringComparer.OrdinalIgnoreCase)];
        var summary = Summarize(currentPeriod, query.Basis, rows);

        var filtered = Sort(Filter(rows, query), query);
        var (page, pageSize) = PageOf(query.Page, query.PageSize);
        var pageRows = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return new ManagementDashboardDto(
            summary,
            filtered.Count,
            new PagedResult<LocationDashboardRowDto>(pageRows, page, pageSize, filtered.Count));
    }

    // ---- building one row ---------------------------------------------------------------------------

    private static LocationDashboardRowDto Build(
        LocationRef location,
        IEnumerable<RequestRef> requests,
        DateOnly currentPeriod,
        IReadOnlyList<DateOnly> baselinePeriods,
        AnalyticsComparisonBasis basis,
        IReadOnlyDictionary<long, Dictionary<long, VariantPeriodSnapshot>> snapshots,
        IReadOnlyDictionary<long, AnalyticsKind> kinds)
    {
        var all = requests.ToList();
        var current = all.FirstOrDefault(request => request.Period == currentPeriod);
        var baseline = all.Where(request => request.Period != currentPeriod).OrderBy(request => request.Period).ToList();
        var available = baseline.Count;
        var expected = baselinePeriods.Count;

        var currentSnapshots = current is null
            ? []
            : snapshots.GetValueOrDefault(current.OrderRequestId) ?? [];

        var baselineByVariant = new Dictionary<long, List<VariantPeriodSnapshot>>();
        foreach (var request in baseline)
        {
            if (!snapshots.TryGetValue(request.OrderRequestId, out var byVariant))
            {
                continue;
            }

            foreach (var (variantId, snapshot) in byVariant)
            {
                if (!baselineByVariant.TryGetValue(variantId, out var list))
                {
                    baselineByVariant[variantId] = list = [];
                }

                list.Add(snapshot);
            }
        }

        var currentTotals = OrderAnalyticsCalculator.Totals(currentSnapshots.Values);
        var baselineTotals = OrderAnalyticsCalculator.Totals(baselineByVariant.Values.SelectMany(list => list));

        // An object that did not order is not an object that ordered nothing, so its money stays unknown.
        var currentAmount = current is null ? null : OrderAnalyticsCalculator.KnownAmount(currentTotals);
        var baselineAmount = OrderAnalyticsCalculator.AverageKnownAmount(baselineTotals, available);
        var (amountDelta, amountPercent) = OrderAnalyticsCalculator.AmountDifference(currentAmount, baselineAmount);

        var coverage = available == 0
            ? HistoryCoverageState.Unavailable
            : available >= expected
                ? HistoryCoverageState.Complete
                : HistoryCoverageState.Partial;

        var availability = current is null
            ? ComparisonAvailability.NoCurrentRequest
            : available == 0
                ? ComparisonAvailability.NoBaselineHistory
                : ComparisonAvailability.Available;

        var counts = new StateCounts();
        if (current is not null)
        {
            // The same calculator the location screen runs, variant by variant, over the union of both sides.
            // It runs even with no baseline month, because that is what the screen does too: the variants come
            // back as history-not-sufficient, which is a fact about them, not an invented comparison. What is
            // never done is running it for a location that has no request at all — there is nothing to run on.
            foreach (var variantId in currentSnapshots.Keys.Union(baselineByVariant.Keys))
            {
                var kind = kinds.GetValueOrDefault(variantId, AnalyticsKind.QuantityComparable);
                var result = OrderAnalyticsCalculator.Compare(new VariantComparisonInput(
                    variantId,
                    kind,
                    currentSnapshots.GetValueOrDefault(variantId),
                    baselineByVariant.GetValueOrDefault(variantId) ?? [],
                    available,
                    expected));

                counts.Add(result.State, kind);
            }
        }

        return new LocationDashboardRowDto(
            location.Id,
            location.Code,
            location.Name,
            current is not null,
            current?.OrderRequestId,
            current?.Version,
            current?.Status,
            new DashboardAmountDto(
                currentAmount,
                currentTotals.ItemCount,
                currentTotals.KnownPriceItemCount,
                currentTotals.MissingPriceItemCount,
                currentTotals.MissingPriceItemCount == 0),
            current is null ? null : CoverageOf(currentTotals),
            expected,
            available,
            [.. baselinePeriods.Where(period => !baseline.Any(request => request.Period == period))],
            [.. baseline.Select(request => new PeriodRequestDto(request.Period, request.OrderRequestId, request.Version, request.Status))],
            new DashboardAmountDto(
                baselineAmount,
                baselineTotals.ItemCount,
                baselineTotals.KnownPriceItemCount,
                baselineTotals.MissingPriceItemCount,
                baselineTotals.MissingPriceItemCount == 0),
            amountDelta,
            amountPercent,
            coverage,
            availability,
            availability == ComparisonAvailability.Available,
            counts.New,
            counts.Increased,
            counts.Decreased,
            counts.Unchanged,
            counts.NoLongerOrdered,
            counts.InsufficientHistory,
            counts.NotComparable,
            counts.QuantityComparable,
            counts.Services,
            counts.Total,
            currentPeriod,
            basis);
    }

    /// <summary>Price coverage of a period, counted in lines rather than in quantity across unlike units.</summary>
    private static PriceCoverageState CoverageOf(AmountTotals totals) => totals switch
    {
        { ItemCount: 0 } => PriceCoverageState.Unavailable,
        { KnownPriceItemCount: 0 } => PriceCoverageState.Unavailable,
        { MissingPriceItemCount: 0 } => PriceCoverageState.Complete,
        _ => PriceCoverageState.Partial,
    };

    // ---- reading ------------------------------------------------------------------------------------

    private async Task<Dictionary<long, Dictionary<long, VariantPeriodSnapshot>>> SnapshotsAsync(
        long[] requestIds, CancellationToken cancellationToken)
    {
        var rows = await db.OrderRequestItems.AsNoTracking()
            .Where(item => requestIds.Contains(item.OrderRequestId))
            .GroupBy(item => new { item.OrderRequestId, item.ProductVariantId })
            .Select(group => new
            {
                group.Key.OrderRequestId,
                group.Key.ProductVariantId,
                Quantity = group.Sum(item => item.Quantity),
                ItemCount = group.Count(),
                KnownPriceItemCount = group.Count(item => item.UnitPrice != null),
                MissingPriceItemCount = group.Count(item => item.UnitPrice == null),
                PricedQuantity = group.Sum(item => item.UnitPrice == null ? 0m : item.Quantity),
                PricedAmount = group.Sum(item => item.Quantity * (item.UnitPrice ?? 0m)),
            })
            .ToListAsync(cancellationToken);

        var byRequest = new Dictionary<long, Dictionary<long, VariantPeriodSnapshot>>();
        foreach (var row in rows)
        {
            if (!byRequest.TryGetValue(row.OrderRequestId, out var byVariant))
            {
                byRequest[row.OrderRequestId] = byVariant = [];
            }

            byVariant[row.ProductVariantId] = new VariantPeriodSnapshot(
                row.ProductVariantId, row.Quantity, row.ItemCount, row.KnownPriceItemCount,
                row.MissingPriceItemCount, row.PricedQuantity, row.PricedAmount);
        }

        return byRequest;
    }

    /// <summary>Only what decides whether a variant is material or service; the dashboard lists no products.</summary>
    private async Task<Dictionary<long, AnalyticsKind>> KindsAsync(long[] variantIds, CancellationToken cancellationToken)
    {
        if (variantIds.Length == 0)
        {
            return [];
        }

        var rows = await db.ProductVariants.AsNoTracking()
            .Where(variant => variantIds.Contains(variant.Id))
            .Select(variant => new { variant.Id, OrderUnitCode = variant.OrderUnit != null ? variant.OrderUnit.Code : null })
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(row => row.Id, row => AnalyticsUnits.KindOf(row.OrderUnitCode));
    }

    // ---- shaping ------------------------------------------------------------------------------------

    private static List<LocationDashboardRowDto> Filter(List<LocationDashboardRowDto> rows, DashboardQuery query)
    {
        IEnumerable<LocationDashboardRowDto> filtered = rows;

        if (Search.Of(query.Search) is { } needle)
        {
            filtered = filtered.Where(row =>
                TextNormalizer.Normalize(row.LocationName).Contains(needle, StringComparison.Ordinal)
                || TextNormalizer.Normalize(row.LocationCode).Contains(needle, StringComparison.Ordinal));
        }

        if (query.HistoryCoverage is { } coverage)
        {
            filtered = filtered.Where(row => row.HistoryCoverage == coverage);
        }

        if (query.PriceCoverage is { } priceCoverage)
        {
            filtered = filtered.Where(row => row.CurrentPriceCoverage == priceCoverage);
        }

        if (query.HasCurrentRequest is { } hasRequest)
        {
            filtered = filtered.Where(row => row.HasCurrentRequest == hasRequest);
        }

        return [.. filtered];
    }

    /// <summary>
    /// Rows are ordered by a plain fact, and a row with no figure to sort by goes last whichever direction is
    /// asked for — a missing number is not a small one.
    /// </summary>
    private static List<LocationDashboardRowDto> Sort(List<LocationDashboardRowDto> rows, DashboardQuery query)
    {
        if (query.Sort == DashboardSort.LocationName)
        {
            return [.. query.Descending
                ? rows.OrderByDescending(row => row.LocationName, StringComparer.OrdinalIgnoreCase)
                : rows.OrderBy(row => row.LocationName, StringComparer.OrdinalIgnoreCase)];
        }

        decimal? Key(LocationDashboardRowDto row) => query.Sort switch
        {
            DashboardSort.CurrentKnownAmount => row.Current.KnownAmount,
            DashboardSort.KnownAmountDelta => row.KnownAmountDelta,
            DashboardSort.KnownAmountPercentChange => row.KnownAmountPercentChange,
            DashboardSort.MissingPriceItemCount => row.Current.MissingPriceItemCount,
            DashboardSort.HistoryCoverage => (int)row.HistoryCoverage,
            DashboardSort.NewVariantCount => row.NewVariantCount,
            DashboardSort.IncreasedVariantCount => row.IncreasedVariantCount,
            DashboardSort.DecreasedVariantCount => row.DecreasedVariantCount,
            DashboardSort.CurrentItemCount => row.Current.ItemCount,
            _ => null,
        };

        var withValue = rows.Where(row => Key(row) is not null);
        var withoutValue = rows.Where(row => Key(row) is null)
            .OrderBy(row => row.LocationName, StringComparer.OrdinalIgnoreCase);

        var ordered = query.Descending
            ? withValue.OrderByDescending(Key).ThenBy(row => row.LocationName, StringComparer.OrdinalIgnoreCase)
            : withValue.OrderBy(Key).ThenBy(row => row.LocationName, StringComparer.OrdinalIgnoreCase);

        return [.. ordered, .. withoutValue];
    }

    private static (int Page, int PageSize) PageOf(int page, int pageSize) =>
        (Math.Max(1, page), pageSize <= 0 ? DefaultPageSize : Math.Min(pageSize, MaxPageSize));

    private static ManagementDashboardSummaryDto Summarize(
        DateOnly currentPeriod, AnalyticsComparisonBasis basis, IReadOnlyList<LocationDashboardRowDto> rows)
    {
        var withCurrent = rows.Where(row => row.HasCurrentRequest).ToList();

        var currentItems = withCurrent.Sum(row => row.Current.ItemCount);
        var currentKnownItems = withCurrent.Sum(row => row.Current.KnownPriceItemCount);
        var currentMissing = withCurrent.Sum(row => row.Current.MissingPriceItemCount);
        var currentAmount = currentKnownItems == 0 ? null : (decimal?)withCurrent.Sum(row => row.Current.KnownAmount ?? 0m);

        // Each location contributes the money of its own average baseline month, so the company figure is the
        // company's average month and is comparable with the one month beside it.
        var baselineRows = rows.Where(row => row.AvailableBaselinePeriodCount > 0).ToList();
        var baselineItems = baselineRows.Sum(row => row.Baseline.ItemCount);
        var baselineKnownItems = baselineRows.Sum(row => row.Baseline.KnownPriceItemCount);
        var baselineMissing = baselineRows.Sum(row => row.Baseline.MissingPriceItemCount);
        var baselineAmount = baselineKnownItems == 0 ? null : (decimal?)baselineRows.Sum(row => row.Baseline.KnownAmount ?? 0m);

        var (delta, percent) = OrderAnalyticsCalculator.AmountDifference(currentAmount, baselineAmount);

        return new ManagementDashboardSummaryDto(
            currentPeriod,
            basis,
            rows.Count,
            withCurrent.Count,
            rows.Count - withCurrent.Count,
            withCurrent.Count,
            new DashboardAmountDto(currentAmount, currentItems, currentKnownItems, currentMissing, currentMissing == 0),
            new DashboardAmountDto(baselineAmount, baselineItems, baselineKnownItems, baselineMissing, baselineMissing == 0),
            delta,
            percent,
            withCurrent.Count(row => row.Current.MissingPriceItemCount > 0),
            rows.Count(row => row.HistoryCoverage == HistoryCoverageState.Complete),
            rows.Count(row => row.HistoryCoverage == HistoryCoverageState.Partial),
            rows.Count(row => row.HistoryCoverage == HistoryCoverageState.Unavailable),
            rows.Count(row => row.ComparisonAvailable),
            rows.Sum(row => row.NewVariantCount),
            rows.Sum(row => row.IncreasedVariantCount),
            rows.Sum(row => row.DecreasedVariantCount),
            rows.Sum(row => row.UnchangedVariantCount),
            rows.Sum(row => row.NoLongerOrderedVariantCount),
            rows.Sum(row => row.InsufficientHistoryVariantCount),
            rows.Sum(row => row.AmountOrientedServiceCount));
    }

    private sealed record LocationRef(int Id, string Code, string Name);

    private sealed record RequestRef(
        int LocationId, DateOnly Period, long OrderRequestId, int Version, Domain.Orders.OrderRequestStatus Status);

    private sealed class StateCounts
    {
        public int New { get; private set; }
        public int Increased { get; private set; }
        public int Decreased { get; private set; }
        public int Unchanged { get; private set; }
        public int NoLongerOrdered { get; private set; }
        public int InsufficientHistory { get; private set; }
        public int NotComparable { get; private set; }
        public int QuantityComparable { get; private set; }
        public int Services { get; private set; }
        public int Total { get; private set; }

        public void Add(ComparisonState state, AnalyticsKind kind)
        {
            switch (state)
            {
                case ComparisonState.New: New++; break;
                case ComparisonState.Increased: Increased++; break;
                case ComparisonState.Decreased: Decreased++; break;
                case ComparisonState.Unchanged: Unchanged++; break;
                case ComparisonState.NoLongerOrdered: NoLongerOrdered++; break;
                case ComparisonState.InsufficientHistory: InsufficientHistory++; break;
                default: NotComparable++; break;
            }

            if (kind == AnalyticsKind.QuantityComparable)
            {
                QuantityComparable++;
            }
            else
            {
                Services++;
            }

            Total++;
        }
    }
}
