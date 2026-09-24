using System.Globalization;
using BaxOrders.Application.Common;

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

    /// <summary>
    /// Every month the company has orders for before the selected one, averaged.
    /// </summary>
    /// <remarks>
    /// The window is the company's own history rather than a fixed count, so it cannot be worked out from the
    /// calendar alone. A month nobody ordered in anywhere is not part of it, and a location that did not order
    /// in one of its months is divided by the months it has, never by the months it is missing.
    /// </remarks>
    AllPriorMonths = 4,

    /// <summary>Calendar months the reader chose, averaged. All of them lie before the selected month.</summary>
    CustomRange = 5,
}

/// <summary>
/// What a month is compared against, including the months a reader chose by hand.
/// </summary>
/// <remarks>
/// The basis alone stopped being enough once the reader could pick the window: a custom range carries two more
/// facts, and passing three loose values around invites two of them to travel without the third. Everything
/// that resolves a window takes one of these.
/// </remarks>
public sealed record ComparisonSelection
{
    private ComparisonSelection(AnalyticsComparisonBasis basis, DateOnly? customStart, DateOnly? customEnd)
    {
        Basis = basis;
        CustomStart = customStart;
        CustomEnd = customEnd;
    }

    public AnalyticsComparisonBasis Basis { get; }

    /// <summary>The first month of a hand-picked range; null for every other basis.</summary>
    public DateOnly? CustomStart { get; }

    /// <summary>The last month of a hand-picked range; null for every other basis.</summary>
    public DateOnly? CustomEnd { get; }

    public static ComparisonSelection Of(AnalyticsComparisonBasis basis) => new(basis, null, null);

    /// <summary>
    /// A selection, with the two custom months checked against the month being looked at.
    /// </summary>
    /// <remarks>
    /// The months are validated here rather than at each caller, because "before the selected month" is the one
    /// rule that makes the comparison mean anything: a window containing the current month would compare it
    /// with itself, and a window after it would compare it with its own future.
    /// </remarks>
    /// <exception cref="ValidationException">The range is absent, inverted, or not before <paramref name="currentPeriod"/>.</exception>
    public static ComparisonSelection Of(
        AnalyticsComparisonBasis basis, DateOnly? customStart, DateOnly? customEnd, DateOnly currentPeriod)
    {
        if (basis is not AnalyticsComparisonBasis.CustomRange)
        {
            // Quietly dropping them would leave a screen showing months that are not being used.
            if (customStart is not null || customEnd is not null)
            {
                throw new ValidationException(
                    "'customStart' and 'customEnd' apply only to the custom comparison range.");
            }

            return Of(basis);
        }

        if (customStart is not { } start || customEnd is not { } end)
        {
            throw new ValidationException(
                "A custom comparison needs both 'customStart' and 'customEnd' as months in the form yyyy-MM.");
        }

        if (start > end)
        {
            throw new ValidationException("'customStart' must not be after 'customEnd'.");
        }

        if (end >= currentPeriod)
        {
            throw new ValidationException(
                "A custom comparison range must end before the month being looked at.");
        }

        return new ComparisonSelection(basis, start, end);
    }
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
    /// <summary>How many calendar months a fixed-length basis expects; null for the two that depend on more than the calendar.</summary>
    public static int? FixedPeriodCount(AnalyticsComparisonBasis basis) => basis switch
    {
        AnalyticsComparisonBasis.PreviousMonth => 1,
        AnalyticsComparisonBasis.Previous3MonthAverage => 3,
        AnalyticsComparisonBasis.Previous6MonthAverage => 6,
        AnalyticsComparisonBasis.AllPriorMonths => null,
        AnalyticsComparisonBasis.CustomRange => null,
        _ => throw new ArgumentOutOfRangeException(nameof(basis), basis, "Unknown comparison basis."),
    };

    /// <summary>Whether resolving this basis needs to be told which months the company has orders for.</summary>
    public static bool NeedsCompanyPeriods(AnalyticsComparisonBasis basis) =>
        basis is AnalyticsComparisonBasis.AllPriorMonths;

    /// <summary>
    /// The calendar months of the window, oldest first. For 2026-07 the three-month window is
    /// 2026-04, 2026-05, 2026-06 — the selected month is never part of its own baseline.
    /// </summary>
    /// <param name="companyPeriods">
    /// Every month the company has an order for. Required by <see cref="AnalyticsComparisonBasis.AllPriorMonths"/>
    /// and ignored otherwise: a month nobody ordered in anywhere is not history the reader is missing, so it is
    /// not part of the window and does not turn a complete object into a partial one.
    /// </param>
    public static IReadOnlyList<DateOnly> PeriodsFor(
        DateOnly currentPeriod,
        ComparisonSelection selection,
        IEnumerable<DateOnly>? companyPeriods = null)
    {
        ArgumentNullException.ThrowIfNull(selection);

        if (selection.Basis is AnalyticsComparisonBasis.AllPriorMonths)
        {
            ArgumentNullException.ThrowIfNull(companyPeriods);
            return [.. companyPeriods.Where(period => period < currentPeriod).Distinct().Order()];
        }

        if (selection.Basis is AnalyticsComparisonBasis.CustomRange)
        {
            // Every month of the chosen range, whether or not anybody ordered in it: the reader asked for these
            // months by name, so a month with no order is history they are missing rather than a month to drop.
            var start = selection.CustomStart
                ?? throw new ArgumentException("A custom range needs both months.", nameof(selection));
            var end = selection.CustomEnd
                ?? throw new ArgumentException("A custom range needs both months.", nameof(selection));

            var months = new List<DateOnly>();
            for (var period = start; period <= end; period = period.AddMonths(1))
            {
                months.Add(period);
            }

            return months;
        }

        var count = FixedPeriodCount(selection.Basis)
            ?? throw new ArgumentOutOfRangeException(nameof(selection), selection.Basis, "Unknown comparison basis.");
        var periods = new DateOnly[count];
        for (var offset = 0; offset < count; offset++)
        {
            periods[offset] = currentPeriod.AddMonths(offset - count);
        }

        return periods;
    }

    /// <summary>The same window, for a basis that needs nothing but the calendar.</summary>
    public static IReadOnlyList<DateOnly> PeriodsFor(DateOnly currentPeriod, AnalyticsComparisonBasis basis) =>
        PeriodsFor(currentPeriod, ComparisonSelection.Of(basis));
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

    /// <summary>A month from the query string, or null when it was not given.</summary>
    /// <exception cref="ValidationException">It was given and is not a month.</exception>
    public static DateOnly? ParseOptional(string? value, string name) => value is null or ""
        ? null
        : TryParse(value, out var period)
            ? period
            : throw new ValidationException($"'{name}' must be a month in the form yyyy-MM (got '{value}').");

    public static string Format(DateOnly period) => period.ToString("yyyy-MM", CultureInfo.InvariantCulture);
}
