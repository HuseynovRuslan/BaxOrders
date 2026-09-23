using BaxOrders.Application.Analytics;
using BaxOrders.Application.Decisions;

namespace BaxOrders.UnitTests.Decisions;

/// <summary>
/// The arithmetic behind "Niyə dəyişib?", tested without a database. The screen built on this tells a manager
/// why a month costs what it costs, so the first duty of every case here is that the reasons add up to the
/// difference exactly — a decomposition that is a little bit wrong is worse than none.
/// </summary>
public sealed class CauseDecompositionTests
{
    // ---- the identity --------------------------------------------------------------------------------

    [Fact]
    public void A_price_rise_on_an_unchanged_quantity_is_entirely_a_price_effect()
    {
        // 30 napkins at 2.80, then 30 at 4.10.
        var result = Decompose(Material(1, Priced(30m, 2.80m), Priced(30m, 4.10m)));

        var variant = Assert.Single(result.Variants);
        Assert.Equal(CauseCategory.PriceChange, variant.Category);
        Assert.Equal(0m, variant.QuantityImpact);
        Assert.Equal(39m, variant.PriceImpact);
        Assert.Equal(39m, variant.AmountImpact);

        Assert.Equal(2.80m, variant.BaselineUnitPrice);
        Assert.Equal(4.10m, variant.CurrentUnitPrice);
        Assert.Equal(46.4286m, variant.UnitPricePercentChange);
        Assert.Equal(0m, variant.QuantityPercentChange);
    }

    [Fact]
    public void A_quantity_rise_at_an_unchanged_price_is_entirely_a_quantity_effect()
    {
        // 20 bin bags at 3.00, then 60 at 3.00.
        var result = Decompose(Material(1, Priced(20m, 3m), Priced(60m, 3m)));

        var variant = Assert.Single(result.Variants);
        Assert.Equal(CauseCategory.QuantityChange, variant.Category);
        Assert.Equal(120m, variant.QuantityImpact);
        Assert.Equal(0m, variant.PriceImpact);
        Assert.Equal(200m, variant.QuantityPercentChange);
    }

    [Fact]
    public void When_both_move_the_two_effects_reconstruct_the_difference_exactly()
    {
        // 20 at 3.00 = 60, then 60 at 4.10 = 246.
        var result = Decompose(Material(1, Priced(20m, 3m), Priced(60m, 4.10m)));

        var variant = Assert.Single(result.Variants);
        Assert.Equal(186m, variant.AmountImpact);
        // Valued at the old price, the extra forty bags are 120; the rest is the price moving.
        Assert.Equal(120m, variant.QuantityImpact);
        Assert.Equal(66m, variant.PriceImpact);
        Assert.Equal(variant.AmountImpact, variant.QuantityImpact + variant.PriceImpact);
    }

    [Theory]
    // Prices and quantities that do not divide cleanly: the pivot is a recurring decimal, and the two effects
    // must still land on the difference to the last digit rather than a hundredth away from it.
    [InlineData(3, 1.11, 7, 2.33)]
    [InlineData(7, 0.0001, 3, 9999.9999)]
    [InlineData(0.001, 12.3456, 123.456, 0.0001)]
    [InlineData(999.999, 0.3333, 1000.001, 0.6667)]
    [InlineData(1, 1, 3, 1)]
    public void The_two_effects_always_reconcile_however_badly_the_numbers_divide(
        double baselineQuantity, double baselinePrice, double currentQuantity, double currentPrice)
    {
        var result = Decompose(Material(
            1,
            Priced((decimal)baselineQuantity, (decimal)baselinePrice),
            Priced((decimal)currentQuantity, (decimal)currentPrice)));

        var variant = Assert.Single(result.Variants);
        Assert.Equal(variant.AmountImpact, variant.QuantityImpact + variant.PriceImpact);
        Assert.Equal(variant.AmountImpact, result.TotalAmountImpact);
        AssertCategoriesReconcile(result);
    }

