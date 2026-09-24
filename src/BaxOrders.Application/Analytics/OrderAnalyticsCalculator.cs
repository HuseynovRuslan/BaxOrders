using BaxOrders.Application.Common;
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

    /// <summary>
    /// The precision a <b>unit price</b> keeps: the one the domain stores prices with.
    /// </summary>
    /// <remarks>
    /// A price is not a total. It is multiplied by a quantity before anybody adds it up, so cutting it to the
    /// cent here would lose real information about what the company pays. Amounts are a different matter and
    /// go through <see cref="Money.RoundCents(decimal)"/> — see there for why they are rounded at the source.
    /// </remarks>
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
        var state = StateOf(input.Kind, current.Quantity, baseline.Quantity, input.AvailableBaselinePeriodCount);
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
        var missingRequired = snapshot?.MissingRequiredPriceItemCount ?? 0;
        var priceNotRequired = snapshot?.PriceNotRequiredItemCount ?? 0;

        return new ComparisonSide(
            // A service's quantity is not a comparable figure, so it is not offered as one.
            input.Kind == AnalyticsKind.QuantityComparable ? quantity : null,
            snapshot?.ItemCount ?? 0,
            // Rounded here, where it is computed, so the difference below is a subtraction of two figures the
            // screen actually shows rather than of two it does not.
            knownPriceItems == 0 ? null : Money.RoundCents(pricedAmount),
            WeightedPrice(pricedAmount, pricedQuantity),
            CoverageOf(quantity, pricedQuantity, knownPriceItems, missingRequired, priceNotRequired));
    }

    private static ComparisonSide BaselineSide(VariantComparisonInput input)
    {
        var available = input.AvailableBaselinePeriodCount;

        decimal quantity = 0m, pricedQuantity = 0m, pricedAmount = 0m;
        int itemCount = 0, knownPriceItems = 0, missingRequired = 0, priceNotRequired = 0;
        foreach (var snapshot in input.BaselineSnapshots)
        {
            quantity += snapshot.Quantity;
            pricedQuantity += snapshot.PricedQuantity;
            pricedAmount += snapshot.PricedAmount;
            itemCount += snapshot.ItemCount;
            knownPriceItems += snapshot.KnownPriceItemCount;
            missingRequired += snapshot.MissingRequiredPriceItemCount;
            priceNotRequired += snapshot.PriceNotRequiredItemCount;
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
                : Money.RoundCents(pricedAmount / available);
        }

        return new ComparisonSide(
            input.Kind == AnalyticsKind.QuantityComparable ? averageQuantity : null,
            itemCount,
            averageAmount,
            // Pooled over every available month: a month of one unit must not weigh as much as a month of a
            // thousand, which is what averaging monthly averages would do.
            available == 0 ? null : WeightedPrice(pricedAmount, pricedQuantity),
            CoverageOf(quantity, pricedQuantity, knownPriceItems, missingRequired, priceNotRequired));
    }

    private static decimal? WeightedPrice(decimal pricedAmount, decimal pricedQuantity) =>
        pricedQuantity > 0
            ? Math.Round(pricedAmount / pricedQuantity, MoneyScale, MidpointRounding.AwayFromZero)
            : null;

    /// <summary>
    /// How much of a side is priced, judged against how much of it was ever <b>supposed</b> to be.
    /// </summary>
    /// <remarks>
    /// <see cref="PriceCoverageState.Complete"/> does not mean every line carries a unit price. It means every
    /// line that needed one carries it. A side made up entirely of material issued from the company's own store
    /// is complete with no prices at all, and its money is null rather than zero — there is nothing to know.
    /// </remarks>
    private static PriceCoverage CoverageOf(
        decimal totalQuantity,
        decimal pricedQuantity,
        int knownPriceItems,
        int missingRequiredItems,
        int priceNotRequiredItems)
    {
        var missingQuantity = totalQuantity - pricedQuantity;
        var state = (totalQuantity, missingRequiredItems, pricedQuantity) switch
        {
            // Nothing on this side at all: there is no coverage to describe.
            (0, _, _) => PriceCoverageState.Unavailable,
            // Nothing that had to be priced is unpriced — whatever else is here belongs to internal supply.
            (_, 0, _) => PriceCoverageState.Complete,
            // Prices are owed and not one of them is known.
            (_, _, 0) => PriceCoverageState.Unavailable,
            _ => PriceCoverageState.Partial,
        };

        return new PriceCoverage(
            state, totalQuantity, pricedQuantity, missingQuantity,
            knownPriceItems, missingRequiredItems, priceNotRequiredItems);
    }

    /// <summary>
    /// Whether a product is new, no longer ordered, up, down or unchanged against its basis — the one definition
    /// both the comparison page and the order page count products by.
    /// </summary>
    /// <remarks>
    /// There is exactly one of these on purpose. The two pages used to count "new products" by two different
    /// rules and gave a reader 58 on one and 60 on the other for the same month and basis. Both now call this.
    /// <para>
    /// The quantities are compared at the scale the comparison page shows them, so a caller holding an
    /// unrounded average — as the cause decomposition does — gets the same answer as one holding the rounded
    /// figure on the screen.
    /// </para>
    /// </remarks>
    /// <param name="currentQuantity">This month's quantity; zero when the product is not on this month's order.</param>
    /// <param name="baselineQuantity">The basis quantity: an average month over the available months.</param>
    /// <param name="availableBaselinePeriodCount">Basis months the location actually has a request for.</param>
    public static ComparisonState StateOf(
        AnalyticsKind kind, decimal? currentQuantity, decimal? baselineQuantity, int availableBaselinePeriodCount)
    {
        // Nothing to compare against: every variant would otherwise look new, which would be a lie about the
        // location's history rather than a fact about the products.
        if (availableBaselinePeriodCount == 0)
        {
            return ComparisonState.InsufficientHistory;
        }

        if (kind != AnalyticsKind.QuantityComparable || currentQuantity is not { } current || baselineQuantity is not { } baseline)
        {
            return ComparisonState.NotComparable;
        }

        var now = Math.Round(current, QuantityScale, MidpointRounding.AwayFromZero);
        var then = Math.Round(baseline, QuantityScale, MidpointRounding.AwayFromZero);

        return (now, then) switch
        {
            ( > 0, 0) => ComparisonState.New,
            (0, > 0) => ComparisonState.NoLongerOrdered,
            _ when now > then => ComparisonState.Increased,
            _ when now < then => ComparisonState.Decreased,
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
    public static decimal? PercentChange(decimal current, decimal baseline) => baseline == 0
        ? null
        : Math.Round((current - baseline) / baseline * 100m, PercentScale, MidpointRounding.AwayFromZero);

    /// <summary>Everything a set of snapshots says about lines and money, added up.</summary>
    public static AmountTotals Totals(IEnumerable<VariantPeriodSnapshot> snapshots)
    {
        ArgumentNullException.ThrowIfNull(snapshots);

        int items = 0, known = 0, missingRequired = 0, notRequired = 0;
        decimal amount = 0m;
        foreach (var snapshot in snapshots)
        {
            items += snapshot.ItemCount;
            known += snapshot.KnownPriceItemCount;
            missingRequired += snapshot.MissingRequiredPriceItemCount;
            notRequired += snapshot.PriceNotRequiredItemCount;
            amount += snapshot.PricedAmount;
        }

        return new AmountTotals(items, known, missingRequired, notRequired, amount);
    }

    /// <summary>The money of one period. Null when nothing in it has a price — unknown is never zero.</summary>
    /// <remarks>
    /// To the cent, because the cent is the only precision this figure is ever read at, and because every
    /// difference and total derived from it has to reconcile with what is printed.
    /// </remarks>
    public static decimal? KnownAmount(AmountTotals totals) =>
        totals.KnownPriceItemCount == 0 ? null : Money.RoundCents(totals.PricedAmount);

    /// <summary>
    /// The money of an average baseline month: the priced amounts of the available months divided by how many
    /// of them there are. One month is compared with an average month, never with a three-month total.
    /// </summary>
    /// <remarks>
    /// Rounded to the cent in one step, never to some intermediate scale first: rounding twice can land a
    /// qəpik away from rounding once, and this is the figure the screen subtracts from.
    /// </remarks>
    public static decimal? AverageKnownAmount(AmountTotals totals, int availablePeriodCount) =>
        availablePeriodCount == 0 || totals.KnownPriceItemCount == 0
            ? null
            : Money.RoundCents(totals.PricedAmount / availablePeriodCount);

    /// <summary>The money difference between two sides, and its percentage where one exists.</summary>
    /// <remarks>
    /// Both sides arrive rounded to the cent, so the difference is exact and needs no rounding of its own: it
    /// is the subtraction a reader performs on the two figures in front of them, with the same answer.
    /// </remarks>
    public static (decimal? Delta, decimal? Percent) AmountDifference(decimal? current, decimal? baseline) =>
        current is { } currentValue && baseline is { } baselineValue
            ? (currentValue - baselineValue, PercentChange(currentValue, baselineValue))
            : (null, null);
}

/// <summary>Lines and money of a set of snapshots, before anything is compared.</summary>
/// <param name="MissingRequiredPriceItemCount">Bought lines nobody has priced. The only kind that is a gap.</param>
/// <param name="PriceNotRequiredItemCount">Internally supplied lines, complete without a purchase price.</param>
public sealed record AmountTotals(
    int ItemCount,
    int KnownPriceItemCount,
    int MissingRequiredPriceItemCount,
    int PriceNotRequiredItemCount,
    decimal PricedAmount)
{
    /// <summary>
    /// True when every line that needed a price has one.
    /// </summary>
    /// <remarks>
    /// Read this carefully before relying on it: "complete" is about <b>required</b> prices. An order of
    /// nothing but internal supply is complete and its money is still null. If you want "every line has a unit
    /// price", that is not this, and it is almost certainly not the question you want to ask.
    /// </remarks>
    public bool IsComplete => MissingRequiredPriceItemCount == 0;
}
