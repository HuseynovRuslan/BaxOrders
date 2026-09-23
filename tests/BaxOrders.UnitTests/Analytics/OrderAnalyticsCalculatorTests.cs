using BaxOrders.Application.Analytics;
using BaxOrders.Domain.Catalog;

namespace BaxOrders.UnitTests.Analytics;

/// <summary>
/// The comparison arithmetic, tested without a database. Every case here is a rule the business asked for,
/// so the names say what the rule is rather than which method is being called.
/// </summary>
public sealed class OrderAnalyticsCalculatorTests
{
    private const long Variant = 42;

    // ---- previous month -----------------------------------------------------------------------------

    [Fact]
    public void A_larger_quantity_than_last_month_is_an_increase()
    {
        var result = ComparePreviousMonth(current: Snapshot(120m), baseline: Snapshot(100m));

        Assert.Equal(ComparisonState.Increased, result.State);
        Assert.Equal(120m, result.Current.Quantity);
        Assert.Equal(100m, result.Baseline.Quantity);
        Assert.Equal(20m, result.Delta.QuantityDelta);
        Assert.Equal(20m, result.Delta.QuantityPercentChange);
    }

    [Fact]
    public void A_smaller_quantity_than_last_month_is_a_decrease()
    {
        var result = ComparePreviousMonth(current: Snapshot(80m), baseline: Snapshot(100m));

        Assert.Equal(ComparisonState.Decreased, result.State);
        Assert.Equal(-20m, result.Delta.QuantityDelta);
        Assert.Equal(-20m, result.Delta.QuantityPercentChange);
    }

    [Fact]
    public void The_same_quantity_is_unchanged_and_zero_percent()
    {
        var result = ComparePreviousMonth(current: Snapshot(100m), baseline: Snapshot(100m));

        Assert.Equal(ComparisonState.Unchanged, result.State);
        Assert.Equal(0m, result.Delta.QuantityDelta);
        Assert.Equal(0m, result.Delta.QuantityPercentChange);
    }

    [Fact]
    public void A_product_that_was_ordered_and_now_is_not_falls_to_minus_one_hundred_percent()
    {
        // The location did order last month; the product simply is not in this month's request.
        var result = ComparePreviousMonth(current: null, baseline: Snapshot(100m));

        Assert.Equal(ComparisonState.NoLongerOrdered, result.State);
        Assert.Equal(0m, result.Current.Quantity);
        Assert.Equal(-100m, result.Delta.QuantityDelta);
        Assert.Equal(-100m, result.Delta.QuantityPercentChange);
    }

    [Fact]
    public void A_product_that_was_never_ordered_before_is_new_and_has_no_percentage()
    {
        // A rise from nothing is not a percentage; reporting infinity would be worse than reporting nothing.
        var result = ComparePreviousMonth(current: Snapshot(10m), baseline: null);

        Assert.Equal(ComparisonState.New, result.State);
        Assert.Equal(0m, result.Baseline.Quantity);
        Assert.Equal(10m, result.Delta.QuantityDelta);
        Assert.Null(result.Delta.QuantityPercentChange);
    }

    [Fact]
    public void A_location_month_that_does_not_exist_is_insufficient_history_not_a_shop_full_of_new_products()
    {
        var result = OrderAnalyticsCalculator.Compare(new VariantComparisonInput(
            Variant, AnalyticsKind.QuantityComparable, Snapshot(10m), [],
            AvailableBaselinePeriodCount: 0, ExpectedBaselinePeriodCount: 1));

        Assert.Equal(ComparisonState.InsufficientHistory, result.State);
        Assert.Null(result.Baseline.Quantity);
        Assert.Null(result.Delta.QuantityDelta);
        Assert.Null(result.Delta.QuantityPercentChange);
    }

    // ---- averages -----------------------------------------------------------------------------------

    [Fact]
    public void Three_available_months_of_ten_zero_and_twenty_average_to_ten()
    {
        // The middle month exists for the location but holds no line of this product: that is a real zero.
        var result = Compare(
            AnalyticsKind.QuantityComparable, Snapshot(30m), [Snapshot(10m), Snapshot(20m)],
            available: 3, expected: 3);

        Assert.Equal(10m, result.Baseline.Quantity);
        Assert.Equal(20m, result.Delta.QuantityDelta);
    }

    [Fact]
    public void A_whole_location_month_that_is_missing_is_divided_away_not_counted_as_zero()
    {
        // Expected April, May, June; May has no request at all, so the average is over two months, not three.
        var result = Compare(
            AnalyticsKind.QuantityComparable, Snapshot(30m), [Snapshot(10m), Snapshot(20m)],
            available: 2, expected: 3);

        Assert.Equal(15m, result.Baseline.Quantity);
        Assert.Equal(2, result.AvailableBaselinePeriodCount);
        Assert.Equal(3, result.ExpectedBaselinePeriodCount);
    }

