using System.Globalization;

namespace BaxOrders.Application.Analytics;

/// <summary>
/// What a selected month is compared against. Every basis is a <b>calendar</b> window that ends with the month
/// before the selected one and never contains the selected month itself.
/// </summary>
public enum AnalyticsComparisonBasis
{
    /// <summary>The single calendar month before the selected one.</summary>
    PreviousMonth = 1,

    /// <summary>The three calendar months before the selected one, averaged.</summary>
    Previous3MonthAverage = 2,

    /// <summary>The six calendar months before the selected one, averaged.</summary>
    Previous6MonthAverage = 3,
}

/// <summary>
/// Whether a variant's quantities may be compared at all.
/// </summary>
/// <remarks>
/// A service billed per month or per occasion does not consume material: "1 month → 2 months" is not a 100%
/// rise in consumption, so its quantity is deliberately left out of quantity analytics and its money is
/// compared instead. See <see cref="AnalyticsUnits"/> for which units mean that.
/// </remarks>
public enum AnalyticsKind
{
    /// <summary>An ordinary material variant with a physical order unit: quantities are comparable.</summary>
    QuantityComparable = 1,

    /// <summary>A service-like variant: only its money is comparable.</summary>
    AmountOrientedService = 2,
}

/// <summary>How a variant's quantity moved between the baseline and the selected month.</summary>
public enum ComparisonState
{
    /// <summary>Not ordered in any available baseline month, ordered now.</summary>
    New = 1,

    /// <summary>Ordered in the baseline, not ordered now.</summary>
    NoLongerOrdered = 2,

    Increased = 3,

    Decreased = 4,

    Unchanged = 5,

    /// <summary>A service-like variant, whose quantity is not a comparable figure.</summary>
    NotComparable = 6,

    /// <summary>No baseline month of the window has a request for this location, so there is nothing to compare against.</summary>
    InsufficientHistory = 7,
}

/// <summary>How much of a side's quantity carries a known price.</summary>
public enum PriceCoverageState
{
    /// <summary>Every unit of the side's quantity has a price.</summary>
    Complete = 1,

    /// <summary>Some of the quantity is priced and some is not; money figures are partial.</summary>
    Partial = 2,

    /// <summary>No priced quantity at all: money figures are unknown, not zero.</summary>
    Unavailable = 3,
}

/// <summary>
/// The order units that mean "this line is a service, not material".
/// </summary>
/// <remarks>
/// Confirmed with the business in Tasks 3G and 4: <c>MONTH</c> ("ay") is a monthly billing period, <c>TIME</c>
/// ("dəfə") is an occasion, and a variant may legitimately carry no order unit at all. None of the three is a
/// quantity of material.
/// </remarks>
public static class AnalyticsUnits
{
    public const string Month = "MONTH";
    public const string Time = "TIME";

    /// <summary>A variant with no order unit, or with a service unit, is compared by money.</summary>
    public static AnalyticsKind KindOf(string? orderUnitCode) =>
        orderUnitCode is null || orderUnitCode == Month || orderUnitCode == Time
            ? AnalyticsKind.AmountOrientedService
            : AnalyticsKind.QuantityComparable;
}

/// <summary>The calendar months one basis looks at.</summary>
public static class BaselineWindow
{
    /// <summary>How many calendar months the basis expects.</summary>
    public static int ExpectedPeriodCount(AnalyticsComparisonBasis basis) => basis switch
    {
        AnalyticsComparisonBasis.PreviousMonth => 1,
        AnalyticsComparisonBasis.Previous3MonthAverage => 3,
        AnalyticsComparisonBasis.Previous6MonthAverage => 6,
        _ => throw new ArgumentOutOfRangeException(nameof(basis), basis, "Unknown comparison basis."),
    };

    /// <summary>
    /// The calendar months of the window, oldest first. For 2026-07 the three-month window is
    /// 2026-04, 2026-05, 2026-06 — the selected month is never part of its own baseline.
    /// </summary>
    public static IReadOnlyList<DateOnly> PeriodsFor(DateOnly currentPeriod, AnalyticsComparisonBasis basis)
    {
        var count = ExpectedPeriodCount(basis);
        var periods = new DateOnly[count];
        for (var offset = 0; offset < count; offset++)
        {
            periods[offset] = currentPeriod.AddMonths(offset - count);
        }

        return periods;
    }
}

/// <summary>
/// Months travel through the analytics API as <c>yyyy-MM</c>, because a request is for a month and never for a
/// day. Parsing is explicit rather than culture-dependent, so the same text means the same month everywhere.
/// </summary>
public static class AnalyticsPeriod
{
    public static bool TryParse(string? value, out DateOnly period)
    {
        period = default;
        if (value is not { Length: 7 } text || text[4] != '-')
        {
            return false;
        }

        if (!int.TryParse(text[..4], NumberStyles.None, CultureInfo.InvariantCulture, out var year)
            || !int.TryParse(text[5..], NumberStyles.None, CultureInfo.InvariantCulture, out var month)
            || year < 1 || year > 9999 || month < 1 || month > 12)
        {
            return false;
        }

        period = new DateOnly(year, month, 1);
        return true;
    }

    public static string Format(DateOnly period) => period.ToString("yyyy-MM", CultureInfo.InvariantCulture);
}
