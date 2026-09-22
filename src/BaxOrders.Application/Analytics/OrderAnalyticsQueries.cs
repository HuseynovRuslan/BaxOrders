using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports;
using BaxOrders.Application.Orders;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Analytics;

/// <summary>
/// Reads the permanent orders and hands the arithmetic to <see cref="OrderAnalyticsCalculator"/>.
/// </summary>
/// <remarks>
/// The pipeline is deliberately short: SQL aggregates the permanent items into one row per request and
/// variant, the calculator compares those aggregates in memory, and only then are the rows filtered and paged.
/// Nothing here writes, and the number of queries does not grow with the number of products.
/// <para>
/// Every period contributes exactly one request: the highest version of that location and month. Earlier
/// versions stay in the database and stay visible in the order browser; analytics simply never adds two
/// versions of the same month together. Requests are included whatever their status, because no approval
/// workflow exists yet and every current request is a draft — when approval arrives this policy is the thing
/// to revisit.
/// </para>
/// </remarks>
public sealed class OrderAnalyticsQueries(IBaxOrdersDbContext db)
{
    public const int DefaultPageSize = 50;
    public const int MaxPageSize = 200;

    /// <returns>Null when the location does not exist or has no request for the selected month.</returns>
    public async Task<LocationComparisonDto?> CompareAsync(
        int locationId, DateOnly currentPeriod, ComparisonQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        var location = await LocationAsync(locationId, cancellationToken);
        if (location is null)
        {
            return null;
        }

        var baselinePeriods = BaselineWindow.PeriodsFor(currentPeriod, query.Basis);
        var wanted = baselinePeriods.Append(currentPeriod).ToArray();
        var requests = await LatestRequestsAsync(locationId, wanted, cancellationToken);

        var current = requests.FirstOrDefault(request => request.Period == currentPeriod);
        if (current is null)
        {
            // A comparison needs something to compare; an empty current month is never invented.
            return null;
        }

        var baseline = requests
            .Where(request => request.Period != currentPeriod)
            .OrderBy(request => request.Period)
            .ToList();

        var available = baseline.Count;
        var missing = baselinePeriods
            .Where(period => !baseline.Any(request => request.Period == period))
            .ToList();

        var snapshots = await SnapshotsAsync([current, .. baseline], cancellationToken);
        var currentSnapshots = snapshots.TryGetValue(current.OrderRequestId, out var currentByVariant)
            ? currentByVariant
            : [];

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

        // The union of both sides, so a variant that stopped being ordered is as visible as a new one.
        var variantIds = currentSnapshots.Keys.Union(baselineByVariant.Keys).ToArray();
        var variants = await VariantsAsync(variantIds, cancellationToken);

        var rows = new List<VariantComparisonDto>(variantIds.Length);
        foreach (var variantId in variantIds)
        {
            if (!variants.TryGetValue(variantId, out var variant))
            {
                continue;
            }

            var result = OrderAnalyticsCalculator.Compare(new VariantComparisonInput(
                variantId,
                variant.Kind,
                currentSnapshots.GetValueOrDefault(variantId),
                baselineByVariant.GetValueOrDefault(variantId) ?? [],
                available,
                baselinePeriods.Count));

            rows.Add(new VariantComparisonDto(
                variant.Identity,
                result.Kind,
                result.State,
                Side(result.Current),
                new BaselineSideDto(
                    result.Baseline.Quantity,
                    result.Baseline.ItemCount,
                    result.Baseline.KnownAmount,
                    result.Baseline.WeightedUnitPrice,
                    Coverage(result.Baseline.PriceCoverage),
                    result.AvailableBaselinePeriodCount,
                    result.ExpectedBaselinePeriodCount),
                new ComparisonDeltaDto(
                    result.Delta.QuantityDelta,
                    result.Delta.QuantityPercentChange,
                    result.Delta.PriceDelta,
                    result.Delta.PricePercentChange,
                    result.Delta.AmountDelta,
                    result.Delta.AmountPercentChange)));
        }

        rows = [.. rows
            .OrderBy(row => row.Variant.ProductName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(row => row.Variant.ProductVariantId)];

        var summary = Summarize(
            location, currentPeriod, query.Basis, current, baseline, missing,
            currentSnapshots.Values, baselineByVariant.Values.SelectMany(list => list), rows);

        var filtered = Filter(rows, variants, query);
        var (page, pageSize) = PageOf(query.Page, query.PageSize);
        var pageRows = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return new LocationComparisonDto(
            summary,
            new PagedResult<VariantComparisonDto>(pageRows, page, pageSize, filtered.Count));
    }

    /// <summary>The months this location can be asked about, newest first.</summary>
    /// <returns>Null when the location does not exist.</returns>
    public async Task<AnalyticsPeriodsDto?> GetPeriodsAsync(int locationId, CancellationToken cancellationToken)
    {
        var location = await LocationAsync(locationId, cancellationToken);
        if (location is null)
        {
            return null;
        }

        var periods = await db.OrderRequests.AsNoTracking()
            .Where(request => request.LocationId == locationId
                && !db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version))
            .OrderByDescending(request => request.RequestPeriod)
            .Select(request => new AnalyticsPeriodDto(
                request.RequestPeriod,
                request.Id,
                request.Version,
                request.Status,
                request.Items.Count))
            .ToListAsync(cancellationToken);

        return new AnalyticsPeriodsDto(location.Id, location.Code, location.Name, periods);
    }

