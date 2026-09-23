namespace BaxOrders.Application.Analytics;

/// <summary>
/// What one product variant amounts to inside one request version. Several permanent items may reference the
/// same variant in one request; analytics adds them up here while the stored items keep their source-line
/// cardinality. Items flagged as possible duplicates are ordinary items and are included like every other.
/// </summary>
/// <param name="Quantity">Sum of every item's quantity, priced or not.</param>
/// <param name="MissingRequiredPriceItemCount">
/// Items bought from outside that nobody has priced yet. This — and only this — is a gap in the data.
/// </param>
/// <param name="PriceNotRequiredItemCount">
/// Items issued from the company's own store, which are not bought and so have no purchase price to record.
/// They are finished lines, not missing ones, and must never be counted as a shortfall.
/// </param>
/// <param name="PricedQuantity">Sum of the quantity of the items whose price is known.</param>
/// <param name="PricedAmount">Sum of <c>Quantity × UnitPrice</c> over the items whose price is known.</param>
public sealed record VariantPeriodSnapshot(
    long ProductVariantId,
    decimal Quantity,
    int ItemCount,
    int KnownPriceItemCount,
    int MissingRequiredPriceItemCount,
    int PriceNotRequiredItemCount,
    decimal PricedQuantity,
    decimal PricedAmount)
{
    /// <summary>Money that is known. Null when not one item of this variant has a price in this period.</summary>
    public decimal? KnownAmountTotal => KnownPriceItemCount == 0 ? null : PricedAmount;

    /// <summary>
    /// Every item carrying no price, for whatever reason. Useful for reconciling against the raw table; never
    /// for warning anybody, because most of these may be perfectly complete internal supply.
    /// </summary>
    public int UnpricedItemCount => MissingRequiredPriceItemCount + PriceNotRequiredItemCount;
}

/// <summary>Which request version a period contributed to the comparison.</summary>
public sealed record PeriodRequestRef(DateOnly Period, long OrderRequestId, int Version);

/// <summary>
/// Everything the calculator needs about one variant. The baseline snapshots hold only the available months in
/// which the variant actually appears; an available month without the variant contributes a zero quantity, and
/// a month with no request at all is not available and is never treated as a zero.
/// </summary>
public sealed record VariantComparisonInput(
    long ProductVariantId,
    AnalyticsKind Kind,
    VariantPeriodSnapshot? Current,
    IReadOnlyList<VariantPeriodSnapshot> BaselineSnapshots,
    int AvailableBaselinePeriodCount,
    int ExpectedBaselinePeriodCount);

/// <summary>
/// How much of a side's quantity carries a price, and how much of the rest was ever supposed to.
/// </summary>
/// <param name="MissingPriceQuantity">Quantity with no price of any kind — internal supply included.</param>
/// <param name="MissingRequiredPriceItemCount">The items somebody still has to price.</param>
/// <param name="PriceNotRequiredItemCount">Internal items that are complete without one.</param>
public sealed record PriceCoverage(
    PriceCoverageState State,
    decimal TotalQuantity,
    decimal KnownPriceQuantity,
    decimal MissingPriceQuantity,
    int KnownPriceItemCount,
    int MissingRequiredPriceItemCount,
    int PriceNotRequiredItemCount);

/// <summary>
/// One side of a comparison.
/// </summary>
/// <param name="Quantity">
/// The comparable quantity: the period total on the current side, the per-available-period average on the
/// baseline side. Null for a service-like variant, whose quantity is not a comparable figure, and null on the
/// baseline side when no baseline month is available.
/// </param>
/// <param name="ItemCount">Permanent items observed on this side, summed over its periods.</param>
/// <param name="KnownAmount">
/// Money that is known: the period total on the current side, the per-available-period average on the baseline
/// side. Null when no item of the side has a price.
/// </param>
/// <param name="WeightedUnitPrice">
/// <c>SUM(Quantity × UnitPrice) / SUM(Quantity)</c> over the priced items of the side, pooled across every
/// available baseline month rather than averaged per month. Null when no quantity of the side is priced.
/// </param>
public sealed record ComparisonSide(
    decimal? Quantity,
    int ItemCount,
    decimal? KnownAmount,
    decimal? WeightedUnitPrice,
    PriceCoverage PriceCoverage);

/// <summary>Differences between the two sides. Every field is null when its inputs do not allow the figure.</summary>
public sealed record ComparisonDelta(
    decimal? QuantityDelta,
    decimal? QuantityPercentChange,
    decimal? PriceDelta,
    decimal? PricePercentChange,
    decimal? AmountDelta,
    decimal? AmountPercentChange);

/// <summary>One variant compared, before any product metadata is attached to it.</summary>
public sealed record VariantComparisonResult(
    long ProductVariantId,
    AnalyticsKind Kind,
    ComparisonState State,
    ComparisonSide Current,
    ComparisonSide Baseline,
    int AvailableBaselinePeriodCount,
    int ExpectedBaselinePeriodCount,
    ComparisonDelta Delta);
