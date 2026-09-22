using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Analytics;

/// <summary>
/// The comparison mathematics, with no database and no EF in sight: it takes period snapshots and returns
/// comparison figures, so every rule below can be tested directly.
/// </summary>
/// <remarks>
/// Two rules decide most of the behaviour here.
/// <para>
/// <b>A missing month is not a zero.</b> If the location has a request for a baseline month but the variant is
/// absent from it, the variant ordered zero that month and that zero is part of the average. If the location
/// has no request for that month at all, the month is not available: it never enters the average, and the
/// average is divided by the months that are.
/// </para>
/// <para>
/// <b>Unknown money is not zero money.</b> An item without a price contributes its quantity and nothing else;
/// it never becomes a zero in an amount, and the coverage figures say how much of the quantity was priced.
/// </para>
/// </remarks>
public static class OrderAnalyticsCalculator
{
    /// <summary>Quantities keep the precision the domain stores them with.</summary>
    public const int QuantityScale = OrderRequestItem.QuantityScale;

    /// <summary>Prices and money keep the precision the domain stores prices with.</summary>
    public const int MoneyScale = OrderRequestItem.UnitPriceScale;

    /// <summary>
    /// Percentages are rounded to four decimals. They are derived figures, so they are rounded once, here,
    /// and every delta in a response is consistent with the rounded sides it was computed from.
    /// </summary>
    public const int PercentScale = 4;

    public static VariantComparisonResult Compare(VariantComparisonInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var current = CurrentSide(input);
        var baseline = BaselineSide(input);
        var state = StateOf(input, current.Quantity, baseline.Quantity);
        var delta = DeltaOf(state, current, baseline);

        return new VariantComparisonResult(
            input.ProductVariantId,
            input.Kind,
            state,
            current,
            baseline,
            input.AvailableBaselinePeriodCount,
            input.ExpectedBaselinePeriodCount,
            delta);
    }

    private static ComparisonSide CurrentSide(VariantComparisonInput input)
    {
        var snapshot = input.Current;
        var quantity = snapshot?.Quantity ?? 0m;
        var pricedQuantity = snapshot?.PricedQuantity ?? 0m;
        var pricedAmount = snapshot?.PricedAmount ?? 0m;
        var knownPriceItems = snapshot?.KnownPriceItemCount ?? 0;
        var missingPriceItems = snapshot?.MissingPriceItemCount ?? 0;

        return new ComparisonSide(
            // A service's quantity is not a comparable figure, so it is not offered as one.
            input.Kind == AnalyticsKind.QuantityComparable ? quantity : null,
            snapshot?.ItemCount ?? 0,
            knownPriceItems == 0 ? null : pricedAmount,
            WeightedPrice(pricedAmount, pricedQuantity),
            CoverageOf(quantity, pricedQuantity, knownPriceItems, missingPriceItems));
    }

    private static ComparisonSide BaselineSide(VariantComparisonInput input)
    {
        var available = input.AvailableBaselinePeriodCount;

        decimal quantity = 0m, pricedQuantity = 0m, pricedAmount = 0m;
        int itemCount = 0, knownPriceItems = 0, missingPriceItems = 0;
        foreach (var snapshot in input.BaselineSnapshots)
        {
            quantity += snapshot.Quantity;
            pricedQuantity += snapshot.PricedQuantity;
            pricedAmount += snapshot.PricedAmount;
            itemCount += snapshot.ItemCount;
            knownPriceItems += snapshot.KnownPriceItemCount;
            missingPriceItems += snapshot.MissingPriceItemCount;
        }

        decimal? averageQuantity = null;
        decimal? averageAmount = null;
        if (available > 0)
        {
            // Divided by the months that exist, not by the months the basis asked for. A month in which the
            // location ordered but this variant did not is one of them, and contributes its zero.
            averageQuantity = Math.Round(quantity / available, QuantityScale, MidpointRounding.AwayFromZero);
            averageAmount = knownPriceItems == 0
                ? null
                : Math.Round(pricedAmount / available, MoneyScale, MidpointRounding.AwayFromZero);
        }

        return new ComparisonSide(
            input.Kind == AnalyticsKind.QuantityComparable ? averageQuantity : null,
            itemCount,
            averageAmount,
            // Pooled over every available month: a month of one unit must not weigh as much as a month of a
            // thousand, which is what averaging monthly averages would do.
            available == 0 ? null : WeightedPrice(pricedAmount, pricedQuantity),
            CoverageOf(quantity, pricedQuantity, knownPriceItems, missingPriceItems));
    }