    [Fact]
    public void Every_category_together_is_the_months_whole_difference()
    {
        var result = Decompose(
            Material(1, Priced(20m, 3m), Priced(60m, 4.10m)),      // both effects
            Material(2, null, Priced(5m, 10m)),                     // new
            Material(3, Priced(8m, 2.5m), null),                    // no longer ordered
            Service(4, Priced(1m, 400m), Priced(2m, 400m)),         // service
            Material(5, Partly(10m, 1m, unpriced: 2), Priced(12m, 1m))); // unknown price

        AssertCategoriesReconcile(result);
        Assert.Equal(
            result.Variants.Sum(variant => variant.AmountImpact),
            result.TotalAmountImpact);
    }

    // ---- what each category means --------------------------------------------------------------------

    [Fact]
    public void A_variant_the_baseline_never_ordered_is_new_and_carries_its_whole_amount()
    {
        var result = Decompose(Material(1, null, Priced(5m, 10m)));

        var variant = Assert.Single(result.Variants);
        Assert.Equal(CauseCategory.NewOrders, variant.Category);
        Assert.Equal(50m, variant.AmountImpact);
        Assert.Null(variant.QuantityImpact);
        Assert.Null(variant.PriceImpact);
        Assert.Equal(0m, variant.BaselineQuantity);
        Assert.Null(variant.BaselineUnitPrice);
    }

    [Fact]
    public void A_variant_that_stopped_being_ordered_removes_exactly_what_it_used_to_cost()
    {
        var result = Decompose(Material(1, Priced(8m, 2.5m), null));

        var variant = Assert.Single(result.Variants);
        Assert.Equal(CauseCategory.NoLongerOrdered, variant.Category);
        Assert.Equal(-20m, variant.AmountImpact);
        Assert.Equal(0m, variant.CurrentQuantity);
    }

    [Fact]
    public void A_service_is_compared_by_money_and_is_never_given_a_quantity_effect()
    {
        // One month of cleaning at 400, then two months at 400: 100% more "quantity" is not 100% more work.
        var result = Decompose(Service(1, Priced(1m, 400m), Priced(2m, 400m)));

        var variant = Assert.Single(result.Variants);
        Assert.Equal(CauseCategory.Services, variant.Category);
        Assert.Equal(400m, variant.AmountImpact);
        Assert.Null(variant.QuantityImpact);
        Assert.Null(variant.PriceImpact);
        Assert.Null(variant.CurrentQuantity);
        Assert.Null(variant.BaselineQuantity);
        Assert.Null(variant.QuantityPercentChange);
    }

    [Fact]
    public void A_variant_with_an_unpriced_line_is_not_split_and_makes_the_explanation_incomplete()
    {
        var result = Decompose(Material(1, Partly(10m, 1m, unpriced: 2), Priced(12m, 1m)));

        var variant = Assert.Single(result.Variants);
        Assert.Equal(CauseCategory.UnattributedDueToMissingPrice, variant.Category);
        Assert.Null(variant.QuantityImpact);
        Assert.Null(variant.PriceImpact);
        Assert.False(variant.PriceIsComplete);

        Assert.False(result.ExplanationIsComplete);
        Assert.Equal(1, result.UnattributedVariantCount);
    }

    [Fact]
    public void Its_money_is_still_counted_even_though_its_cause_is_not()
    {
        var result = Decompose(Material(1, Partly(10m, 1m, unpriced: 2), Priced(12m, 1m)));

        // Ten priced units then, twelve now: the two manat are real and are not silently dropped.
        Assert.Equal(2m, result.TotalAmountImpact);
        Assert.Equal(2m, Amount(result, CauseCategory.UnattributedDueToMissingPrice));
        AssertCategoriesReconcile(result);
    }

    [Fact]
    public void A_fully_priced_month_reports_a_complete_explanation()
    {
        var result = Decompose(Material(1, Priced(20m, 3m), Priced(60m, 4.10m)));

        Assert.True(result.ExplanationIsComplete);
        Assert.Equal(0, result.UnattributedVariantCount);
    }

    // ---- identity ------------------------------------------------------------------------------------

    [Fact]
    public void Two_variants_of_one_product_are_two_things_and_are_never_merged()
    {
        // 30 pieces at 1.00 and 30 packs at 10.00 are not sixty of anything, and the pack price is not a rise.
        var result = Decompose(
            Material(101, Priced(30m, 1m), Priced(30m, 1m)),
            Material(102, Priced(30m, 10m), Priced(30m, 10m)));

        Assert.Equal(2, result.Variants.Count);
        Assert.Equal(0m, result.TotalAmountImpact);
        Assert.All(result.Variants, variant => Assert.Equal(0m, variant.PriceImpact));
    }

