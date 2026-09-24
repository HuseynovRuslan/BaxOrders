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
/// One basis resolved for this order: the months it covers, which of them the location actually has, and what
/// the comparison against them says.
/// </summary>
/// <remarks>
/// The screen shows one of these large — the basis the reader chose — and the rest small. They are the same
/// shape on purpose: whichever one is in front of the reader, it was computed the same way, so switching
/// basis changes the answer and never the meaning of the answer.
/// </remarks>
/// <param name="WindowPeriods">
/// Every month the basis covers, oldest first, whether or not the location ordered in them. This is what the
/// screen names the basis from: "Son 3 ayın ortalaması (İyun–Avqust 2026)" cannot be written without it.
/// </param>
/// <param name="AvailablePeriodCount">
/// The months the location actually has a request for — and the divisor of the average below. A month with no
/// request is not a month of zero ordering; see <see cref="PeriodComparison.AverageBaseline"/>.
/// </param>
/// <param name="Available">
/// False when the location has no request in any month of the window. Nothing is then claimed: the products
/// of this month are not new, they are simply uncompared, and the screen has to say exactly that.
/// </param>
/// <param name="BaselineKnownAmount">The money of an average available month. Null when none is available.</param>
public sealed record DecisionComparisonDto(
    AnalyticsComparisonBasis Basis,
    DateOnly? CustomStart,
    DateOnly? CustomEnd,
    IReadOnlyList<DateOnly> WindowPeriods,
    int ExpectedPeriodCount,
    int AvailablePeriodCount,
    IReadOnlyList<DateOnly> MissingPeriods,
    IReadOnlyList<DecisionPeriodDto> Periods,
    bool Available,
    decimal? BaselineKnownAmount,
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
    bool PriceIsComplete,
    /// <summary>The company paid for this product in one of the two months and supplied it itself in the other.</summary>
    bool SupplyChanged);

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
    /// <summary>Variants paid for in one of the two months and supplied internally in the other.</summary>
    int SupplyChangedVariantCount,
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
/// <summary>What the decision screen should compare this order against.</summary>
/// <remarks>
/// The months arrive as text because they come from a query string, and they are checked against the order's
/// own month — which only the query knows — rather than here.
/// </remarks>
/// <param name="CustomStart">First month of a hand-picked range, as <c>yyyy-MM</c>. Only with <see cref="AnalyticsComparisonBasis.CustomRange"/>.</param>
/// <param name="CustomEnd">Last month of that range, as <c>yyyy-MM</c>. It lies before the order's own month.</param>
public sealed record DecisionContextQuery(
    AnalyticsComparisonBasis Basis = AnalyticsComparisonBasis.PreviousMonth,
    string? CustomStart = null,
    string? CustomEnd = null)
{
    public ComparisonSelection SelectionFor(DateOnly currentPeriod) => ComparisonSelection.Of(
        Basis,
        AnalyticsPeriod.ParseOptional(CustomStart, nameof(CustomStart)),
        AnalyticsPeriod.ParseOptional(CustomEnd, nameof(CustomEnd)),
        currentPeriod);
}

/// <param name="Primary">
/// The comparison the reader asked for. The headline figures and <paramref name="Decomposition"/> are both
/// against this one, so the screen gives one answer to "how much did it change, and why?".
/// </param>
/// <param name="Secondary">The other bases, as quiet context beside it. Never a rival answer.</param>
/// <param name="Decomposition">
/// Null when the primary window holds no request: there is then nothing to explain.
/// </param>
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
    DecisionComparisonDto Primary,
    IReadOnlyList<DecisionComparisonDto> Secondary,
    DecisionDecompositionDto? Decomposition);