    /// <summary>One variant's history at one location, one point per month the location actually ordered in.</summary>
    /// <returns>Null when the location or the variant does not exist.</returns>
    public async Task<VariantTrendDto?> GetTrendAsync(
        int locationId, long productVariantId, TrendQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        var location = await LocationAsync(locationId, cancellationToken);
        if (location is null)
        {
            return null;
        }

        var variants = await VariantsAsync([productVariantId], cancellationToken);
        if (!variants.TryGetValue(productVariantId, out var variant))
        {
            return null;
        }

        var requests = db.OrderRequests.AsNoTracking()
            .Where(request => request.LocationId == locationId
                && !db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version));

        if (query.From is { } from)
        {
            requests = requests.Where(request => request.RequestPeriod >= from);
        }

        if (query.To is { } to)
        {
            requests = requests.Where(request => request.RequestPeriod <= to);
        }

        var periods = await requests
            .OrderBy(request => request.RequestPeriod)
            .Select(request => new PeriodRequestDto(request.RequestPeriod, request.Id, request.Version, request.Status))
            .ToListAsync(cancellationToken);

        if (periods.Count == 0)
        {
            return new VariantTrendDto(
                location.Id, location.Code, location.Name, variant.Identity, variant.Kind,
                query.From ?? default, query.To ?? default, []);
        }

        var requestIds = periods.Select(period => period.OrderRequestId).ToArray();
        var byRequest = await db.OrderRequestItems.AsNoTracking()
            .Where(item => requestIds.Contains(item.OrderRequestId) && item.ProductVariantId == productVariantId)
            .GroupBy(item => item.OrderRequestId)
            .Select(group => new
            {
                OrderRequestId = group.Key,
                Quantity = group.Sum(item => item.Quantity),
                ItemCount = group.Count(),
                KnownPriceItemCount = group.Count(item => item.UnitPrice != null),
                MissingPriceItemCount = group.Count(item => item.UnitPrice == null),
                PricedQuantity = group.Sum(item => item.UnitPrice == null ? 0m : item.Quantity),
                PricedAmount = group.Sum(item => item.Quantity * (item.UnitPrice ?? 0m)),
            })
            .ToDictionaryAsync(row => row.OrderRequestId, cancellationToken);

        var points = new List<VariantTrendPointDto>(periods.Count);
        foreach (var period in periods)
        {
            var found = byRequest.GetValueOrDefault(period.OrderRequestId);
            var quantity = found?.Quantity ?? 0m;
            var pricedQuantity = found?.PricedQuantity ?? 0m;
            var knownPriceItems = found?.KnownPriceItemCount ?? 0;

            points.Add(new VariantTrendPointDto(
                period.Period,
                period.OrderRequestId,
                period.Version,
                // The location ordered this month; that this variant is absent from it means zero, not unknown.
                variant.Kind == AnalyticsKind.QuantityComparable ? quantity : null,
                knownPriceItems == 0 ? null : found!.PricedAmount,
                pricedQuantity > 0
                    ? Math.Round(found!.PricedAmount / pricedQuantity, OrderAnalyticsCalculator.MoneyScale, MidpointRounding.AwayFromZero)
                    : null,
                found?.ItemCount ?? 0,
                knownPriceItems,
                found?.MissingPriceItemCount ?? 0));
        }

