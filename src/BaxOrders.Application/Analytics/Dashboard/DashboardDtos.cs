using BaxOrders.Application.Decisions;
using BaxOrders.Application.Imports;
using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Analytics.Dashboard;

/// <summary>A month the company has permanent orders for, with how much of the company ordered in it.</summary>
public sealed record DashboardPeriodDto(
    DateOnly Period,
    int LocationCount,
    int RequestCount,
    int ItemCount);

public sealed record DashboardPeriodsDto(IReadOnlyList<DashboardPeriodDto> Periods);

/// <summary>Money on one side, with the coverage that says how much of it is actually known.</summary>
/// <param name="KnownAmount">
/// <c>SUM(Quantity × UnitPrice)</c> over the priced lines only, and null when nothing is priced. For a
/// baseline window of several months it is the money of an <b>average</b> month, not the total of the window.
/// </param>
/// <param name="MissingPriceItemCount">
/// Lines somebody still has to price. Internally supplied lines are <b>not</b> here — they are counted in
/// <c>PriceNotRequiredItemCount</c> and are not a shortfall.
/// </param>
/// <param name="PriceNotRequiredItemCount">
/// Lines issued from the company's own store. Neutral context; never a warning.
/// </param>
/// <param name="IsComplete">
/// False as soon as one line that was <b>supposed</b> to carry a price has none. A line supplied internally
/// never makes it false — nothing about it is missing. The money is then what is known, not what was spent,
/// and must be labelled as such. It describes a money figure, so it says nothing where there is none: for a
/// location with no request this month it is vacuously true beside a null amount, and the caller reads
/// <c>HasCurrentRequest</c> first.
/// </param>
public sealed record DashboardAmountDto(
    decimal? KnownAmount,
    int ItemCount,
    int KnownPriceItemCount,
    int MissingPriceItemCount,
    int PriceNotRequiredItemCount,
    bool IsComplete);

/// <summary>
/// The selected month's money split by what kind of demand each line was.
/// </summary>
/// <remarks>
/// <para>
/// Three populations that do not overlap and together are the whole month, so the figures reconcile against
/// <see cref="ManagementDashboardSummaryDto.Current"/> by addition and nobody has to take the split on trust.
/// </para>
/// <para>
/// Unclassified is kept apart rather than folded into either. It is not a third kind of demand; it is the
/// absence of an answer, and a reader who sees it as its own line knows exactly how much of the month is
/// still unaccounted for.
/// </para>
/// </remarks>
/// <param name="UnclassifiedItemCount">
/// Lines nobody has classified. Shown as a neutral note, never as an error: the months before this column
/// existed are full of them and browsing that history is not a fault.
/// </param>
public sealed record DashboardLineTypeSplitDto(
    DashboardAmountDto Monthly,
    DashboardAmountDto OutsideMonthly,
    DashboardAmountDto Unclassified,
    int UnclassifiedItemCount);

/// <summary>
/// One month of the company, in the scope the screen is about.
/// </summary>
/// <remarks>
/// This is the whole company and not the cohort: it answers "is this month unusual for us", a question about
/// the shape of a year rather than about one comparison, and narrowing it to the objects that happen to be
/// comparable this month would make each point mean something different from the one beside it.
/// </remarks>
/// <param name="KnownAmount">
/// Money over the priced lines of the month, rounded per object exactly as everywhere else. Null where nothing
/// in the month is priced — a month whose prices have not been entered is not a month of zero.
/// </param>
/// <param name="LocationCount">
/// How many objects ordered in that month at all, in this scope. A line that climbs because the company took
/// on more objects is a different fact from one that climbs because each object ordered more, and the reader
/// can only tell them apart if this is here.
/// </param>
/// <param name="MissingPriceItemCount">
/// Lines somebody still owes a price for. A point standing on them is lower than the month really was, and
/// the screen says so rather than drawing it as settled.
/// </param>
public sealed record DashboardTrendPointDto(
    DateOnly Period,
    decimal? KnownAmount,
    int LocationCount,
    int MissingPriceItemCount);

/// <summary>What one location's selected month looks like beside its own history.</summary>
/// <param name="HasCurrentRequest">
/// False for an object that has ordered before but not this month. Its current money stays null: an object
/// that did not order is not an object that ordered nothing.
/// </param>
/// <param name="DeepLinkPeriod">
/// The month and basis a caller needs to open this same comparison in the location analytics screen. The
/// backend returns the values, never a front-end URL.
/// </param>
/// <summary>One share of a location's money difference, from the shared cause decomposition.</summary>
public sealed record DashboardCauseDto(CauseCategory Category, decimal Amount, int VariantCount);

