using BaxOrders.Application.Analytics;
using BaxOrders.Application.Common;
using BaxOrders.Application.Decisions;

namespace BaxOrders.UnitTests.Analytics;

/// <summary>
/// The arithmetic a manager checks by hand: the two figures on the row, subtracted.
/// </summary>
/// <remarks>
/// An object's difference used to be computed from its two <i>unrounded</i> sides while the sides themselves
/// were rounded separately for display. A baseline landing on half a qəpik sent the two apart, and a reader
/// subtracting the two numbers in front of them got a different answer than the screen gave. Rounding the
/// inputs and deriving the output is what makes the subtraction on the page true.
/// </remarks>
public sealed class MoneyRoundingTests
{
    [Theory]
    [InlineData(1069.504, 1069.50)]
    [InlineData(1069.505, 1069.51)]
    [InlineData(1069.506, 1069.51)]
    [InlineData(-1069.505, -1069.51)]
    [InlineData(0.005, 0.01)]
    [InlineData(700, 700)]
    public void Half_a_qepik_goes_away_from_zero(decimal value, decimal expected) =>
        Assert.Equal(expected, Money.RoundCents(value));

    /// <summary>Unknown money is never rounded into zero money.</summary>
    [Fact]
    public void An_amount_that_is_not_there_stays_absent() => Assert.Null(Money.RoundCents((decimal?)null));

    /// <summary>
    /// The case that used to break, in the smallest world that shows it.
    /// </summary>
    /// <remarks>
    /// Three baseline months averaging 1 069,505 — half a qəpik exactly. The baseline shows 1 069,51, the
    /// month shows 2 000,00, and the difference has to be 930,49: the subtraction the reader can do. Computed
    /// from the unrounded average it would come to 930,495 and print as 930,50, which is a number that cannot
    /// be reproduced from anything else on the screen.
    /// </remarks>
    [Fact]
    public void A_half_qepik_baseline_still_leaves_the_row_subtractable()
    {
        var result = PeriodComparison.Of(
            new Dictionary<long, VariantPeriodSnapshot> { [1] = Amount(2000m) },
            new Dictionary<long, List<VariantPeriodSnapshot>>
            {
                [1] = [Amount(1069.50m), Amount(1069.50m), Amount(1069.515m)],
            },
            availablePeriodCount: 3,
            new Dictionary<long, AnalyticsKind> { [1] = AnalyticsKind.QuantityComparable });

        Assert.Equal(2000m, result.CurrentKnownAmount);
        Assert.Equal(1069.51m, result.BaselineKnownAmount);
        Assert.Equal(930.49m, result.KnownAmountDelta);
        Assert.Equal(result.CurrentKnownAmount - result.BaselineKnownAmount, result.KnownAmountDelta);
    }

    /// <summary>And the reasons for that difference add up to it, to the qəpik.</summary>
    [Fact]
    public void The_reasons_add_up_to_the_difference_the_row_shows()
    {
        var result = PeriodComparison.Of(
            new Dictionary<long, VariantPeriodSnapshot> { [1] = Amount(2000m), [2] = Amount(33.335m) },
            new Dictionary<long, List<VariantPeriodSnapshot>>
            {
                [1] = [Amount(1069.50m), Amount(1069.50m), Amount(1069.515m)],
                [2] = [Amount(10.005m), Amount(10.005m), Amount(10.005m)],
            },
            availablePeriodCount: 3,
            new Dictionary<long, AnalyticsKind>
            {
                [1] = AnalyticsKind.QuantityComparable,
                [2] = AnalyticsKind.QuantityComparable,
            });

        var decomposition = result.Decomposition;
        Assert.NotNull(decomposition);
        Assert.Equal(result.KnownAmountDelta, decomposition.TotalAmountImpact);
        Assert.Equal(result.KnownAmountDelta, decomposition.Categories.Sum(category => category.Amount));
    }

    /// <summary>
    /// Every figure a caller can read off the result is a whole number of qəpik. Anything else would be a
    /// figure the screen has to round for itself, which is where the two answers came from in the first place.
    /// </summary>
    [Fact]
    public void Nothing_leaves_the_comparison_at_a_finer_scale_than_a_qepik()
    {
        var result = PeriodComparison.Of(
            new Dictionary<long, VariantPeriodSnapshot> { [1] = Amount(1234.56789m) },
            new Dictionary<long, List<VariantPeriodSnapshot>> { [1] = [Amount(333.33333m), Amount(222.22222m)] },
            availablePeriodCount: 2,
            new Dictionary<long, AnalyticsKind> { [1] = AnalyticsKind.QuantityComparable });

        Assert.Equal(Money.RoundCents(result.CurrentKnownAmount), result.CurrentKnownAmount);
        Assert.Equal(Money.RoundCents(result.BaselineKnownAmount), result.BaselineKnownAmount);
        Assert.Equal(Money.RoundCents(result.KnownAmountDelta), result.KnownAmountDelta);
        Assert.All(
            result.Decomposition!.Categories,
            category => Assert.Equal(Money.RoundCents(category.Amount), category.Amount));
    }

    /// <summary>One priced line carrying the whole amount; the quantity is beside the point here.</summary>
    private static VariantPeriodSnapshot Amount(decimal amount) => new(1, 1m, 1, 1, 0, 0, 1m, amount);
}
