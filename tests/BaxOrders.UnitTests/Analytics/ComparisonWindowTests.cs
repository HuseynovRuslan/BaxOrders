using BaxOrders.Application.Analytics;
using BaxOrders.Application.Common;

namespace BaxOrders.UnitTests.Analytics;

/// <summary>
/// Which months a comparison is against.
/// </summary>
/// <remarks>
/// Three of the five bases are the calendar and nothing else. The other two are not: "every prior month" is
/// however many months the company turns out to have, and a hand-picked range is whatever somebody picked —
/// and both of those can be got wrong in ways that quietly change every figure on the screen. The one rule
/// that holds across all five is that the selected month is never part of its own baseline.
/// </remarks>
public sealed class ComparisonWindowTests
{
    private static readonly DateOnly July = new(2026, 7, 1);

    // ---- the fixed windows ---------------------------------------------------------------------------

    [Fact]
    public void The_previous_month_is_the_one_calendar_month_before()
    {
        var window = BaselineWindow.PeriodsFor(July, AnalyticsComparisonBasis.PreviousMonth);

        Assert.Equal([new DateOnly(2026, 6, 1)], window);
    }

    [Fact]
    public void A_fixed_window_ends_on_the_month_before_and_never_contains_the_selected_one()
    {
        var window = BaselineWindow.PeriodsFor(July, AnalyticsComparisonBasis.Previous3MonthAverage);

        Assert.Equal([new DateOnly(2026, 4, 1), new DateOnly(2026, 5, 1), new DateOnly(2026, 6, 1)], window);
        Assert.DoesNotContain(July, window);
    }

    [Fact]
    public void A_fixed_window_crosses_the_year_boundary_by_the_calendar()
    {
        var window = BaselineWindow.PeriodsFor(new DateOnly(2026, 1, 1), AnalyticsComparisonBasis.Previous3MonthAverage);

        Assert.Equal([new DateOnly(2025, 10, 1), new DateOnly(2025, 11, 1), new DateOnly(2025, 12, 1)], window);
    }

    // ---- every prior month ---------------------------------------------------------------------------

    /// <summary>
    /// The window is the company's own history, so it has to be given. A month nobody ordered in anywhere is
    /// not history the reader is missing, so it is not in the window and does not make an object look partial.
    /// </summary>
    [Fact]
    public void Every_prior_month_is_the_months_the_company_has_orders_for()
    {
        var company = new[]
        {
            new DateOnly(2026, 1, 1), new DateOnly(2026, 2, 1), new DateOnly(2026, 5, 1),
            new DateOnly(2026, 6, 1), July, new DateOnly(2026, 8, 1),
        };

        var window = BaselineWindow.PeriodsFor(
            July, ComparisonSelection.Of(AnalyticsComparisonBasis.AllPriorMonths), company);

        // March and April are absent because nobody ordered in them; July and August because they are not prior.
        Assert.Equal(
            [new DateOnly(2026, 1, 1), new DateOnly(2026, 2, 1), new DateOnly(2026, 5, 1), new DateOnly(2026, 6, 1)],
            window);
    }

    [Fact]
    public void Every_prior_month_is_empty_when_the_selected_month_is_the_first_one()
    {
        var window = BaselineWindow.PeriodsFor(
            July, ComparisonSelection.Of(AnalyticsComparisonBasis.AllPriorMonths), [July, new DateOnly(2026, 8, 1)]);

        Assert.Empty(window);
    }

    [Fact]
    public void Every_prior_month_has_to_be_told_which_months_exist()
    {
        Assert.True(BaselineWindow.NeedsCompanyPeriods(AnalyticsComparisonBasis.AllPriorMonths));
        Assert.False(BaselineWindow.NeedsCompanyPeriods(AnalyticsComparisonBasis.Previous6MonthAverage));
        Assert.Throws<ArgumentNullException>(() => BaselineWindow.PeriodsFor(
            July, ComparisonSelection.Of(AnalyticsComparisonBasis.AllPriorMonths)));
    }