/// <summary>The product that did most of the primary cause, with the movement in its direction it is a share of.</summary>
/// <param name="Amount">The product's whole contribution, to the cent: its row in the order page's "Əsas dəyişikliklər".</param>
/// <param name="SameDirectionAmount">
/// Every product's contribution in the same direction, across every cause (7.1, 7.1a). The share is
/// <paramref name="Amount"/> over this, and never passes 100%.
/// </param>
public sealed record DashboardCauseProductDto(
    long ProductVariantId, string ProductName, decimal Amount, decimal SameDirectionAmount);

/// <param name="Location">The whole row, so the section can be drawn without hunting for it in the page.</param>
/// <param name="Rank">
/// The object's place, from 1, in its reason's own ordering over every object that qualifies for that reason —
/// counted before any object is set aside for having a card under an earlier reason. Rank 1 is the largest.
/// </param>
/// <param name="AlsoFirstIn">
/// The other movement reasons (largest increase, largest decrease, largest percentage) in which this object is
/// rank 1, so a largest figure is never hidden behind another card's title.
/// </param>
public sealed record DashboardAttentionDto(
    DashboardAttentionReason Reason, LocationDashboardRowDto Location,
    int Rank, IReadOnlyList<DashboardAttentionReason> AlsoFirstIn);

public sealed record LocationDashboardRowDto(
    int LocationId,
    string LocationCode,
    string LocationName,
    bool HasCurrentRequest,
    long? CurrentRequestId,
    int? CurrentVersion,
    OrderRequestStatus? CurrentStatus,
    DashboardAmountDto Current,
    PriceCoverageState? CurrentPriceCoverage,
    int ExpectedBaselinePeriodCount,
    int AvailableBaselinePeriodCount,
    IReadOnlyList<DateOnly> MissingBaselinePeriods,
    IReadOnlyList<PeriodRequestDto> BaselinePeriods,
    DashboardAmountDto Baseline,
    decimal? KnownAmountDelta,
    decimal? KnownAmountPercentChange,
    HistoryCoverageState HistoryCoverage,
    ComparisonAvailability ComparisonAvailability,
    bool ComparisonAvailable,
    int NewVariantCount,
    int IncreasedVariantCount,
    int DecreasedVariantCount,
    int UnchangedVariantCount,
    int NoLongerOrderedVariantCount,
    int InsufficientHistoryVariantCount,
    int NotComparableVariantCount,
    int QuantityComparableVariantCount,
    int AmountOrientedServiceCount,
    int ComparedVariantCount,
    DateOnly DeepLinkPeriod,
    AnalyticsComparisonBasis DeepLinkBasis,
    DateOnly? DeepLinkCustomStart,
    DateOnly? DeepLinkCustomEnd,
    IReadOnlyList<DashboardCauseDto> Causes,
    CauseCategory? PrimaryCause,
    decimal? PrimaryCauseAmount,
    /// <summary>The product behind the primary cause; null when there is no primary cause or no product moving its way.</summary>
    DashboardCauseProductDto? PrimaryCauseProduct,
    bool ExplanationIsComplete,
    decimal UnattributedAmount,
    /// <summary>Products this object paid for in one of the two months and had supplied internally in the other.</summary>
    int SupplyChangedVariantCount);

