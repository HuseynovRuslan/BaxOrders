using BaxOrders.Application.Orders.Pricing;
using BaxOrders.Domain.Orders;

namespace BaxOrders.UnitTests.Orders;

/// <summary>
/// What an empty price cell means — the one rule every screen in the app now reads.
/// </summary>
/// <remarks>
/// An absent price used to mean whatever the screen looking at it decided. The object page counted it as a
/// gap, the order page did not, and the same month was reported as having one problem and two. These tests
/// pin the classification, its two edge cases, and the fact that the database-side predicates give the same
/// answers as the in-memory classifier for every combination — which is what stops the two drifting apart.
/// </remarks>
public sealed class OrderLinePricingTests
{
    // ---- the four states ------------------------------------------------------------------------------

    [Fact]
    public void A_line_with_a_price_is_priced()
    {
        Assert.Equal(
            OrderLinePricingState.Priced,
            OrderLinePricing.Classify(4.10m, PricingMode.PriceRequired));
    }

    [Fact]
    public void A_line_nobody_has_classified_is_a_warning()
    {
        var state = OrderLinePricing.Classify(null, PricingMode.Unresolved);

        Assert.Equal(OrderLinePricingState.MissingUnclassified, state);
        Assert.True(state.IsWarning());
        Assert.False(state.IsInternalSupply());
    }

    [Fact]
    public void A_line_that_owes_a_price_is_a_warning()
    {
        var state = OrderLinePricing.Classify(null, PricingMode.PriceRequired);

        Assert.Equal(OrderLinePricingState.MissingPriceRequired, state);
        Assert.True(state.IsWarning());
    }

    [Fact]
    public void A_line_the_company_supplies_itself_is_never_a_warning()
    {
        var state = OrderLinePricing.Classify(null, PricingMode.InternalFreeSupply);

        Assert.Equal(OrderLinePricingState.FreeInternalSupply, state);
        Assert.False(state.IsWarning());
        Assert.True(state.IsInternalSupply());
    }

    // ---- edge case 1: a price beside the internal-supply mark ------------------------------------------

    /// <summary>
    /// A recorded price wins.
    /// </summary>
    /// <remarks>
    /// The price is a fact about money that changed hands; the mode is a statement about an absence that is
    /// not there. The domain refuses to mark a priced line as internally supplied, so this state can only
    /// arrive from imported history — and it is settled towards the fact, not the label. Such a line is
    /// neither a warning nor counted as internal supply, and its money is real.
    /// </remarks>
    [Fact]
    public void A_price_beside_the_internal_mark_is_still_a_priced_line()
    {
        var state = OrderLinePricing.Classify(7.50m, PricingMode.InternalFreeSupply);

        Assert.Equal(OrderLinePricingState.Priced, state);
        Assert.False(state.IsWarning());
        Assert.False(state.IsInternalSupply());
    }

    [Fact]
    public void Zero_is_a_price_like_any_other()
    {
        // Never written by this system, but if one exists it is a recorded price, not an absence.
        Assert.Equal(OrderLinePricingState.Priced, OrderLinePricing.Classify(0m, PricingMode.Unresolved));
    }

    // ---- the aggregation ------------------------------------------------------------------------------

    [Fact]
    public void The_counts_separate_the_problems_from_the_internal_supply()
    {
        var counts = LinePricingCounts.Of([
            OrderLinePricingState.Priced,
            OrderLinePricingState.MissingUnclassified,
            OrderLinePricingState.MissingPriceRequired,
            OrderLinePricingState.FreeInternalSupply,
        ]);

        Assert.Equal(4, counts.LineCount);
        Assert.Equal(1, counts.PricedLineCount);
        Assert.Equal(2, counts.WarningLineCount);
        Assert.Equal(1, counts.InternalSupplyLineCount);
        Assert.False(counts.IsAmountComplete);
    }

    /// <summary>
    /// An order supplied entirely from the company's own store is <b>complete</b>, and still has no money.
    /// Saying its amount is incomplete would send somebody looking for figures that were never owed.
    /// </summary>
    [Fact]
    public void An_order_of_nothing_but_internal_supply_is_complete()
    {
        var counts = LinePricingCounts.Of([
            OrderLinePricingState.FreeInternalSupply,
            OrderLinePricingState.FreeInternalSupply,
        ]);

        Assert.Equal(0, counts.WarningLineCount);
        Assert.Equal(2, counts.InternalSupplyLineCount);
        Assert.True(counts.IsAmountComplete);
    }

    [Fact]
    public void An_order_with_no_lines_at_all_is_complete()
    {
        Assert.True(LinePricingCounts.Empty.IsAmountComplete);
        Assert.True(LinePricingCounts.Of(Array.Empty<OrderLinePricingState>()).IsAmountComplete);
    }

    // ---- the two sides of the rule agree ---------------------------------------------------------------

    /// <summary>
    /// The database-side predicates and the in-memory classifier must answer identically for every
    /// combination there is. They are written twice — EF cannot translate a switch returning an enum — and
    /// this is what keeps the second copy honest.
    /// </summary>
    [Fact]
    public void The_query_predicates_agree_with_the_classifier_on_every_combination()
    {
        var priced = OrderLinePricingQueries.Priced.Compile();
        var warning = OrderLinePricingQueries.Warning.Compile();
        var internalSupply = OrderLinePricingQueries.InternalSupply.Compile();

        foreach (var price in new decimal?[] { null, 0m, 4.10m })
        {
            foreach (var mode in Enum.GetValues<PricingMode>())
            {
                var item = Line(price, mode);
                var state = OrderLinePricing.Classify(price, mode);

                Assert.Equal(state == OrderLinePricingState.Priced, priced(item));
                Assert.Equal(state.IsWarning(), warning(item));
                Assert.Equal(state.IsInternalSupply(), internalSupply(item));

                // And exactly one of the three is true: no line is counted twice or not at all.
                Assert.Equal(1, new[] { priced(item), warning(item), internalSupply(item) }.Count(hit => hit));
            }
        }
    }

    /// <summary>A line built straight from the entity reports the same state as the classifier.</summary>
    [Fact]
    public void The_line_itself_reports_the_same_state()
    {
        foreach (var price in new decimal?[] { null, 4.10m })
        {
            foreach (var mode in Enum.GetValues<PricingMode>())
            {
                var item = Line(price, mode);

                Assert.Equal(OrderLinePricing.Classify(price, mode), item.PricingState);
                Assert.Equal(item.PricingState.IsWarning(), item.IsMissingRequiredPrice);
                Assert.Equal(item.PricingState.IsInternalSupply(), item.IsInternalFreeSupply);
            }
        }
    }

    /// <summary>
    /// An entity with no public constructor for this shape: the two properties under test are computed from
    /// the price and the mode alone, so reflection is the honest way to set exactly those two.
    /// </summary>
    private static OrderRequestItem Line(decimal? unitPrice, PricingMode mode)
    {
        var item = (OrderRequestItem)System.Runtime.CompilerServices.RuntimeHelpers
            .GetUninitializedObject(typeof(OrderRequestItem));

        typeof(OrderRequestItem).GetProperty(nameof(OrderRequestItem.UnitPrice))!
            .SetValue(item, unitPrice);
        typeof(OrderRequestItem).GetProperty(nameof(OrderRequestItem.PricingMode))!
            .SetValue(item, mode);

        return item;
    }
}
