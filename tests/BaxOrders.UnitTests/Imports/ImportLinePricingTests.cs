using System.Reflection;
using BaxOrders.Application.Imports.Pricing;
using BaxOrders.Domain.Orders;

namespace BaxOrders.UnitTests.Imports;

/// <summary>
/// The one rule for an imported line's pricing mode (brief 16): a price wins, otherwise what a person said in review,
/// otherwise «Təsnif edilməyib» — and never anything read from the source.
/// </summary>
public sealed class ImportLinePricingTests
{
    [Theory]
    [InlineData(null)]
    [InlineData(PricingMode.PriceRequired)]
    [InlineData(PricingMode.InternalFreeSupply)]
    public void A_price_wins_whatever_the_review_said(PricingMode? classification)
    {
        Assert.Equal(PricingMode.PriceRequired, ImportLinePricing.ModeOf(4.50m, classification));
        Assert.Equal(OrderLinePricingState.Priced, ImportLinePricing.StateOf(4.50m, classification));
    }

    [Fact]
    public void A_zero_price_is_a_price()
    {
        Assert.Equal(OrderLinePricingState.Priced, ImportLinePricing.StateOf(0m, PricingMode.InternalFreeSupply));
    }

    [Fact]
    public void Nobody_said_is_Teshif_edilmeyib()
    {
        Assert.Equal(PricingMode.Unresolved, ImportLinePricing.ModeOf(null, null));
        Assert.Equal(OrderLinePricingState.MissingUnclassified, ImportLinePricing.StateOf(null, null));
    }

    [Fact]
    public void Said_to_be_bought_is_a_price_somebody_owes()
    {
        Assert.Equal(PricingMode.PriceRequired, ImportLinePricing.ModeOf(null, PricingMode.PriceRequired));
        Assert.Equal(OrderLinePricingState.MissingPriceRequired, ImportLinePricing.StateOf(null, PricingMode.PriceRequired));
    }

    [Fact]
    public void Said_to_be_supplied_free_is_complete_without_a_price()
    {
        Assert.Equal(PricingMode.InternalFreeSupply, ImportLinePricing.ModeOf(null, PricingMode.InternalFreeSupply));
        Assert.Equal(OrderLinePricingState.FreeInternalSupply, ImportLinePricing.StateOf(null, PricingMode.InternalFreeSupply));
    }

    /// <summary>Every combination the import can meet agrees with Task 2's rule applied to the mode it writes.</summary>
    [Fact]
    public void The_state_is_Task_2s_rule_applied_to_the_mode_the_line_is_written_with()
    {
        foreach (var price in new decimal?[] { null, 0m, 12.5m })
        {
            foreach (var classification in new PricingMode?[] { null, PricingMode.PriceRequired, PricingMode.InternalFreeSupply })
            {
                Assert.Equal(
                    OrderLinePricing.Classify(price, ImportLinePricing.ModeOf(price, classification)),
                    ImportLinePricing.StateOf(price, classification));
            }
        }
    }

    [Fact]
    public void The_counts_speak_Task_2_and_the_warning_is_unclassified_plus_bought()
    {
        var counts = ImportPricingCounts.Of(
        [
            (10m, null),
            (3m, PricingMode.InternalFreeSupply),
            (null, null),
            (null, null),
            (null, null),
            (null, PricingMode.PriceRequired),
            (null, PricingMode.PriceRequired),
            (null, PricingMode.InternalFreeSupply),
        ]);

        Assert.Equal((3, 2, 1), (counts.Unclassified, counts.PriceRequired, counts.InternalSupply));
        Assert.Equal(5, counts.MissingPrice);
        Assert.Equal(counts.Unclassified + counts.PriceRequired, counts.MissingPrice);
        Assert.Equal(6, counts.Unpriced);
    }

    [Fact]
    public void No_rows_count_nothing()
    {
        Assert.Equal(ImportPricingCounts.Empty, ImportPricingCounts.Of([]));
        Assert.Equal(0, ImportPricingCounts.Empty.MissingPrice);
    }

    /// <summary>
    /// "Mənbəyə görə avtomatik təsnifat olmur": the rule has no way to be told the source. Its only inputs are the
    /// price and the review's answer — no supplier, workbook text, location, product or category can reach it.
    /// </summary>
    [Fact]
    public void Nothing_about_the_source_can_reach_the_rule()
    {
        var allowed = new[] { typeof(decimal?), typeof(PricingMode?) };

        var methods = typeof(ImportLinePricing).GetMethods(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly);
        Assert.Equal(["ModeOf", "StateOf"], methods.Select(method => method.Name).Order().ToArray());

        foreach (var method in methods)
        {
            Assert.All(method.GetParameters(), parameter => Assert.Contains(parameter.ParameterType, allowed));
        }

        // The counts take the same two things per row, and nothing else.
        var of = typeof(ImportPricingCounts).GetMethods(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly)
            .Where(method => method.Name == nameof(ImportPricingCounts.Of))
            .ToList();
        var single = Assert.Single(of);
        var rows = Assert.Single(single.GetParameters()).ParameterType;
        Assert.Equal(typeof(IEnumerable<(decimal?, PricingMode?)>), rows);
    }
}