    [Theory]
    [InlineData(AnalyticsComparisonBasis.PreviousMonth, 1, "2026-06")]
    [InlineData(AnalyticsComparisonBasis.Previous3MonthAverage, 3, "2026-04")]
    [InlineData(AnalyticsComparisonBasis.Previous6MonthAverage, 6, "2026-01")]
    public void A_baseline_window_ends_the_month_before_the_selected_one(
        AnalyticsComparisonBasis basis, int expectedCount, string expectedFirst)
    {
        var periods = BaselineWindow.PeriodsFor(new DateOnly(2026, 7, 1), basis);

        Assert.Equal(expectedCount, periods.Count);
        Assert.Equal(expectedFirst, AnalyticsPeriod.Format(periods[0]));
        Assert.Equal("2026-06", AnalyticsPeriod.Format(periods[^1]));
        Assert.DoesNotContain(new DateOnly(2026, 7, 1), periods);
    }

    [Fact]
    public void An_available_month_without_the_product_contributes_a_zero_to_the_average()
    {
        // One month of 30 across three available months is an average of 10, not of 30.
        var result = Compare(
            AnalyticsKind.QuantityComparable, Snapshot(30m), [Snapshot(30m)],
            available: 3, expected: 3);

        Assert.Equal(10m, result.Baseline.Quantity);
    }

    // ---- price --------------------------------------------------------------------------------------

    [Fact]
    public void A_weighted_price_follows_the_quantity_not_the_number_of_lines()
    {
        // One unit at 10 and nine at 20 average to 19, never to the 15 a plain mean would give.
        var snapshot = new VariantPeriodSnapshot(Variant, 10m, 2, 2, 0, 0, 10m, (1m * 10m) + (9m * 20m));

        var result = ComparePreviousMonth(current: snapshot, baseline: Snapshot(1m));

        Assert.Equal(19m, result.Current.WeightedUnitPrice);
    }

    [Fact]
    public void Lines_without_a_price_are_left_out_of_the_weighted_price_entirely()
    {
        // 10 units priced at 5, 90 units with no price: the known price is 5, not 0.5.
        var snapshot = new VariantPeriodSnapshot(Variant, 100m, 2, 1, 1, 0, 10m, 50m);

        var result = ComparePreviousMonth(current: snapshot, baseline: Snapshot(1m));

        Assert.Equal(5m, result.Current.WeightedUnitPrice);
        Assert.Equal(100m, result.Current.PriceCoverage.TotalQuantity);
        Assert.Equal(10m, result.Current.PriceCoverage.KnownPriceQuantity);
        Assert.Equal(90m, result.Current.PriceCoverage.MissingPriceQuantity);
    }

    [Fact]
    public void A_product_with_no_price_at_all_has_no_weighted_price_and_no_amount()
    {
        var snapshot = new VariantPeriodSnapshot(Variant, 100m, 3, 0, 3, 0, 0m, 0m);

        var result = ComparePreviousMonth(current: snapshot, baseline: Snapshot(1m));

        Assert.Null(result.Current.WeightedUnitPrice);
        Assert.Null(result.Current.KnownAmount);
        Assert.Equal(PriceCoverageState.Unavailable, result.Current.PriceCoverage.State);
    }

    [Theory]
    [InlineData(100, 0, PriceCoverageState.Complete)]
    [InlineData(60, 40, PriceCoverageState.Partial)]
    [InlineData(0, 100, PriceCoverageState.Unavailable)]
    public void Price_coverage_says_how_much_of_the_quantity_carries_a_price(
        int pricedQuantity, int unpricedQuantity, PriceCoverageState expected)
    {
        var total = pricedQuantity + unpricedQuantity;
        var snapshot = new VariantPeriodSnapshot(
            Variant, total, 2, pricedQuantity > 0 ? 1 : 0, unpricedQuantity > 0 ? 1 : 0, 0, pricedQuantity, pricedQuantity * 3m);

        var result = ComparePreviousMonth(current: snapshot, baseline: Snapshot(1m));

        Assert.Equal(expected, result.Current.PriceCoverage.State);
    }

    [Fact]
    public void A_price_delta_is_the_difference_between_the_two_weighted_prices()
    {
        var current = new VariantPeriodSnapshot(Variant, 10m, 1, 1, 0, 0, 10m, 120m);   // 12.00
        var baseline = new VariantPeriodSnapshot(Variant, 10m, 1, 1, 0, 0, 10m, 100m);  // 10.00

        var result = ComparePreviousMonth(current, baseline);

        Assert.Equal(2m, result.Delta.PriceDelta);
        Assert.Equal(20m, result.Delta.PricePercentChange);
    }

