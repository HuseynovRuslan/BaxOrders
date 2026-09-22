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
/// <param name="IsComplete">
/// False as soon as one line has no price. The money is then what is known, not what was spent, and must be
/// labelled as such. It describes a money figure, so it says nothing where there is none: for a location with
/// no request this month it is vacuously true beside a null amount, and the caller reads
/// <c>HasCurrentRequest</c> first.
/// </param>
public sealed record DashboardAmountDto(
    decimal? KnownAmount,
    int ItemCount,
    int KnownPriceItemCount,
    int MissingPriceItemCount,
    bool IsComplete);

/// <summary>What one location's selected month looks like beside its own history.</summary>
/// <param name="HasCurrentRequest">
/// False for an object that has ordered before but not this month. Its current money stays null: an object
/// that did not order is not an object that ordered nothing.
/// </param>
/// <param name="DeepLinkPeriod">
/// The month and basis a caller needs to open this same comparison in the location analytics screen. The
/// backend returns the values, never a front-end URL.
/// </param>
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
    AnalyticsComparisonBasis DeepLinkBasis);

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
public sealed record ManagementDashboardSummaryDto(
    DateOnly SelectedPeriod,
    AnalyticsComparisonBasis Basis,
    int LocationCount,
    int LocationsWithCurrentRequest,
    int LocationsWithoutCurrentRequest,
    int CurrentRequestCount,
    DashboardAmountDto Current,
    DashboardAmountDto Baseline,
    decimal? KnownAmountDelta,
    decimal? KnownAmountPercentChange,
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
    int AmountOrientedServiceCount);

/// <param name="FilteredLocationCount">
/// How many locations the search and filters left. The summary above is unaffected by them.
/// </param>
public sealed record ManagementDashboardDto(
    ManagementDashboardSummaryDto Summary,
    int FilteredLocationCount,
    PagedResult<LocationDashboardRowDto> Rows);

public sealed record DashboardQuery(
    AnalyticsComparisonBasis Basis = AnalyticsComparisonBasis.PreviousMonth,
    string? Search = null,
    HistoryCoverageState? HistoryCoverage = null,
    PriceCoverageState? PriceCoverage = null,
    bool? HasCurrentRequest = null,
    DashboardSort Sort = DashboardSort.LocationName,
    bool Descending = false,
    int Page = 1,
    int PageSize = 25);
