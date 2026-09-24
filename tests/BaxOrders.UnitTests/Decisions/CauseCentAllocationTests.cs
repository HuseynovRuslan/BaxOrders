using BaxOrders.Application.Analytics;
using BaxOrders.Application.Common;
using BaxOrders.Application.Decisions;

namespace BaxOrders.UnitTests.Decisions;

/// <summary>
/// The reasons a month changed, printed to the cent and still adding up to the change.
/// </summary>
/// <remarks>
/// The components have to be computed at full precision — that is the only way a variant's quantity and price
/// effects reconstruct its difference at all — and the screen then prints them to the cent. Rounding each one
/// on its own leaves the list a qəpik or two from the "Cəmi" above it, and a reader who adds the reasons up
/// and does not get the difference has been told the reasons are incomplete, whether or not they are. So the
/// cents are allocated instead of rounded, by largest remainder.
/// </remarks>
public sealed class CauseCentAllocationTests
{
    /// <summary>
    /// Three thirds of a qəpik. Rounded on their own they come to 0,03 more than the difference they explain;
    /// allocated, they come to exactly it.
    /// </summary>
    [Fact]
    public void The_components_add_up_to_the_difference_they_explain()
    {
        var result = ToCents(
            Split(CauseCategory.NewOrders, 10.005m, 1),
            Split(CauseCategory.Services, 20.005m, 1),
            Split(CauseCategory.InternalSupply, 30.005m, 1));

        Assert.Equal(60.02m, result.Categories.Sum(category => category.Amount));
        Assert.Equal(60.02m, result.TotalAmountImpact);
    }

    /// <summary>
    /// The qəpik goes to the largest fractional part, and the components that had none keep what they had.
    /// </summary>
    [Fact]
    public void The_largest_fraction_takes_the_odd_qepik()
    {
        var result = ToCents(
            Split(CauseCategory.NewOrders, 10.001m, 1),
            Split(CauseCategory.Services, 20.009m, 1));

        Assert.Equal(10m, Amount(result, CauseCategory.NewOrders));
        Assert.Equal(20.01m, Amount(result, CauseCategory.Services));
    }

    /// <summary>
    /// Equal fractions, so the qəpik goes to the one that moved more money — a rounding artefact is least
    /// visible on the largest figure, and the rule has to be the same every time it is asked.
    /// </summary>
    [Fact]
    public void On_an_equal_fraction_the_bigger_mover_takes_it()
    {
        var result = ToCents(
            Split(CauseCategory.NewOrders, 10.005m, 1),
            Split(CauseCategory.Services, 90.005m, 1));

        Assert.Equal(10m, Amount(result, CauseCategory.NewOrders));
        Assert.Equal(90.01m, Amount(result, CauseCategory.Services));
    }

    /// <summary>
    /// Equal fractions on equal amounts: the qəpik goes to whichever the reader meets first, so the answer
    /// never depends on the order the categories happened to be built in.
    /// </summary>
    [Fact]
    public void On_an_equal_amount_the_first_in_reading_order_takes_it()
    {
        var result = ToCents(
            Split(CauseCategory.Services, 10.005m, 1),
            Split(CauseCategory.NewOrders, 10.005m, 1));

        Assert.Equal(10.01m, Amount(result, CauseCategory.NewOrders));
        Assert.Equal(10m, Amount(result, CauseCategory.Services));
        // And that "first" means the canonical reading order rather than the order they were handed over in.
        var order = CauseDecomposition.Order.ToList();
        Assert.True(order.IndexOf(CauseCategory.NewOrders) < order.IndexOf(CauseCategory.Services));
    }

    /// <summary>
    /// A category nobody contributed to must not appear out of nowhere with a qəpik against it — the screen
    /// lists every non-zero component, and "Yeni sifarişlər 0,01 ₼" with no orders behind it is a lie.
    /// </summary>
    [Fact]
    public void An_empty_category_never_absorbs_anything()
    {
        var result = ToCents(
            Split(CauseCategory.NewOrders, 0m, 0),
            Split(CauseCategory.Services, 10.005m, 1));

        Assert.Equal(0m, Amount(result, CauseCategory.NewOrders));
        Assert.Equal(10.01m, Amount(result, CauseCategory.Services));
    }

    /// <summary>
    /// The target is the difference the <i>screen</i> shows, which is its two rounded sides subtracted, so it
    /// can land a qəpik below the unrounded components. Then one has to be given back rather than handed out.
    /// </summary>
    [Fact]
    public void A_qepik_is_given_back_when_the_difference_rounded_the_other_way()
    {
        var result = ToCents(
            20m,
            Split(CauseCategory.NewOrders, 10.004m, 1),
            Split(CauseCategory.Services, 10.004m, 1));

        Assert.Equal(20m, result.Categories.Sum(category => category.Amount));
        Assert.Equal(20m, result.TotalAmountImpact);
    }

    /// <summary>Negative money allocates the same way: the rule is about fractions, not about direction.</summary>
    [Fact]
    public void A_fall_allocates_exactly_as_a_rise_does()
    {
        var result = ToCents(
            Split(CauseCategory.NoLongerOrdered, -10.005m, 1),
            Split(CauseCategory.Services, -20.005m, 1));

        Assert.Equal(-30.01m, result.Categories.Sum(category => category.Amount));
        Assert.Equal(-30.01m, result.TotalAmountImpact);
    }

    /// <summary>Nothing to allocate is not a special case, and it does not invent a component.</summary>
    [Fact]
    public void An_explanation_with_no_money_in_it_stays_empty()
    {
        var result = ToCents(Split(CauseCategory.NewOrders, 0m, 0));

        Assert.Equal(0m, result.Categories.Sum(category => category.Amount));
        Assert.Equal(0m, result.TotalAmountImpact);
    }

    /// <summary>A driver is a line of its own, so it is rounded — and its two effects still rebuild its row.</summary>
    [Fact]
    public void A_drivers_two_effects_still_reconstruct_its_own_difference()
    {
        var decomposition = CauseDecomposition.Decompose(
        [
            new VariantCauseInput(
                1,
                AnalyticsKind.QuantityComparable,
                new VariantPeriodSnapshot(1, 7m, 1, 1, 0, 0, 7m, 23.3331m),
                new VariantPeriodSnapshot(1, 3m, 1, 1, 0, 0, 3m, 10.0007m)),
        ]);

        var cents = CauseDecomposition.ToCents(decomposition, Money.RoundCents(decomposition.TotalAmountImpact));
        var variant = Assert.Single(cents.Variants);

        Assert.Equal(Money.RoundCents(variant.AmountImpact), variant.AmountImpact);
        Assert.Equal(variant.AmountImpact, (variant.QuantityImpact ?? 0m) + (variant.PriceImpact ?? 0m));
    }

    // ---- helpers -------------------------------------------------------------------------------------

    private static CauseCategoryTotal Split(CauseCategory category, decimal amount, int variantCount) =>
        new(category, amount, variantCount);

    /// <summary>Allocates against the components' own total, which is the ordinary case.</summary>
    private static CauseDecompositionResult ToCents(params CauseCategoryTotal[] categories) =>
        ToCents(Money.RoundCents(categories.Sum(category => category.Amount)), categories);

    private static CauseDecompositionResult ToCents(decimal total, params CauseCategoryTotal[] categories) =>
        CauseDecomposition.ToCents(
            new CauseDecompositionResult(categories, [], categories.Sum(c => c.Amount), true, 0, 0, 0),
            total);

    private static decimal Amount(CauseDecompositionResult result, CauseCategory category) =>
        result.Categories.Single(total => total.Category == category).Amount;
}