    private static decimal? WeightedPrice(decimal pricedAmount, decimal pricedQuantity) =>
        pricedQuantity > 0
            ? Math.Round(pricedAmount / pricedQuantity, MoneyScale, MidpointRounding.AwayFromZero)
            : null;

    private static PriceCoverage CoverageOf(
        decimal totalQuantity, decimal pricedQuantity, int knownPriceItems, int missingPriceItems)
    {
        var missingQuantity = totalQuantity - pricedQuantity;
        var state = (totalQuantity, pricedQuantity, missingQuantity) switch
        {
            (0, _, _) => PriceCoverageState.Unavailable,
            (_, 0, _) => PriceCoverageState.Unavailable,
            (_, _, 0) => PriceCoverageState.Complete,
            _ => PriceCoverageState.Partial,
        };

        return new PriceCoverage(state, totalQuantity, pricedQuantity, missingQuantity, knownPriceItems, missingPriceItems);
    }

    private static ComparisonState StateOf(VariantComparisonInput input, decimal? current, decimal? baseline)
    {
        // Nothing to compare against: every variant would otherwise look new, which would be a lie about the
        // location's history rather than a fact about the products.
        if (input.AvailableBaselinePeriodCount == 0)
        {
            return ComparisonState.InsufficientHistory;
        }

        if (input.Kind != AnalyticsKind.QuantityComparable || current is not { } currentQuantity || baseline is not { } baselineQuantity)
        {
            return ComparisonState.NotComparable;
        }

        return (currentQuantity, baselineQuantity) switch
        {
            ( > 0, 0) => ComparisonState.New,
            (0, > 0) => ComparisonState.NoLongerOrdered,
            _ when currentQuantity > baselineQuantity => ComparisonState.Increased,
            _ when currentQuantity < baselineQuantity => ComparisonState.Decreased,
            _ => ComparisonState.Unchanged,
        };
    }

    private static ComparisonDelta DeltaOf(ComparisonState state, ComparisonSide current, ComparisonSide baseline)
    {
        decimal? quantityDelta = null;
        decimal? quantityPercent = null;
        if (state is not (ComparisonState.NotComparable or ComparisonState.InsufficientHistory)
            && current.Quantity is { } currentQuantity
            && baseline.Quantity is { } baselineQuantity)
        {
            quantityDelta = currentQuantity - baselineQuantity;
            quantityPercent = PercentChange(currentQuantity, baselineQuantity);
        }

        var (priceDelta, pricePercent) = Difference(current.WeightedUnitPrice, baseline.WeightedUnitPrice);
        var (amountDelta, amountPercent) = Difference(current.KnownAmount, baseline.KnownAmount);

        return new ComparisonDelta(quantityDelta, quantityPercent, priceDelta, pricePercent, amountDelta, amountPercent);
    }

    private static (decimal? Delta, decimal? Percent) Difference(decimal? current, decimal? baseline) =>
        current is { } currentValue && baseline is { } baselineValue
            ? (currentValue - baselineValue, PercentChange(currentValue, baselineValue))
            : (null, null);

    /// <summary>
    /// Percentage change, or null where a percentage would be meaningless. A rise from nothing has no
    /// percentage — it is reported as new instead of as infinity.
    /// </summary>
    private static decimal? PercentChange(decimal current, decimal baseline) => baseline == 0
        ? null
        : Math.Round((current - baseline) / baseline * 100m, PercentScale, MidpointRounding.AwayFromZero);
}
