using BaxOrders.Application.Analytics;
using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Decisions;

/// <param name="KnownAmount">Money over the priced lines. Null when nothing on this side carries a price.</param>
/// <param name="MissingPriceItemCount">Lines somebody still has to price — the only kind that is a gap.</param>
/// <param name="PriceNotRequiredItemCount">
/// Lines issued from the company's own store. Neutral context; never a warning, never a shortfall.
/// </param>
/// <param name="IsComplete">True when every line that needed a price has one, not when every line has one.</param>
public sealed record DecisionAmountDto(
    decimal? KnownAmount,
    int ItemCount,
    int KnownPriceItemCount,
    int MissingPriceItemCount,
    int PriceNotRequiredItemCount,
    bool IsComplete);

/// <summary>Which request a month contributed, so any figure here can be opened and checked.</summary>
public sealed record DecisionPeriodDto(
    DateOnly Period, long OrderRequestId, int Version, OrderRequestStatus Status);

/// <summary>
/// The month before this one, which is the comparison a decision is actually made against.
/// </summary>
/// <param name="Available">
/// False when the location has no request for the previous month. Nothing is then claimed: the products of
/// this month are not new, they are simply uncompared, and the screen has to say exactly that.
/// </param>
public sealed record DecisionPreviousMonthDto(
    bool Available,
    DateOnly Period,
    DecisionPeriodDto? Request,
    DecisionAmountDto? Amount,
    decimal? DeltaAmount,
    decimal? DeltaPercent);

/// <summary>
/// A longer run of months, as context rather than as the comparison.
/// </summary>
/// <param name="AverageKnownAmount">
/// The money of an average available month — divided by the months that exist, not by the months the window
/// asked for. One month is compared with one month.
/// </param>
public sealed record DecisionWindowDto(
    AnalyticsComparisonBasis Basis,
    int ExpectedPeriodCount,
    int AvailablePeriodCount,
    IReadOnlyList<DateOnly> MissingPeriods,
    IReadOnlyList<DecisionPeriodDto> Periods,
    decimal? AverageKnownAmount,
    decimal? DeltaAmount,
    decimal? DeltaPercent,
    bool AmountIsComplete);

public sealed record DecisionCauseDto(CauseCategory Category, decimal Amount, int VariantCount);

/// <summary>
/// One product behind the month's difference, with the before and after values that explain it.
/// </summary>
/// <remarks>
/// Everything needed to write "2,80 → 4,10 ₼, +46,4%, miqdar 30 → 30, təsiri +39 ₼" is here as numbers. The
/// sentence is the screen's to write; the arithmetic is not.
/// </remarks>
public sealed record DecisionDriverDto(
    VariantIdentityDto Variant,
    AnalyticsKind AnalyticsKind,
    CauseCategory Category,
    decimal AmountImpact,
    decimal? QuantityImpact,
    decimal? PriceImpact,
    decimal? CurrentQuantity,
    decimal? BaselineQuantity,
    decimal? QuantityPercentChange,
    decimal? CurrentUnitPrice,
    decimal? BaselineUnitPrice,
    decimal? UnitPricePercentChange,
    decimal? CurrentKnownAmount,
    decimal? BaselineKnownAmount,
    int CurrentItemCount,
    int BaselineItemCount,
    int MissingPriceItemCount,
    int PriceNotRequiredItemCount,
    bool PriceIsComplete);

/// <param name="TotalAmountImpact">The sum of every category, which is the difference against the month before.</param>
/// <param name="ExplanationIsComplete">
/// False when a variant's price is partly unknown, so its money is counted but its cause is not known. The
/// screen says so rather than presenting a confident answer.
/// </param>
/// <param name="InternalSupplyVariantCount">
/// Products supplied from the company's own store. Shown as neutral context where it helps; never as a problem.
/// </param>
/// <param name="Drivers">Every variant that moved, largest money first.</param>
public sealed record DecisionDecompositionDto(
    IReadOnlyList<DecisionCauseDto> Categories,
    decimal TotalAmountImpact,
    bool ExplanationIsComplete,
    int UnattributedVariantCount,
    int InternalSupplyVariantCount,
    IReadOnlyList<DecisionDriverDto> Drivers);

/// <summary>
/// Everything the first screenful of a decision needs, computed for <b>the version that was opened</b>.
/// </summary>
/// <remarks>
/// A person deciding an order is looking at one version of it. If this read model quietly answered about the
/// newest version instead, the figures on the screen would not be the figures being approved. So the request
/// asked for is the request answered about, whether or not a later version exists — <see cref="IsLatestVersion"/>
/// says which case it is, and the screen can offer the newer one rather than substituting it.
/// </remarks>
/// <param name="Decomposition">Null when the previous month has no request: there is then nothing to explain.</param>
public sealed record OrderDecisionContextDto(
    long OrderRequestId,
    int LocationId,
    string LocationCode,
    string LocationName,
    DateOnly RequestPeriod,
    int Version,
    OrderRequestStatus Status,
    bool IsLatestVersion,
    long? LatestOrderRequestId,
    int? LatestVersion,
    DecisionAmountDto Current,
    DecisionPreviousMonthDto PreviousMonth,
    DecisionWindowDto ThreeMonth,
    DecisionWindowDto SixMonth,
    DecisionDecompositionDto? Decomposition);