        return new VariantTrendDto(
            location.Id, location.Code, location.Name, variant.Identity, variant.Kind,
            query.From ?? points[0].Period, query.To ?? points[^1].Period, points);
    }

    // ---- reading ------------------------------------------------------------------------------------

    private Task<LocationRef?> LocationAsync(int locationId, CancellationToken cancellationToken) =>
        db.Locations.AsNoTracking()
            .Where(location => location.Id == locationId)
            .Select(location => new LocationRef(location.Id, location.Code, location.Name))
            .FirstOrDefaultAsync(cancellationToken);

    private async Task<List<PeriodRequestDto>> LatestRequestsAsync(
        int locationId, DateOnly[] periods, CancellationToken cancellationToken) =>
        await db.OrderRequests.AsNoTracking()
            .Where(request => request.LocationId == locationId
                && periods.Contains(request.RequestPeriod)
                && !db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version))
            .Select(request => new PeriodRequestDto(request.RequestPeriod, request.Id, request.Version, request.Status))
            .ToListAsync(cancellationToken);

    /// <summary>One row per request and variant: the permanent items added up, never changed.</summary>
    private async Task<Dictionary<long, Dictionary<long, VariantPeriodSnapshot>>> SnapshotsAsync(
        IReadOnlyCollection<PeriodRequestDto> requests, CancellationToken cancellationToken)
    {
        var requestIds = requests.Select(request => request.OrderRequestId).ToArray();
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
                row.ProductVariantId,
                row.Quantity,
                row.ItemCount,
                row.KnownPriceItemCount,
                row.MissingPriceItemCount,
                row.PricedQuantity,
                row.PricedAmount);
        }

        return byRequest;
    }

    private async Task<Dictionary<long, VariantRef>> VariantsAsync(
        long[] variantIds, CancellationToken cancellationToken)
    {
        if (variantIds.Length == 0)
        {
            return [];
        }

        var rows = await db.ProductVariants.AsNoTracking()
            .Where(variant => variantIds.Contains(variant.Id))
            .Select(variant => new
            {
                variant.Id,
                variant.ProductId,
                ProductCode = variant.Product.Code,
                ProductName = variant.Product.Name,
                variant.Product.NormalizedName,
                variant.SpecificationValue,
                SpecificationUnitCode = variant.SpecificationUnit != null ? variant.SpecificationUnit.Code : null,
                SpecificationUnitName = variant.SpecificationUnit != null ? variant.SpecificationUnit.Name : null,
                variant.SpecificationDescriptor,
                variant.ModelCode,
                OrderUnitCode = variant.OrderUnit != null ? variant.OrderUnit.Code : null,
                OrderUnitName = variant.OrderUnit != null ? variant.OrderUnit.Name : null,
            })
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(
            row => row.Id,
            row => new VariantRef(
                new VariantIdentityDto(
                    row.Id, row.ProductId, row.ProductCode, row.ProductName,
                    row.SpecificationValue, row.SpecificationUnitCode, row.SpecificationUnitName,
                    row.SpecificationDescriptor, row.ModelCode, row.OrderUnitCode, row.OrderUnitName),
                AnalyticsUnits.KindOf(row.OrderUnitCode),
                // The same normalizer the rest of the system matches names with, so search here means what it
                // means everywhere else: case- and spacing-insensitive, never fuzzy.
                row.NormalizedName,
                TextNormalizer.Normalize(row.ProductCode),
                TextNormalizer.Normalize(row.ModelCode)));
    }

    // ---- shaping ------------------------------------------------------------------------------------

    private static List<VariantComparisonDto> Filter(
        List<VariantComparisonDto> rows, Dictionary<long, VariantRef> variants, ComparisonQuery query)
    {
        IEnumerable<VariantComparisonDto> filtered = rows;

        if (Search.Of(query.Search) is { } needle)
        {
            filtered = filtered.Where(row =>
                variants.TryGetValue(row.Variant.ProductVariantId, out var variant) && variant.Matches(needle));
        }

        if (query.State is { } state)
        {
            filtered = filtered.Where(row => row.State == state);
        }

        if (query.Kind is { } kind)
        {
            filtered = filtered.Where(row => row.AnalyticsKind == kind);
        }

        return [.. filtered];
    }

    private static (int Page, int PageSize) PageOf(int page, int pageSize) =>
        (Math.Max(1, page), pageSize <= 0 ? DefaultPageSize : Math.Min(pageSize, MaxPageSize));

    private static ComparisonSideDto Side(ComparisonSide side) =>
        new(side.Quantity, side.ItemCount, side.KnownAmount, side.WeightedUnitPrice, Coverage(side.PriceCoverage));

    private static PriceCoverageDto Coverage(PriceCoverage coverage) =>
        new(coverage.State, coverage.TotalQuantity, coverage.KnownPriceQuantity, coverage.MissingPriceQuantity,
            coverage.KnownPriceItemCount, coverage.MissingPriceItemCount);

    private static ComparisonSummaryDto Summarize(
        LocationRef location,
        DateOnly currentPeriod,
        AnalyticsComparisonBasis basis,
        PeriodRequestDto current,
        IReadOnlyList<PeriodRequestDto> baseline,
        IReadOnlyList<DateOnly> missing,
        IEnumerable<VariantPeriodSnapshot> currentSnapshots,
        IEnumerable<VariantPeriodSnapshot> baselineSnapshots,
        IReadOnlyList<VariantComparisonDto> rows)
    {
        var currentTotals = Totals(currentSnapshots);
        var baselineTotals = Totals(baselineSnapshots);
        var available = baseline.Count;

        decimal? currentAmount = currentTotals.KnownPriceItemCount == 0 ? null : currentTotals.PricedAmount;
        decimal? baselineAmount = available == 0 || baselineTotals.KnownPriceItemCount == 0
            ? null
            : Math.Round(baselineTotals.PricedAmount / available, OrderAnalyticsCalculator.MoneyScale, MidpointRounding.AwayFromZero);

        decimal? amountDelta = null;
        decimal? amountPercent = null;
        if (currentAmount is { } currentValue && baselineAmount is { } baselineValue)
        {
            amountDelta = currentValue - baselineValue;
            amountPercent = baselineValue == 0
                ? null
                : Math.Round((currentValue - baselineValue) / baselineValue * 100m,
                    OrderAnalyticsCalculator.PercentScale, MidpointRounding.AwayFromZero);
        }

        return new ComparisonSummaryDto(
            location.Id,
            location.Code,
            location.Name,
            currentPeriod,
            basis,
            current.OrderRequestId,
            current.Version,
            current.Status,
            BaselineWindow.ExpectedPeriodCount(basis),
            available,
            missing,
            baseline,
            available > 0,
            currentTotals.ItemCount,
            // Items per available baseline month, to two decimals: a fractional count only describes an average.
            available == 0 ? null : Math.Round((decimal)baselineTotals.ItemCount / available, 2, MidpointRounding.AwayFromZero),
            currentAmount,
            baselineAmount,
            amountDelta,
            amountPercent,
            currentTotals.MissingPriceItemCount,
            baselineTotals.MissingPriceItemCount,
            currentTotals.MissingPriceItemCount == 0 && baselineTotals.MissingPriceItemCount == 0,
            rows.Count(row => row.State == ComparisonState.New),
            rows.Count(row => row.State == ComparisonState.NoLongerOrdered),
            rows.Count(row => row.State == ComparisonState.Increased),
            rows.Count(row => row.State == ComparisonState.Decreased),
            rows.Count(row => row.State == ComparisonState.Unchanged),
            rows.Count(row => row.State == ComparisonState.NotComparable),
            rows.Count(row => row.State == ComparisonState.InsufficientHistory),
            rows.Count(row => row.AnalyticsKind == AnalyticsKind.QuantityComparable),
            rows.Count(row => row.AnalyticsKind == AnalyticsKind.AmountOrientedService),
            rows.Count);
    }

    private static (int ItemCount, int KnownPriceItemCount, int MissingPriceItemCount, decimal PricedAmount) Totals(
        IEnumerable<VariantPeriodSnapshot> snapshots)
    {
        int items = 0, known = 0, missing = 0;
        decimal amount = 0m;
        foreach (var snapshot in snapshots)
        {
            items += snapshot.ItemCount;
            known += snapshot.KnownPriceItemCount;
            missing += snapshot.MissingPriceItemCount;
            amount += snapshot.PricedAmount;
        }

        return (items, known, missing, amount);
    }

    private sealed record LocationRef(int Id, string Code, string Name);

    private sealed record VariantRef(
        VariantIdentityDto Identity,
        AnalyticsKind Kind,
        string NormalizedName,
        string NormalizedCode,
        string NormalizedModelCode)
    {
        public bool Matches(string needle) =>
            NormalizedName.Contains(needle, StringComparison.Ordinal)
            || NormalizedCode.Contains(needle, StringComparison.Ordinal)
            || NormalizedModelCode.Contains(needle, StringComparison.Ordinal);
    }
}
