using BaxOrders.Application.Analytics;

namespace BaxOrders.Application.Decisions;

/// <summary>
/// One month measured against a baseline window: the two amounts, their difference, and why it moved.
/// </summary>
/// <param name="CurrentKnownAmount">Null when the location has no request for the month at all.</param>
/// <param name="BaselineKnownAmount">The money of one <i>average</i> available month, never the sum of them.</param>
/// <param name="Decomposition">
/// Null when there is nothing to explain — no current month, or no baseline month to compare it with.
/// </param>
public sealed record PeriodComparisonResult(
    decimal? CurrentKnownAmount,
    decimal? BaselineKnownAmount,
    decimal? KnownAmountDelta,
    decimal? KnownAmountPercentChange,
    AmountTotals CurrentTotals,
    AmountTotals BaselineTotals,
    CauseDecompositionResult? Decomposition);

/// <summary>
/// The one place a month is compared with a window of earlier months.
/// </summary>
/// <remarks>
/// <para>
/// There is exactly one of these on purpose. The company dashboard and a single order's decision screen used
/// to answer "how much did it change, and why?" through two different code paths, and a manager who followed
/// "Detallara bax" from a card got a different number and a different reason than the card had just given
/// them. Both now call this, so for one location, one month and one basis they cannot disagree.
/// </para>
/// <para>
/// Nothing here decides <i>which</i> months the window covers — that is <see cref="BaselineWindow"/>'s job —
/// and nothing here reads the database. It takes two months' worth of snapshots and does arithmetic on them.
/// </para>
/// </remarks>
public static class PeriodComparison
{
    /// <summary>
    /// A variant's baseline months folded into one average month, so the comparison is month against month.
    /// </summary>
    /// <remarks>
    /// <b>Divided by the months that exist, never by the months the basis asked for.</b> A location that
    /// ordered in two of the last three months is compared against the average of those two: a month with no
    /// request is a month nobody recorded, not a month in which nothing was ordered, and dividing by three
    /// would silently claim it ordered nothing. A month the location <i>did</i> order in without this
    /// particular product is a real zero for that product and is in the divisor.
    /// <para>
    /// Nothing is rounded here. These figures go straight into the decomposition, which is where the money is
    /// added up, and rounding each variant first would leave the total a few qəpik adrift of the difference it
    /// is supposed to explain.
    /// </para>
    /// <para>
    /// The item counts are not averaged. They exist only to say whether a price was owed and not given, and
    /// half a missing price is not a thing.
    /// </para>
    /// </remarks>
    public static VariantPeriodSnapshot? AverageBaseline(
        long variantId, IReadOnlyList<VariantPeriodSnapshot>? months, int availablePeriodCount)
    {
        if (availablePeriodCount == 0 || months is not { Count: > 0 })
        {
            return null;
        }

        decimal quantity = 0m, pricedQuantity = 0m, pricedAmount = 0m;
        int items = 0, known = 0, missingRequired = 0, notRequired = 0;
        foreach (var month in months)
        {
            quantity += month.Quantity;
            pricedQuantity += month.PricedQuantity;
            pricedAmount += month.PricedAmount;
            items += month.ItemCount;
            known += month.KnownPriceItemCount;
            missingRequired += month.MissingRequiredPriceItemCount;
            notRequired += month.PriceNotRequiredItemCount;
        }

        return new VariantPeriodSnapshot(
            variantId,
            quantity / availablePeriodCount,
            items,
            known,
            missingRequired,
            notRequired,
            pricedQuantity / availablePeriodCount,
            pricedAmount / availablePeriodCount);
    }

    /// <summary>
    /// The comparison itself.
    /// </summary>
    /// <param name="current">
    /// The selected month's variants, or null when the location has no request for it. Null is not an empty
    /// month: an object that did not order is not an object that ordered nothing, so its money stays unknown
    /// and nothing is explained.
    /// </param>
    /// <param name="baselineByVariant">Each variant's snapshots, one per available baseline month it appears in.</param>
    /// <param name="availablePeriodCount">Baseline months the location actually has a request for.</param>
    /// <param name="kinds">Whether each variant is material or a service; material is assumed when unknown.</param>
    public static PeriodComparisonResult Of(
        IReadOnlyDictionary<long, VariantPeriodSnapshot>? current,
        IReadOnlyDictionary<long, List<VariantPeriodSnapshot>> baselineByVariant,
        int availablePeriodCount,
        IReadOnlyDictionary<long, AnalyticsKind> kinds)
    {
        ArgumentNullException.ThrowIfNull(baselineByVariant);
        ArgumentNullException.ThrowIfNull(kinds);

        var currentTotals = OrderAnalyticsCalculator.Totals(
            current?.Values ?? Enumerable.Empty<VariantPeriodSnapshot>());
        var baselineTotals = OrderAnalyticsCalculator.Totals(
            baselineByVariant.Values.SelectMany(months => months));

        var currentAmount = current is null ? null : OrderAnalyticsCalculator.KnownAmount(currentTotals);
        var baselineAmount = OrderAnalyticsCalculator.AverageKnownAmount(baselineTotals, availablePeriodCount);
        var (delta, percent) = OrderAnalyticsCalculator.AmountDifference(currentAmount, baselineAmount);

        // Nothing to explain without both sides. With a current month and no baseline the variants would all
        // come back as "new", which is a statement about the records rather than about the ordering.
        var decomposition = current is null || availablePeriodCount == 0
            ? null
            : CauseDecomposition.Decompose(
                current.Keys.Union(baselineByVariant.Keys).Select(variantId => new VariantCauseInput(
                    variantId,
                    kinds.GetValueOrDefault(variantId, AnalyticsKind.QuantityComparable),
                    current.GetValueOrDefault(variantId),
                    AverageBaseline(variantId, baselineByVariant.GetValueOrDefault(variantId), availablePeriodCount))));

        return new PeriodComparisonResult(
            currentAmount, baselineAmount, delta, percent, currentTotals, baselineTotals, decomposition);
    }

    /// <summary>
    /// Each variant's baseline months, gathered from the requests of the available months.
    /// </summary>
    /// <remarks>Shared so that "which snapshots belong to the baseline" is also decided in one place.</remarks>
    public static Dictionary<long, List<VariantPeriodSnapshot>> GroupBaseline(
        IEnumerable<long> baselineRequestIds,
        IReadOnlyDictionary<long, Dictionary<long, VariantPeriodSnapshot>> snapshots)
    {
        ArgumentNullException.ThrowIfNull(baselineRequestIds);
        ArgumentNullException.ThrowIfNull(snapshots);

        var byVariant = new Dictionary<long, List<VariantPeriodSnapshot>>();
        foreach (var requestId in baselineRequestIds)
        {
            if (!snapshots.TryGetValue(requestId, out var variants))
            {
                continue;
            }

            foreach (var (variantId, snapshot) in variants)
            {
                if (!byVariant.TryGetValue(variantId, out var months))
                {
                    byVariant[variantId] = months = [];
                }

                months.Add(snapshot);
            }
        }

        return byVariant;
    }
}
