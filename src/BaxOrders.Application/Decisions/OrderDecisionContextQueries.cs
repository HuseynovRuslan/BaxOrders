using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Decisions;

/// <summary>
/// What one order costs, how it differs from the month before, and why — read only, and for the exact version
/// it was asked about.
/// </summary>
/// <remarks>
/// <para>
/// Four queries regardless of how many products an order has: the request itself, the six months behind it,
/// the lines of all seven, and the variants that appear in the two months being compared. Nothing iterates
/// over products to fetch anything, and nothing here writes — not a row, not a counter, not a log.
/// </para>
/// <para>
/// The comparison is the <b>previous calendar month</b>, because that is the question a decision answers.
/// The three- and six-month windows are context beside it, never instead of it, and each is an average of the
/// months that exist rather than of the months the window asked for.
/// </para>
/// <para>
/// The current side is the opened version's own lines. The baseline side is the previous month's <i>highest</i>
/// version, which is the policy every other analytics screen follows, so the same two months compared here and
/// on the comparison screen give the same answer.
/// </para>
/// </remarks>
public sealed class OrderDecisionContextQueries(IBaxOrdersDbContext db)
{
    /// <returns>Null when there is no such request.</returns>
    public async Task<OrderDecisionContextDto?> GetAsync(long orderRequestId, CancellationToken cancellationToken)
    {
        var order = await db.OrderRequests.AsNoTracking()
            .Where(request => request.Id == orderRequestId)
            .Select(request => new OrderRef(
                request.Id,
                request.LocationId,
                request.Location.Code,
                request.Location.Name,
                request.RequestPeriod,
                request.Version,
                request.Status,
                db.OrderRequests
                    .Where(other => other.LocationId == request.LocationId
                        && other.RequestPeriod == request.RequestPeriod)
                    .OrderByDescending(other => other.Version)
                    .Select(other => (long?)other.Id)
                    .FirstOrDefault(),
                db.OrderRequests
                    .Where(other => other.LocationId == request.LocationId
                        && other.RequestPeriod == request.RequestPeriod)
                    .Max(other => (int?)other.Version)))
            .FirstOrDefaultAsync(cancellationToken);

        if (order is null)
        {
            return null;
        }

        // Six months back covers every window; the previous month is simply the nearest of them.
        var window = BaselineWindow.PeriodsFor(order.Period, AnalyticsComparisonBasis.Previous6MonthAverage);
        var baseline = await db.OrderRequests.AsNoTracking()
            .Where(request => request.LocationId == order.LocationId
                && window.Contains(request.RequestPeriod)
                && !db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version))
            .Select(request => new DecisionPeriodDto(
                request.RequestPeriod, request.Id, request.Version, request.Status))
            .ToListAsync(cancellationToken);

        var previousPeriod = order.Period.AddMonths(-1);
        var previous = baseline.FirstOrDefault(request => request.Period == previousPeriod);

        long[] requestIds = [order.OrderRequestId, .. baseline.Select(request => request.OrderRequestId)];
        var snapshots = await SnapshotsAsync(requestIds, cancellationToken);

        var currentSnapshots = snapshots.GetValueOrDefault(order.OrderRequestId) ?? [];
        var previousSnapshots = previous is null
            ? []
            : snapshots.GetValueOrDefault(previous.OrderRequestId) ?? [];

        var current = AmountOf(currentSnapshots.Values);
        var previousAmount = previous is null ? null : AmountOf(previousSnapshots.Values);
        var (previousDelta, previousPercent) =
            OrderAnalyticsCalculator.AmountDifference(current.KnownAmount, previousAmount?.KnownAmount);

        var decomposition = previous is null
            ? null
            : await DecomposeAsync(currentSnapshots, previousSnapshots, cancellationToken);