    [Fact]
    public void A_baseline_price_of_zero_gives_a_delta_but_no_percentage()
    {
        var current = new VariantPeriodSnapshot(Variant, 10m, 1, 1, 0, 0, 10m, 50m); // 5.00
        var baseline = new VariantPeriodSnapshot(Variant, 10m, 1, 1, 0, 0, 10m, 0m); // 0.00, a genuinely free line

        var result = ComparePreviousMonth(current, baseline);

        Assert.Equal(5m, result.Delta.PriceDelta);
        Assert.Null(result.Delta.PricePercentChange);
    }

    [Fact]
    public void A_baseline_weighted_price_pools_every_available_month_instead_of_averaging_the_months()
    {
        // 1 unit at 100 one month and 1,000 units at 10 the next: the pooled price is near 10, not 55.
        var months = new[]
        {
            new VariantPeriodSnapshot(Variant, 1m, 1, 1, 0, 0, 1m, 100m),
            new VariantPeriodSnapshot(Variant, 1000m, 1, 1, 0, 0, 1000m, 10_000m),
        };

        var result = Compare(AnalyticsKind.QuantityComparable, Snapshot(1m), months, available: 2, expected: 2);

        Assert.Equal(10.0899m, result.Baseline.WeightedUnitPrice);
    }

    // ---- services -----------------------------------------------------------------------------------

    [Theory]
    [InlineData(AnalyticsUnits.Month)]
    [InlineData(AnalyticsUnits.Time)]
    [InlineData(null)]
    public void A_service_is_never_compared_by_quantity(string? orderUnitCode)
    {
        // "1 month became 2 months" is not a doubling of consumption, so no quantity figure is offered at all.
        Assert.Equal(AnalyticsKind.AmountOrientedService, AnalyticsUnits.KindOf(orderUnitCode));

        var result = ComparePreviousMonth(Snapshot(2m), Snapshot(1m), AnalyticsKind.AmountOrientedService);

        Assert.Equal(ComparisonState.NotComparable, result.State);
        Assert.Null(result.Current.Quantity);
        Assert.Null(result.Baseline.Quantity);
        Assert.Null(result.Delta.QuantityDelta);
        Assert.Null(result.Delta.QuantityPercentChange);
    }

    [Fact]
    public void A_service_is_compared_by_the_money_that_is_known()
    {
        var current = new VariantPeriodSnapshot(Variant, 1m, 1, 1, 0, 0, 1m, 300m);
        var baseline = new VariantPeriodSnapshot(Variant, 1m, 1, 1, 0, 0, 1m, 200m);

        var result = ComparePreviousMonth(current, baseline, AnalyticsKind.AmountOrientedService);

        Assert.Equal(300m, result.Current.KnownAmount);
        Assert.Equal(200m, result.Baseline.KnownAmount);
        Assert.Equal(100m, result.Delta.AmountDelta);
        Assert.Equal(50m, result.Delta.AmountPercentChange);
    }

    [Fact]
    public void A_service_with_no_known_price_has_no_amount_comparison_rather_than_a_zero_one()
    {
        var current = new VariantPeriodSnapshot(Variant, 1m, 1, 0, 1, 0, 0m, 0m);
        var baseline = new VariantPeriodSnapshot(Variant, 1m, 1, 1, 0, 0, 1m, 200m);

        var result = ComparePreviousMonth(current, baseline, AnalyticsKind.AmountOrientedService);

        Assert.Null(result.Current.KnownAmount);
        Assert.Null(result.Delta.AmountDelta);
        Assert.Null(result.Delta.AmountPercentChange);
    }

    [Theory]
    [InlineData("PCS")]
    [InlineData("PACK")]
    [InlineData("KG")]
    [InlineData("M2")]
    public void An_ordinary_order_unit_stays_quantity_comparable(string orderUnitCode)
    {
        Assert.Equal(AnalyticsKind.QuantityComparable, AnalyticsUnits.KindOf(orderUnitCode));
    }

    // ---- aggregation --------------------------------------------------------------------------------

    [Fact]
    public void Several_lines_of_one_variant_in_one_request_are_one_comparison_row()
    {
        // Three separate permanent lines of 5, 10 and 15 are one variant ordering 30 that month.
        var snapshot = new VariantPeriodSnapshot(Variant, 30m, 3, 3, 0, 0, 30m, 300m);

        var result = ComparePreviousMonth(current: snapshot, baseline: Snapshot(30m));

        Assert.Equal(30m, result.Current.Quantity);
        Assert.Equal(3, result.Current.ItemCount);
        Assert.Equal(ComparisonState.Unchanged, result.State);
    }