    // ---- a hand-picked range -------------------------------------------------------------------------

    [Fact]
    public void A_custom_range_is_every_month_from_the_first_to_the_last()
    {
        var selection = ComparisonSelection.Of(
            AnalyticsComparisonBasis.CustomRange, new DateOnly(2026, 1, 1), new DateOnly(2026, 5, 1), July);

        Assert.Equal(
            [
                new DateOnly(2026, 1, 1), new DateOnly(2026, 2, 1), new DateOnly(2026, 3, 1),
                new DateOnly(2026, 4, 1), new DateOnly(2026, 5, 1),
            ],
            BaselineWindow.PeriodsFor(July, selection));
    }

    [Fact]
    public void A_custom_range_of_one_month_is_that_month()
    {
        var march = new DateOnly(2026, 3, 1);
        var selection = ComparisonSelection.Of(AnalyticsComparisonBasis.CustomRange, march, march, July);

        Assert.Equal([march], BaselineWindow.PeriodsFor(July, selection));
    }

    /// <summary>
    /// A month nobody ordered in stays in a hand-picked window. The reader asked for these months by name, so
    /// an empty one is history they are missing rather than a month to quietly drop from the divisor.
    /// </summary>
    [Fact]
    public void A_custom_range_keeps_a_month_the_company_did_not_order_in()
    {
        var selection = ComparisonSelection.Of(
            AnalyticsComparisonBasis.CustomRange, new DateOnly(2026, 2, 1), new DateOnly(2026, 4, 1), July);

        Assert.Equal(3, BaselineWindow.PeriodsFor(July, selection).Count);
    }

    // ---- what a custom range may not be --------------------------------------------------------------

    [Fact]
    public void A_custom_range_must_end_before_the_month_being_looked_at()
    {
        Assert.Throws<ValidationException>(() => ComparisonSelection.Of(
            AnalyticsComparisonBasis.CustomRange, new DateOnly(2026, 5, 1), July, July));

        Assert.Throws<ValidationException>(() => ComparisonSelection.Of(
            AnalyticsComparisonBasis.CustomRange, new DateOnly(2026, 8, 1), new DateOnly(2026, 9, 1), July));
    }

    [Fact]
    public void A_custom_range_must_not_be_inverted()
    {
        Assert.Throws<ValidationException>(() => ComparisonSelection.Of(
            AnalyticsComparisonBasis.CustomRange, new DateOnly(2026, 5, 1), new DateOnly(2026, 2, 1), July));
    }

    [Fact]
    public void A_custom_range_needs_both_of_its_months()
    {
        Assert.Throws<ValidationException>(() => ComparisonSelection.Of(
            AnalyticsComparisonBasis.CustomRange, new DateOnly(2026, 5, 1), null, July));

        Assert.Throws<ValidationException>(() => ComparisonSelection.Of(
            AnalyticsComparisonBasis.CustomRange, null, null, July));
    }

    /// <summary>
    /// Silently ignoring them would leave a screen showing two months it is not using, which is the kind of
    /// wrong that nobody notices until a decision has been made on it.
    /// </summary>
    [Fact]
    public void Months_sent_with_any_other_basis_are_refused_rather_than_ignored()
    {
        Assert.Throws<ValidationException>(() => ComparisonSelection.Of(
            AnalyticsComparisonBasis.PreviousMonth, new DateOnly(2026, 5, 1), new DateOnly(2026, 6, 1), July));
    }

    [Fact]
    public void A_basis_that_needs_no_months_is_accepted_without_them()
    {
        var selection = ComparisonSelection.Of(AnalyticsComparisonBasis.Previous6MonthAverage, null, null, July);

        Assert.Equal(AnalyticsComparisonBasis.Previous6MonthAverage, selection.Basis);
        Assert.Null(selection.CustomStart);
        Assert.Null(selection.CustomEnd);
    }
}
