using BaxOrders.Application.Imports;
using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Analytics;

/// <summary>The identity a quantity may be compared within. Anything coarser would compare unlike things.</summary>
/// <remarks>
/// 30 pieces and 30 packs of one glove are not the same order, 50 mm and 100 mm tape are not the same tape,
/// and "28 diş" is not a plain 28. The variant carries all of that, so the variant is the comparison identity —
/// never the product name, the product id or the model code on their own.
/// </remarks>
public sealed record VariantIdentityDto(
    long ProductVariantId,
    long ProductId,
    string ProductCode,
    string ProductName,
    string? SpecificationValue,
    string? SpecificationUnitCode,
    string? SpecificationUnitName,
    string? SpecificationDescriptor,
    string? ModelCode,
    string? OrderUnitCode,
    string? OrderUnitName);

/// <param name="MissingRequiredPriceItemCount">Bought lines nobody has priced. The only kind that is a gap.</param>
/// <param name="PriceNotRequiredItemCount">Internally supplied lines, complete without a purchase price.</param>
public sealed record PriceCoverageDto(
    PriceCoverageState State,
    decimal TotalQuantity,
    decimal KnownPriceQuantity,
    decimal MissingPriceQuantity,
    int KnownPriceItemCount,
    int MissingRequiredPriceItemCount,
    int PriceNotRequiredItemCount);

/// <param name="Quantity">Period total on the current side, per-available-period average on the baseline side.</param>
/// <param name="KnownAmount">Money that is known; null when nothing on this side has a price.</param>
public sealed record ComparisonSideDto(
    decimal? Quantity,
    int ItemCount,
    decimal? KnownAmount,
    decimal? WeightedUnitPrice,
    PriceCoverageDto PriceCoverage);

/// <param name="AvailablePeriodCount">Baseline months that actually have a request for this location.</param>
/// <param name="ExpectedPeriodCount">Baseline months the basis asked for.</param>
public sealed record BaselineSideDto(
    decimal? Quantity,
    int ItemCount,
    decimal? KnownAmount,
    decimal? WeightedUnitPrice,
    PriceCoverageDto PriceCoverage,
    int AvailablePeriodCount,
    int ExpectedPeriodCount);

public sealed record ComparisonDeltaDto(
    decimal? QuantityDelta,
    decimal? QuantityPercentChange,
    decimal? PriceDelta,
    decimal? PricePercentChange,
    decimal? AmountDelta,
    decimal? AmountPercentChange);

/// <summary>One product variant compared. Numbers only — the UI decides how to write them.</summary>
public sealed record VariantComparisonDto(
    VariantIdentityDto Variant,
    AnalyticsKind AnalyticsKind,
    ComparisonState State,
    ComparisonSideDto Current,
    BaselineSideDto Baseline,
    ComparisonDeltaDto Delta);

/// <summary>Which request each period contributed, so any figure can be traced back without listing items.</summary>
public sealed record PeriodRequestDto(DateOnly Period, long OrderRequestId, int Version, OrderRequestStatus Status);

/// <summary>
/// The comparison at location level.
/// </summary>
/// <param name="AmountIsComplete">
/// False when either side has an item that was <b>supposed</b> to be priced and is not. Internally supplied
/// lines never make it false — nothing about them is missing. When it is false the totals are money that is
/// known rather than the complete money of the period, and must be labelled as such.
/// </param>
/// <param name="BaselineAverageItemCount">Baseline items per available period; null when no period is available.</param>
public sealed record ComparisonSummaryDto(
    int LocationId,
    string LocationCode,
    string LocationName,
    DateOnly CurrentPeriod,
    AnalyticsComparisonBasis Basis,
    DateOnly? CustomStart,
    DateOnly? CustomEnd,
    /// <summary>The months the window covers, oldest first, whether or not this object ordered in them.</summary>
    IReadOnlyList<DateOnly> BaselineWindowPeriods,
    long CurrentRequestId,
    int CurrentVersion,
    OrderRequestStatus CurrentStatus,
    int ExpectedBaselinePeriodCount,
    int AvailableBaselinePeriodCount,
    IReadOnlyList<DateOnly> MissingBaselinePeriods,
    IReadOnlyList<PeriodRequestDto> BaselinePeriods,
    bool BaselineAvailable,
    int CurrentItemCount,
    decimal? BaselineAverageItemCount,
    decimal? CurrentKnownAmountTotal,
    decimal? BaselineKnownAmountTotal,
    decimal? KnownAmountDelta,
    decimal? KnownAmountPercentChange,
    int CurrentMissingPriceItemCount,
    int BaselineMissingPriceItemCount,
    int CurrentPriceNotRequiredItemCount,
    int BaselinePriceNotRequiredItemCount,
    bool AmountIsComplete,
    int NewVariantCount,
    int NoLongerOrderedVariantCount,
    int IncreasedVariantCount,
    int DecreasedVariantCount,
    int UnchangedVariantCount,
    int NotComparableVariantCount,
    int InsufficientHistoryVariantCount,
    int QuantityComparableVariantCount,
    int AmountOrientedServiceCount,
    int TotalVariantCount);

