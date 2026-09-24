namespace BaxOrders.Application.Analytics.Dashboard;

/// <summary>
/// How much of a location's baseline window actually exists.
/// </summary>
/// <remarks>
/// This is about <b>months</b>, never about products: it says how many of the calendar months the basis asked
/// for have a request for this location, and nothing about what was in them. For the previous-month basis one
/// month is asked for, so only <see cref="Complete"/> and <see cref="Unavailable"/> can occur.
/// </remarks>
public enum HistoryCoverageState
{
    /// <summary>Every month the basis asked for has a request.</summary>
    Complete = 1,

    /// <summary>Some months of the window have a request and some do not; the average is of the ones that do.</summary>
    Partial = 2,

    /// <summary>Not one month of the window has a request, so there is nothing to compare against.</summary>
    Unavailable = 3,
}

/// <summary>
/// Why a location can or cannot be compared this month. The three cases are deliberately separate: they are
/// three different facts about the object, and collapsing any two of them would misreport it.
/// </summary>
public enum ComparisonAvailability
{
    /// <summary>The location has a request this month and at least one baseline month to compare it with.</summary>
    Available = 1,

    /// <summary>The location has ordered before but has no request for the selected month at all.</summary>
    NoCurrentRequest = 2,

    /// <summary>The location has a request this month, but no month of the window to compare it against.</summary>
    NoBaselineHistory = 3,
}

/// <summary>
/// Why an object was put in front of the reader. Every one of these is a fact the data states, not a verdict:
/// there is no score, no threshold anybody tuned, and nothing here calls an object good or bad.
/// </summary>
/// <remarks>
/// The three movement reasons are orderings, and a card carries its place in its own one
/// (<see cref="DashboardAttentionDto.Rank"/>), so its title can say "the largest" only of the object that is.
/// </remarks>
public enum DashboardAttentionReason
{
    /// <summary>It is among the objects that moved the most money upward this month.</summary>
    LargestIncrease = 1,

    /// <summary>It is among the objects that moved the most money downward this month.</summary>
    LargestDecrease = 2,

    /// <summary>It moved by a large share of a baseline that is real enough to divide by.</summary>
    StrongPercentageChange = 3,

    /// <summary>Somebody owes a price on it, so its money is not the whole story.</summary>
    MissingRequiredPrice = 4,

    /// <summary>It ordered this month with nothing behind it to compare against.</summary>
    NoComparisonHistory = 5,
}

/// <summary>
/// What the dashboard rows may be ordered by. Every option is a plain fact about the row.
/// </summary>
/// <remarks>
/// There is no "biggest riser" or "worst object" here. A rise in what an object ordered may be a new project,
/// a restocking, seasonal work or waste; the dashboard reports the number and leaves the reading of it to the
/// people who know the object. The API's default is the location name, which asserts nothing; the dashboard
/// page asks for <see cref="AbsoluteKnownAmountDelta"/> instead, because the first question on it is which
/// object's money moved the most, in either direction.
/// </remarks>
public enum DashboardSort
{
    LocationName = 1,
    CurrentKnownAmount = 2,
    KnownAmountDelta = 3,
    KnownAmountPercentChange = 4,
    MissingPriceItemCount = 5,
    HistoryCoverage = 6,
    NewVariantCount = 7,
    IncreasedVariantCount = 8,
    DecreasedVariantCount = 9,
    CurrentItemCount = 10,

    /// <summary>
    /// The size of the money difference whichever way it went, so a fall of 8.000 ₼ comes before a rise of
    /// 5.000 ₼. <see cref="KnownAmountDelta"/> keeps its signed meaning for the links that already use it.
    /// </summary>
    AbsoluteKnownAmountDelta = 11,
}
