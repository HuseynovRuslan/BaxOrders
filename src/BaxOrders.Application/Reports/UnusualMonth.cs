using BaxOrders.Application.Analytics;
using BaxOrders.Application.Common;

namespace BaxOrders.Application.Reports;

/// <summary>How a month compares with the location's three previous months that have a known amount (owner decision 8.2).</summary>
/// <param name="RecentAverage">
/// The three months' average, to the qəpik. Null when there are fewer than three to average, or no amount to set
/// against it.
/// </param>
/// <param name="RecentAveragePercent">
/// The month against that average, to the two places the screen prints. Null when the average is 0.
/// </param>
/// <param name="IsUnusual">More than ±50% from the average. Never true without three months to average.</param>
public sealed record UnusualMonthResult(decimal? RecentAverage, decimal? RecentAveragePercent, bool IsUnusual);

/// <summary>
/// Whether a month of a location stands out from its own recent months, so the monthly report can mark it without
/// the reader having to compare every figure in the row (owner decision 8.2).
/// </summary>
/// <remarks>
/// <para>
/// <b>Three available months, not three calendar months.</b> A month the location did not order in is skipped,
/// however many there are, and so is one whose every line is unpriced: that month's money is unknown, not zero,
/// and averaging it as zero would make the next ordinary month look like a leap. The look-back does not stop at
/// January — a location's history does not restart with the year.
/// </para>
/// <para>
/// <b>Fewer than three, no verdict.</b> Two months are not a pattern to stand out from.
/// </para>
/// <para>
/// <b>Decided on the figures the reader sees.</b> The average is rounded to the qəpik before the percentage is
/// taken, and the percentage to the two places the report prints before the ±50% test, so a cell that says "+50%"
/// is never marked and the average in its description is the one the percentage was computed from.
/// </para>
/// </remarks>
public static class UnusualMonth
{
    /// <summary>How many earlier months the average is taken over.</summary>
    public const int RecentMonthCount = 3;

    /// <summary>A month further than this from its recent average, in percent, is unusual. Exactly this is not.</summary>
    public const decimal Threshold = 50m;

    /// <summary>The places a percentage is printed to on the report.</summary>
    public const int PrintedPercentScale = 2;

    /// <param name="amount">The month's known amount, as the cell shows it.</param>
    /// <param name="previousAmounts">The known amounts of the location's earlier available months, oldest first.</param>
    public static UnusualMonthResult Of(decimal? amount, IReadOnlyList<decimal> previousAmounts)
    {
        ArgumentNullException.ThrowIfNull(previousAmounts);

        if (amount is not { } current || previousAmounts.Count < RecentMonthCount)
        {
            return new UnusualMonthResult(null, null, false);
        }

        var recent = 0m;
        for (var index = previousAmounts.Count - RecentMonthCount; index < previousAmounts.Count; index++)
        {
            recent += previousAmounts[index];
        }

        var average = Money.RoundCents(recent / RecentMonthCount);

        // The one percentage rule, then the two places the screen prints, so that the verdict is taken on exactly
        // the figure the reader sees: "+50%" is never marked, "+50,01%" always is.
        var percent = OrderAnalyticsCalculator.PercentChange(current, average) is { } exact
            ? Math.Round(exact, PrintedPercentScale, MidpointRounding.AwayFromZero)
            : (decimal?)null;

        return new UnusualMonthResult(average, percent, percent is { } value && Math.Abs(value) > Threshold);
    }
}