    [Fact]
    public void Several_lines_of_one_variant_are_one_position_priced_by_weight()
    {
        // 10 at 2.00 and 30 at 4.00 is forty units costing 140 — an average of 3.50, not of 3.00.
        var result = Decompose(Material(
            1,
            baseline: new VariantPeriodSnapshot(1, 40m, 2, 2, 0, 40m, 140m),
            current: Priced(40m, 3.50m)));

        var variant = Assert.Single(result.Variants);
        Assert.Equal(3.50m, variant.BaselineUnitPrice);
        Assert.Equal(0m, variant.AmountImpact);
        Assert.Equal(2, variant.BaselineItemCount);
    }

    // ---- how the totals are counted ------------------------------------------------------------------

    [Fact]
    public void A_variant_that_moved_both_ways_reaches_both_totals()
    {
        var result = Decompose(Material(1, Priced(20m, 3m), Priced(60m, 4.10m)));

        Assert.Equal(120m, Amount(result, CauseCategory.QuantityChange));
        Assert.Equal(66m, Amount(result, CauseCategory.PriceChange));
        Assert.Equal(1, Count(result, CauseCategory.QuantityChange));
        Assert.Equal(1, Count(result, CauseCategory.PriceChange));
    }

    [Fact]
    public void A_variant_that_moved_one_way_is_not_counted_under_the_other()
    {
        var result = Decompose(Material(1, Priced(30m, 2.80m), Priced(30m, 4.10m)));

        Assert.Equal(0, Count(result, CauseCategory.QuantityChange));
        Assert.Equal(1, Count(result, CauseCategory.PriceChange));
    }

    [Fact]
    public void Variants_are_listed_by_how_much_money_they_moved()
    {
        var result = Decompose(
            Material(1, Priced(10m, 1m), Priced(11m, 1m)),    // +1
            Material(2, Priced(10m, 1m), Priced(10m, 21m)),   // +200
            Material(3, Priced(10m, 5m), Priced(5m, 5m)));    // −25

        Assert.Equal([2L, 3L, 1L], result.Variants.Select(variant => variant.ProductVariantId));
    }

    [Fact]
    public void An_empty_month_pair_explains_nothing_and_claims_nothing()
    {
        var result = Decompose();

        Assert.Empty(result.Variants);
        Assert.Equal(0m, result.TotalAmountImpact);
        Assert.True(result.ExplanationIsComplete);
        Assert.All(result.Categories, category => Assert.Equal(0m, category.Amount));
    }

    // ---- helpers -------------------------------------------------------------------------------------

    private static CauseDecompositionResult Decompose(params VariantCauseInput[] inputs) =>
        CauseDecomposition.Decompose(inputs);

    private static VariantCauseInput Material(long variantId, VariantPeriodSnapshot? baseline, VariantPeriodSnapshot? current) =>
        new(variantId, AnalyticsKind.QuantityComparable, current, baseline);

    private static VariantCauseInput Service(long variantId, VariantPeriodSnapshot? baseline, VariantPeriodSnapshot? current) =>
        new(variantId, AnalyticsKind.AmountOrientedService, current, baseline);

    private static VariantPeriodSnapshot Priced(decimal quantity, decimal unitPrice) =>
        new(1, quantity, 1, 1, 0, quantity, quantity * unitPrice);

    private static VariantPeriodSnapshot Partly(decimal pricedQuantity, decimal unitPrice, int unpriced) =>
        new(1, pricedQuantity + unpriced, 1 + unpriced, 1, unpriced, pricedQuantity, pricedQuantity * unitPrice);

    private static decimal Amount(CauseDecompositionResult result, CauseCategory category) =>
        result.Categories.Single(total => total.Category == category).Amount;

    private static int Count(CauseDecompositionResult result, CauseCategory category) =>
        result.Categories.Single(total => total.Category == category).VariantCount;

    /// <summary>The one rule the whole screen rests on: the reasons are the difference, with nothing left over.</summary>
    private static void AssertCategoriesReconcile(CauseDecompositionResult result)
    {
        Assert.Equal(result.TotalAmountImpact, result.Categories.Sum(category => category.Amount));
    }
}