/// <summary>
/// The company's selected month.
/// </summary>
/// <remarks>
/// Every count here describes the <b>whole</b> dashboard — every location in the universe for this month and
/// basis — regardless of any search or filter the caller applied to the rows. The filtered view is described
/// by <see cref="ManagementDashboardDto.Rows"/> and its total count instead.
/// <para>
/// There is no total quantity, because there is no unit in which to express one: adding pieces of glove to
/// square metres of tile would produce a number that means nothing. Quantity is compared inside a variant.
/// </para>
/// </remarks>
/// <param name="BaselinePeriods">
/// The months the comparison window covers, oldest first, whether or not anybody ordered in them. This is what
/// the screen names its basis from: "every prior month" and a hand-picked range cannot be worked out from
/// <paramref name="Basis"/> and <paramref name="SelectedPeriod"/> alone.
/// </param>
/// <param name="Current">
/// The whole month's money: every object that ordered, whether or not it can be compared with anything. This
/// is what the company spent, and it does not move when the reader changes the comparison basis.
/// </param>
/// <param name="LineTypes">
/// The same month split into monthly, outside-monthly and unclassified. Every comparison figure beside it is
/// about monthly lines alone (<see cref="MonthlyComparisonPopulation"/>); this is where the rest of the month
/// is accounted for.
/// </param>
/// <param name="ComparedCurrent">
/// The same month, restricted to the cohort — the objects that also have a baseline. This is the figure
/// <paramref name="Baseline"/> is beside and <paramref name="KnownAmountDelta"/> is the difference of. It
/// equals <paramref name="Current"/> whenever every object that ordered can be compared, which is the ordinary
/// case; when it does not, the screen shows both so that nobody has to guess which one moved.
/// </param>
/// <param name="Baseline">
/// The cohort's average baseline month. Never "the baseline of every object that has history": that would be a
/// total over a different set of objects than <paramref name="ComparedCurrent"/>, and their difference would
/// be part change in spending and part change in membership.
/// </param>
/// <param name="Partition">
/// Every object in the catalogue, in one of four named groups, so the cohort can be reconciled against the
/// company rather than taken on trust. See <see cref="PortfolioCohort"/> for the rule.
/// </param>
public sealed record ManagementDashboardSummaryDto(
    DateOnly SelectedPeriod,
    AnalyticsComparisonBasis Basis,
    IReadOnlyList<DateOnly> BaselinePeriods,
    int LocationCount,
    int LocationsWithCurrentRequest,
    int LocationsWithoutCurrentRequest,
    int CurrentRequestCount,
    DashboardAmountDto Current,
    DashboardAmountDto ComparedCurrent,
    DashboardAmountDto Baseline,
    decimal? KnownAmountDelta,
    decimal? KnownAmountPercentChange,
    DashboardPartitionDto Partition,
    int LocationsWithMissingPrices,
    int LocationsWithCompleteHistory,
    int LocationsWithPartialHistory,
    int LocationsWithNoBaselineHistory,
    int LocationsWithComparison,
    int NewVariantCount,
    int IncreasedVariantCount,
    int DecreasedVariantCount,
    int UnchangedVariantCount,
    int NoLongerOrderedVariantCount,
    int InsufficientHistoryVariantCount,
    int AmountOrientedServiceCount,
    DashboardLineTypeSplitDto LineTypes,
    IReadOnlyList<DashboardTrendPointDto> Trend);

/// <param name="FilteredLocationCount">
/// How many locations the search and filters left. The summary above is unaffected by them.
/// </param>
/// <param name="Attention">
/// A short, deterministic shortlist of objects worth a look, newest facts first. It never hides anything: every
/// object is still in <paramref name="Rows"/>, and this is only the order somebody would read them in.
/// </param>
public sealed record ManagementDashboardDto(
    ManagementDashboardSummaryDto Summary,
    int FilteredLocationCount,
    IReadOnlyList<DashboardAttentionDto> Attention,
    PagedResult<LocationDashboardRowDto> Rows);

/// <param name="CustomStart">First month of a hand-picked comparison range, as <c>yyyy-MM</c>. Only with <see cref="AnalyticsComparisonBasis.CustomRange"/>.</param>
/// <param name="CustomEnd">Last month of that range, as <c>yyyy-MM</c>. It lies before the month being looked at.</param>
/// <param name="Group">
/// Only the objects of one portfolio group — the same group, decided by the same rule, that the summary's
/// partition counts them in, so a chip's count and the rows it opens cannot disagree.
/// </param>
/// <param name="MissingPrice">
/// True for only the objects whose order this month has a line somebody owes a price for — exactly the objects
/// <see cref="ManagementDashboardSummaryDto.LocationsWithMissingPrices"/> counts. Unlike
/// <see cref="PriceCoverage"/>, it includes an object none of whose owed lines is priced.
/// </param>
public sealed record DashboardQuery(
    AnalyticsComparisonBasis Basis = AnalyticsComparisonBasis.PreviousMonth,
    string? Search = null,
    HistoryCoverageState? HistoryCoverage = null,
    PriceCoverageState? PriceCoverage = null,
    bool? HasCurrentRequest = null,
    DashboardSort Sort = DashboardSort.LocationName,
    bool Descending = false,
    int Page = 1,
    int PageSize = 25,
    string? CustomStart = null,
    string? CustomEnd = null,
    PortfolioGroup? Group = null,
    bool? MissingPrice = null,
    /// <summary>
    /// Which lines the whole answer is about. The default is the month's planned material, because that is the
    /// only population a month-on-month comparison may be read as demand.
    /// </summary>
    AnalyticsScope Scope = AnalyticsScope.Monthly)
{
    /// <summary>The window this query asks for, with its months checked against the month being looked at.</summary>
    public ComparisonSelection SelectionFor(DateOnly currentPeriod) => ComparisonSelection.Of(
        Basis,
        AnalyticsPeriod.ParseOptional(CustomStart, nameof(CustomStart)),
        AnalyticsPeriod.ParseOptional(CustomEnd, nameof(CustomEnd)),
        currentPeriod);
}