    [Fact]
    public void Lines_that_look_like_duplicates_are_ordinary_lines_and_are_counted()
    {
        // Task 4 materialized identical rows as two items on purpose; hiding one here would change the numbers.
        var withoutDuplicate = new VariantPeriodSnapshot(Variant, 10m, 1, 1, 0, 0, 10m, 100m);
        var withDuplicate = new VariantPeriodSnapshot(Variant, 20m, 2, 2, 0, 0, 20m, 200m);

        var result = ComparePreviousMonth(current: withDuplicate, baseline: withoutDuplicate);

        Assert.Equal(20m, result.Current.Quantity);
        Assert.Equal(2, result.Current.ItemCount);
        Assert.Equal(ComparisonState.Increased, result.State);
        Assert.Equal(10m, result.Delta.QuantityDelta);
    }

    [Fact]
    public void An_average_keeps_the_precision_quantities_are_stored_with()
    {
        // 10 over three months is 3.333: rounded once, to the scale the domain stores quantities at, so that
        // the delta a caller sees is exactly current minus baseline.
        var result = Compare(
            AnalyticsKind.QuantityComparable, Snapshot(10m), [Snapshot(10m)], available: 3, expected: 3);

        Assert.Equal(3.333m, result.Baseline.Quantity);
        Assert.Equal(6.667m, result.Delta.QuantityDelta);
    }

    [Fact]
    public void A_missing_current_month_and_a_missing_baseline_are_different_answers()
    {
        var notOrderedNow = ComparePreviousMonth(current: null, baseline: Snapshot(5m));
        var noHistory = OrderAnalyticsCalculator.Compare(new VariantComparisonInput(
            Variant, AnalyticsKind.QuantityComparable, Snapshot(5m), [], 0, 1));

        Assert.Equal(ComparisonState.NoLongerOrdered, notOrderedNow.State);
        Assert.Equal(0m, notOrderedNow.Current.Quantity);

        Assert.Equal(ComparisonState.InsufficientHistory, noHistory.State);
        Assert.Null(noHistory.Baseline.Quantity);
    }

    // ---- identity -----------------------------------------------------------------------------------

    [Fact]
    public void The_same_product_in_pieces_and_in_packs_is_two_identities_and_never_one_row()
    {
        // 30 pieces and 30 packs are not the same order, so they can never share a comparison row.
        Assert.NotEqual(
            ProductVariantKey.Create(null, null, null, "PCS"),
            ProductVariantKey.Create(null, null, null, "PACK"));
    }

    [Fact]
    public void A_descriptor_keeps_a_variant_apart_from_the_plain_specification()
    {
        // "28 diş" is a toothing, not a plain 28; comparing the two would compare unlike things.
        Assert.NotEqual(
            ProductVariantKey.Create("28", null, null, "PCS", "diş"),
            ProductVariantKey.Create("28", null, null, "PCS"));

        Assert.NotEqual(
            ProductVariantKey.Create("28", null, null, "PCS", "diş"),
            ProductVariantKey.Create("28", null, null, "PCS", "qat"));
    }

    [Fact]
    public void Two_variants_are_compared_independently_of_each_other()
    {
        var pieces = OrderAnalyticsCalculator.Compare(new VariantComparisonInput(
            1, AnalyticsKind.QuantityComparable, new VariantPeriodSnapshot(1, 30m, 1, 1, 0, 0, 30m, 30m), [], 1, 1));
        var packs = OrderAnalyticsCalculator.Compare(new VariantComparisonInput(
            2, AnalyticsKind.QuantityComparable, null, [new VariantPeriodSnapshot(2, 30m, 1, 1, 0, 0, 30m, 30m)], 1, 1));

        Assert.Equal(ComparisonState.New, pieces.State);
        Assert.Equal(ComparisonState.NoLongerOrdered, packs.State);
        Assert.Equal(30m, pieces.Current.Quantity);
        Assert.Equal(0m, packs.Current.Quantity);
    }

    // ---- helpers ------------------------------------------------------------------------------------

    private static VariantPeriodSnapshot Snapshot(decimal quantity, decimal unitPrice = 1m) =>
        new(Variant, quantity, 1, 1, 0, 0, quantity, quantity * unitPrice);

    /// <summary>Issued from the company's own store: real quantity, no price, and nothing owed.</summary>
    private static VariantPeriodSnapshot InternallySupplied(decimal quantity) =>
        new(Variant, quantity, 1, 0, 0, 1, 0m, 0m);

    private static VariantComparisonResult ComparePreviousMonth(
        VariantPeriodSnapshot? current,
        VariantPeriodSnapshot? baseline,
        AnalyticsKind kind = AnalyticsKind.QuantityComparable) =>
        Compare(kind, current, baseline is null ? [] : [baseline], available: 1, expected: 1);

    private static VariantComparisonResult Compare(
        AnalyticsKind kind,
        VariantPeriodSnapshot? current,
        IReadOnlyList<VariantPeriodSnapshot> baseline,
        int available,
        int expected) =>
        OrderAnalyticsCalculator.Compare(new VariantComparisonInput(Variant, kind, current, baseline, available, expected));
}
