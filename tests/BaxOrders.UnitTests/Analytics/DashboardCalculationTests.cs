using BaxOrders.Application.Analytics;

namespace BaxOrders.UnitTests.Analytics;

/// <summary>
/// The money and coverage rules the dashboard shares with the location screen. They live in the calculator so
/// there is one implementation of them, and these tests pin that one down.
/// </summary>
public sealed class DashboardCalculationTests
{
    private const long Variant = 7;

    // ---- money ---------------------------------------------------------------------------------------

    [Fact]
    public void A_period_amount_is_the_money_of_its_priced_lines()
    {
        var totals = OrderAnalyticsCalculator.Totals([Snapshot(priced: 100m), Snapshot(priced: 50m)]);

        Assert.Equal(2, totals.ItemCount);
        Assert.Equal(0, totals.MissingPriceItemCount);
        Assert.Equal(150m, OrderAnalyticsCalculator.KnownAmount(totals));
    }

    [Fact]
    public void A_period_with_no_priced_line_has_no_amount_rather_than_a_zero_one()
    {
        var totals = OrderAnalyticsCalculator.Totals([Unpriced(), Unpriced()]);

        Assert.Equal(0, totals.KnownPriceItemCount);
        Assert.Equal(2, totals.MissingPriceItemCount);
        Assert.Null(OrderAnalyticsCalculator.KnownAmount(totals));
    }

    [Fact]
    public void One_unpriced_line_makes_the_amount_incomplete_without_making_it_unknown()
    {
        var totals = OrderAnalyticsCalculator.Totals([Snapshot(priced: 100m), Unpriced()]);

        Assert.Equal(100m, OrderAnalyticsCalculator.KnownAmount(totals));
        Assert.Equal(1, totals.MissingPriceItemCount);
        Assert.False(totals.MissingPriceItemCount == 0);
    }

    // ---- baseline averages ---------------------------------------------------------------------------

    [Theory]
    [InlineData(1, 300)]
    [InlineData(2, 150)]
    [InlineData(3, 100)]
    [InlineData(6, 50)]
    public void A_baseline_amount_is_the_money_of_an_average_month(int availablePeriods, int expected)
    {
        // 300 across the available months. One current month is compared with one average month, never with a
        // three- or six-month total.
        var totals = OrderAnalyticsCalculator.Totals([Snapshot(priced: 300m)]);

        Assert.Equal(expected, OrderAnalyticsCalculator.AverageKnownAmount(totals, availablePeriods));
    }

    [Fact]
    public void An_average_divides_by_the_months_that_exist_not_by_the_months_that_were_asked_for()
    {
        // A three-month window in which one month has no request at all: 300 over the two that do is 150.
        var totals = OrderAnalyticsCalculator.Totals([Snapshot(priced: 200m), Snapshot(priced: 100m)]);

        Assert.Equal(150m, OrderAnalyticsCalculator.AverageKnownAmount(totals, availablePeriodCount: 2));
    }

    [Fact]
    public void With_no_available_month_there_is_no_baseline_amount_at_all()
    {
        var totals = OrderAnalyticsCalculator.Totals([]);

        Assert.Null(OrderAnalyticsCalculator.AverageKnownAmount(totals, availablePeriodCount: 0));
    }

    // ---- differences ---------------------------------------------------------------------------------

    [Fact]
    public void An_amount_difference_carries_its_percentage_when_both_sides_are_known()
    {
        var (delta, percent) = OrderAnalyticsCalculator.AmountDifference(1200m, 1000m);

        Assert.Equal(200m, delta);
        Assert.Equal(20m, percent);
    }

    [Fact]
    public void A_baseline_amount_of_zero_gives_a_difference_but_no_percentage()
    {
        var (delta, percent) = OrderAnalyticsCalculator.AmountDifference(500m, 0m);

        Assert.Equal(500m, delta);
        Assert.Null(percent);
    }

    [Theory]
    [InlineData(null, 100)]
    [InlineData(100, null)]
    [InlineData(null, null)]
    public void An_unknown_side_produces_no_difference_rather_than_a_misleading_one(int? current, int? baseline)
    {
        var (delta, percent) = OrderAnalyticsCalculator.AmountDifference(current, baseline);

        Assert.Null(delta);
        Assert.Null(percent);
    }

    // ---- what a missing month does and does not mean -------------------------------------------------

    [Fact]
    public void A_location_with_no_baseline_month_has_products_of_unknown_history_not_new_products()
    {
        // Exactly the real EXPO case: the month exists, the month before it does not.
        var result = OrderAnalyticsCalculator.Compare(new VariantComparisonInput(
            Variant, AnalyticsKind.QuantityComparable, Snapshot(quantity: 10m), [],
            AvailableBaselinePeriodCount: 0, ExpectedBaselinePeriodCount: 1));

        Assert.Equal(ComparisonState.InsufficientHistory, result.State);
        Assert.NotEqual(ComparisonState.New, result.State);
        Assert.Null(result.Baseline.Quantity);
    }

    [Fact]
    public void A_service_carries_money_but_never_a_quantity_figure()
    {
        var result = OrderAnalyticsCalculator.Compare(new VariantComparisonInput(
            Variant, AnalyticsKind.AmountOrientedService, Snapshot(quantity: 1m, priced: 200m),
            [Snapshot(quantity: 1m, priced: 150m)], 1, 1));

        Assert.Equal(200m, result.Current.KnownAmount);
        Assert.Equal(50m, result.Delta.AmountDelta);
        Assert.Null(result.Current.Quantity);
        Assert.Null(result.Delta.QuantityDelta);
        Assert.Equal(ComparisonState.NotComparable, result.State);
    }

    // ---- helpers -------------------------------------------------------------------------------------

    private static VariantPeriodSnapshot Snapshot(decimal quantity = 1m, decimal priced = 100m) =>
        new(Variant, quantity, 1, 1, 0, quantity, priced);

    private static VariantPeriodSnapshot Unpriced(decimal quantity = 1m) =>
        new(Variant, quantity, 1, 0, 1, 0m, 0m);
}
