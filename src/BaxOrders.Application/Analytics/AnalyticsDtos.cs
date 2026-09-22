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

public sealed record PriceCoverageDto(
    PriceCoverageState State,
    decimal TotalQuantity,
    decimal KnownPriceQuantity,
    decimal MissingPriceQuantity,
    int KnownPriceItemCount,
    int MissingPriceItemCount);

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
/// False when either side has an item without a price. The totals are then money that is known, not the
/// complete money of the period, and must be labelled as such.
/// </param>
/// <param name="BaselineAverageItemCount">Baseline items per available period; null when no period is available.</param>
public sealed record ComparisonSummaryDto(
    int LocationId,
    string LocationCode,
    string LocationName,
    DateOnly CurrentPeriod,
    AnalyticsComparisonBasis Basis,
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

public sealed record ComparisonQuery(
    AnalyticsComparisonBasis Basis = AnalyticsComparisonBasis.PreviousMonth,
    string? Search = null,
    ComparisonState? State = null,
    int Page = 1,
    int PageSize = 50);

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
public sealed record VariantTrendPointDto(
    DateOnly Period,
    long OrderRequestId,
    int Version,
    decimal? Quantity,
    decimal? KnownAmount,
    decimal? WeightedUnitPrice,
    int ItemCount,
    int KnownPriceItemCount,
    int MissingPriceItemCount);

public sealed record VariantTrendDto(
    int LocationId,
    string LocationCode,
    string LocationName,
    VariantIdentityDto Variant,
    AnalyticsKind AnalyticsKind,
    DateOnly From,
    DateOnly To,
    IReadOnlyList<VariantTrendPointDto> Points);

public sealed record TrendQuery(DateOnly? From = null, DateOnly? To = null);