/// <param name="Summary">Always describes the complete comparison, never only the page or the filtered subset.</param>
public sealed record LocationComparisonDto(
    ComparisonSummaryDto Summary,
    PagedResult<VariantComparisonDto> Rows);

/// <param name="Kind">
/// Narrows the rows to materials or to services. Both are one comparison, but they are read separately: a
/// service has no quantity to put in a quantity table, so a caller showing the two apart needs the paging and
/// the row count to follow that split rather than doing it after the fact.
/// </param>
/// <param name="CustomStart">First month of a hand-picked comparison range, as <c>yyyy-MM</c>. Only with <see cref="AnalyticsComparisonBasis.CustomRange"/>.</param>
/// <param name="CustomEnd">Last month of that range, as <c>yyyy-MM</c>. It lies before the month being looked at.</param>
public sealed record ComparisonQuery(
    AnalyticsComparisonBasis Basis = AnalyticsComparisonBasis.PreviousMonth,
    string? Search = null,
    ComparisonState? State = null,
    AnalyticsKind? Kind = null,
    int Page = 1,
    int PageSize = 50,
    string? CustomStart = null,
    string? CustomEnd = null)
{
    /// <summary>The window this query asks for, with its months checked against the month being looked at.</summary>
    public ComparisonSelection SelectionFor(DateOnly currentPeriod) => ComparisonSelection.Of(
        Basis,
        AnalyticsPeriod.ParseOptional(CustomStart, nameof(CustomStart)),
        AnalyticsPeriod.ParseOptional(CustomEnd, nameof(CustomEnd)),
        currentPeriod);
}

/// <summary>A month a location has a request for, with the version analytics would use.</summary>
public sealed record AnalyticsPeriodDto(
    DateOnly Period,
    long OrderRequestId,
    int Version,
    OrderRequestStatus Status,
    int ItemCount);

public sealed record AnalyticsPeriodsDto(
    int LocationId,
    string LocationCode,
    string LocationName,
    IReadOnlyList<AnalyticsPeriodDto> Periods);

/// <summary>
/// One month of a variant's history.
/// </summary>
/// <param name="Quantity">
/// Zero when the location ordered that month but not this variant; null for a service-like variant, whose
/// quantity is not a comparable figure. A month the location has no request for produces no point at all.
/// </param>
/// <param name="KnownAmount">
/// Null when nothing in the month carried a price. That covers two very different months — one nobody has
/// priced yet, and one supplied from the company's own store — which the two counts below tell apart. Neither
/// is ever reported as a zero.
/// </param>
/// <param name="MissingRequiredPriceItemCount">Bought lines nobody has priced.</param>
/// <param name="PriceNotRequiredItemCount">Internally supplied lines, complete without a purchase price.</param>
public sealed record VariantTrendPointDto(
    DateOnly Period,
    long OrderRequestId,
    int Version,
    decimal? Quantity,
    decimal? KnownAmount,
    decimal? WeightedUnitPrice,
    int ItemCount,
    int KnownPriceItemCount,
    int MissingRequiredPriceItemCount,
    int PriceNotRequiredItemCount);

/// <summary>
/// How often this location actually orders this product, counted rather than estimated.
/// </summary>
/// <remarks>
/// Every figure here is a count of months the data states outright. Nothing is projected, and a month the
/// location has no request for is not a month in which the product was not ordered — it is a month nobody
/// knows about, so it is left out of every count below rather than treated as a zero.
/// </remarks>
/// <param name="AvailableMonthCount">Months in the window the location has a request for. The denominator.</param>
/// <param name="OrderedMonthCount">How many of those months contain this product at all.</param>
/// <param name="MonthsSinceLastOrder">
/// Calendar months from the last month it was ordered to the last month the location ordered anything. Zero
/// means it was on the most recent order. Measured against the data rather than against today's date, because
/// the absence of a recent request is not the same as a product having been dropped.
/// </param>
/// <param name="IntervalsInMonths">The gaps between consecutive ordered months, oldest first.</param>
/// <param name="TypicalIntervalMonths">The median gap; null until there are at least two gaps to take one of.</param>
public sealed record VariantOrderFrequencyDto(
    int AvailableMonthCount,
    int OrderedMonthCount,
    DateOnly? FirstOrderedPeriod,
    DateOnly? LastOrderedPeriod,
    int? MonthsSinceLastOrder,
    IReadOnlyList<int> IntervalsInMonths,
    int? TypicalIntervalMonths,
    int? ShortestIntervalMonths,
    int? LongestIntervalMonths);

public sealed record VariantTrendDto(
    int LocationId,
    string LocationCode,
    string LocationName,
    VariantIdentityDto Variant,
    AnalyticsKind AnalyticsKind,
    DateOnly From,
    DateOnly To,
    IReadOnlyList<VariantTrendPointDto> Points,
    VariantOrderFrequencyDto Frequency);

public sealed record TrendQuery(DateOnly? From = null, DateOnly? To = null);