        return new OrderDecisionContextDto(
            order.OrderRequestId,
            order.LocationId,
            order.LocationCode,
            order.LocationName,
            order.Period,
            order.Version,
            order.Status,
            order.LatestVersion == order.Version,
            order.LatestOrderRequestId,
            order.LatestVersion,
            current,
            new DecisionPreviousMonthDto(
                previous is not null,
                previousPeriod,
                previous,
                previousAmount,
                previousDelta,
                previousPercent),
            Window(AnalyticsComparisonBasis.Previous3MonthAverage, order.Period, baseline, snapshots, current),
            Window(AnalyticsComparisonBasis.Previous6MonthAverage, order.Period, baseline, snapshots, current),
            decomposition);
    }

    // ---- the explanation ----------------------------------------------------------------------------

    private async Task<DecisionDecompositionDto> DecomposeAsync(
        Dictionary<long, VariantPeriodSnapshot> current,
        Dictionary<long, VariantPeriodSnapshot> previous,
        CancellationToken cancellationToken)
    {
        // The union of both months, so a product that stopped being ordered explains as much as a new one.
        var variantIds = current.Keys.Union(previous.Keys).ToArray();
        var variants = await VariantsAsync(variantIds, cancellationToken);

        var inputs = new List<VariantCauseInput>(variantIds.Length);
        foreach (var variantId in variantIds)
        {
            if (!variants.TryGetValue(variantId, out var variant))
            {
                continue;
            }

            inputs.Add(new VariantCauseInput(
                variantId,
                variant.Kind,
                current.GetValueOrDefault(variantId),
                previous.GetValueOrDefault(variantId)));
        }

        var result = CauseDecomposition.Decompose(inputs);

        var drivers = new List<DecisionDriverDto>(result.Variants.Count);
        foreach (var variant in result.Variants)
        {
            // A variant that moved no money is not a reason for anything. One whose price is unknown is kept
            // even so: it moved nothing that can be seen, which is precisely what the reader has to be told.
            if (variant.PriceIsComplete
                && variant.AmountImpact == 0m
                && variant.QuantityImpact is null or 0m
                && variant.PriceImpact is null or 0m)
            {
                continue;
            }

            drivers.Add(new DecisionDriverDto(
                variants[variant.ProductVariantId].Identity,
                variant.Kind,
                variant.Category,
                variant.AmountImpact,
                variant.QuantityImpact,
                variant.PriceImpact,
                variant.CurrentQuantity,
                variant.BaselineQuantity,
                variant.QuantityPercentChange,
                variant.CurrentUnitPrice,
                variant.BaselineUnitPrice,
                variant.UnitPricePercentChange,
                variant.CurrentKnownAmount,
                variant.BaselineKnownAmount,
                variant.CurrentItemCount,
                variant.BaselineItemCount,
                variant.MissingPriceItemCount,
                variant.PriceIsComplete));
        }

        return new DecisionDecompositionDto(
            [.. result.Categories.Select(category =>
                new DecisionCauseDto(category.Category, category.Amount, category.VariantCount))],
            result.TotalAmountImpact,
            result.ExplanationIsComplete,
            result.UnattributedVariantCount,
            drivers);
    }

    // ---- the windows --------------------------------------------------------------------------------

    private static DecisionWindowDto Window(
        AnalyticsComparisonBasis basis,
        DateOnly currentPeriod,
        List<DecisionPeriodDto> baseline,
        Dictionary<long, Dictionary<long, VariantPeriodSnapshot>> snapshots,
        DecisionAmountDto current)
    {
        var periods = BaselineWindow.PeriodsFor(currentPeriod, basis);
        var available = baseline.Where(request => periods.Contains(request.Period)).OrderBy(request => request.Period).ToList();
        var missing = periods.Where(period => !available.Any(request => request.Period == period)).ToList();

        var totals = OrderAnalyticsCalculator.Totals(available
            .SelectMany(request => snapshots.TryGetValue(request.OrderRequestId, out var byVariant)
                ? byVariant.Values.AsEnumerable()
                : []));

        var average = OrderAnalyticsCalculator.AverageKnownAmount(totals, available.Count);
        var (delta, percent) = OrderAnalyticsCalculator.AmountDifference(current.KnownAmount, average);

        return new DecisionWindowDto(
            basis,
            periods.Count,
            available.Count,
            missing,
            available,
            average,
            delta,
            percent,
            totals.MissingPriceItemCount == 0 && current.IsComplete);
    }

    // ---- reading ------------------------------------------------------------------------------------

    /// <summary>One row per request and variant, from the permanent lines. Reads only.</summary>
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
                AnalyticsUnits.KindOf(row.OrderUnitCode)));
    }

    private static DecisionAmountDto AmountOf(IEnumerable<VariantPeriodSnapshot> snapshots)
    {
        var totals = OrderAnalyticsCalculator.Totals(snapshots);

        return new DecisionAmountDto(
            OrderAnalyticsCalculator.KnownAmount(totals),
            totals.ItemCount,
            totals.KnownPriceItemCount,
            totals.MissingPriceItemCount,
            totals.MissingPriceItemCount == 0);
    }

    private sealed record OrderRef(
        long OrderRequestId,
        int LocationId,
        string LocationCode,
        string LocationName,
        DateOnly Period,
        int Version,
        OrderRequestStatus Status,
        long? LatestOrderRequestId,
        int? LatestVersion);

    private sealed record VariantRef(VariantIdentityDto Identity, AnalyticsKind Kind);
}
