using BaxOrders.Application.Analytics;
using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Decisions;

/// <summary>
/// Where a month's money difference came from. Every category is a bucket of money, and the buckets add up to
/// the difference exactly — there is no "other".
/// </summary>
public enum CauseCategory
{
    /// <summary>Variants ordered now that the baseline month did not order at all.</summary>
    NewOrders = 1,

    /// <summary>The part of a kept variant's difference explained by ordering more or less of it.</summary>
    QuantityChange = 2,

    /// <summary>The part of a kept variant's difference explained by its unit price moving.</summary>
    PriceChange = 3,

    /// <summary>Variants the baseline month ordered and this one does not.</summary>
    NoLongerOrdered = 4,

    /// <summary>Service-like variants, compared by money only because their quantity is not a quantity.</summary>
    Services = 5,

    /// <summary>
    /// Variants whose price is not fully known, so their difference cannot honestly be split into a quantity
    /// effect and a price effect. Their money is still counted; only its cause is unknown.
    /// </summary>
    UnattributedDueToMissingPrice = 6,
}

/// <summary>One variant's two months, straight from the permanent items.</summary>
public sealed record VariantCauseInput(
    long ProductVariantId,
    AnalyticsKind Kind,
    VariantPeriodSnapshot? Current,
    VariantPeriodSnapshot? Baseline);

/// <summary>
/// What one variant did to the month's money, with the before and after values that say why.
/// </summary>
/// <param name="AmountImpact">Known money now minus known money then. Always the variant's whole contribution.</param>
/// <param name="QuantityImpact">The <c>(Qc − Qb) × Pb</c> part, or null when the variant was not split.</param>
/// <param name="PriceImpact">The <c>Qc × (Pc − Pb)</c> part, or null when the variant was not split.</param>
/// <param name="Category">
/// The single category this variant is listed under. A split variant is filed under whichever of its two
/// effects is larger in money; both effects are still reported, and both still reach their own totals.
/// </param>
public sealed record VariantCauseResult(
    long ProductVariantId,
    AnalyticsKind Kind,
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
    bool PriceIsComplete);

/// <param name="VariantCount">
/// Variants that put money in this category. For the two split categories that means variants whose own
/// quantity effect — or price effect — is not zero, so the count always matches the money above it.
/// </param>
public sealed record CauseCategoryTotal(CauseCategory Category, decimal Amount, int VariantCount);

/// <param name="TotalAmountImpact">The sum of every category, which is the month's known-money difference.</param>
/// <param name="ExplanationIsComplete">
/// False as soon as one variant's price is partly unknown. The money still adds up; what is incomplete is the
/// explanation of it, and the screen has to say so rather than presenting a confident cause.
/// </param>
public sealed record CauseDecompositionResult(
    IReadOnlyList<CauseCategoryTotal> Categories,
    IReadOnlyList<VariantCauseResult> Variants,
    decimal TotalAmountImpact,
    bool ExplanationIsComplete,
    int UnattributedVariantCount);

/// <summary>
/// Splits the difference between two months into causes, arithmetically and with no judgement: no model, no
/// threshold, no "significant". Give it the same two months twice and it returns the same answer.
/// </summary>
/// <remarks>
/// <para>
/// <b>The identity it is built on.</b> For a variant ordered in both months whose every line is priced,
/// <c>Qc·Pc − Qb·Pb = (Qc − Qb)·Pb + Qc·(Pc − Pb)</c>. The left side is the variant's money difference; the
/// right side is a quantity effect plus a price effect. Both effects use the <i>baseline</i> price as their
/// pivot, so ordering more of something is valued at what it used to cost, and the rest is the price moving.
/// </para>
/// <para>
/// <b>Why the price effect is computed as a remainder.</b> <c>Pb</c> is a division and rarely lands on a round
/// number. Computing both effects from it and hoping they add up would leave a few thousandths adrift, and a
/// screen that says "this is why" cannot be adrift. So the quantity effect is computed and the price effect is
/// what is left of the variant's difference — which is algebraically <c>Qc·(Pc − Pb)</c> and numerically exact.
/// </para>
/// <para>
/// <b>Identity is the variant.</b> Never the product: 30 pieces and 30 packs of one glove are different things
/// to order, and merging them by name would invent a price change out of a packaging difference.
/// </para>
/// <para>
/// <b>Unknown price is its own answer.</b> A variant with an unpriced line is not split at all — there is no
/// honest <c>Pb</c> for it — so its money goes to <see cref="CauseCategory.UnattributedDueToMissingPrice"/>
/// and the whole explanation is marked incomplete.
/// </para>
/// </remarks>
public static class CauseDecomposition
{
    /// <summary>
    /// The scale money reaches in this system: a quantity times a unit price. Amounts are stored as exact sums
    /// of such products, so a derived amount is rounded here once and never accumulates.
    /// </summary>
    public const int AmountScale = OrderRequestItem.QuantityScale + OrderRequestItem.UnitPriceScale;

    /// <summary>Every category, in the order a reader should meet them.</summary>
    public static readonly IReadOnlyList<CauseCategory> Order =
    [
        CauseCategory.NewOrders,
        CauseCategory.QuantityChange,
        CauseCategory.PriceChange,
        CauseCategory.NoLongerOrdered,
        CauseCategory.Services,
        CauseCategory.UnattributedDueToMissingPrice,
    ];

    public static CauseDecompositionResult Decompose(IEnumerable<VariantCauseInput> inputs)
    {
        ArgumentNullException.ThrowIfNull(inputs);

        var variants = new List<VariantCauseResult>();
        foreach (var input in inputs)
        {
            variants.Add(Explain(input));
        }

        var categories = new List<CauseCategoryTotal>(Order.Count);
        foreach (var category in Order)
        {
            var (amount, count) = category switch
            {
                // A split variant reaches both of these, so each total is the sum of exactly the variants the
                // screen lists beneath it.
                CauseCategory.QuantityChange => Contributions(variants, variant => variant.QuantityImpact),
                CauseCategory.PriceChange => Contributions(variants, variant => variant.PriceImpact),
                _ => Filed(variants, category),
            };

            categories.Add(new CauseCategoryTotal(category, amount, count));
        }

        var total = 0m;
        foreach (var variant in variants)
        {
            total += variant.AmountImpact;
        }

        var unattributed = variants.Count(variant => variant.Category == CauseCategory.UnattributedDueToMissingPrice);

        return new CauseDecompositionResult(
            categories,
            [.. variants.OrderByDescending(variant => Math.Abs(variant.AmountImpact)).ThenBy(variant => variant.ProductVariantId)],
            total,
            unattributed == 0,
            unattributed);
    }

    private static (decimal Amount, int Count) Contributions(
        List<VariantCauseResult> variants, Func<VariantCauseResult, decimal?> effect)
    {
        var amount = 0m;
        var count = 0;
        foreach (var variant in variants)
        {
            if (effect(variant) is not { } value)
            {
                continue;
            }

            amount += value;
            if (value != 0m)
            {
                count++;
            }
        }

        return (amount, count);
    }

    private static (decimal Amount, int Count) Filed(List<VariantCauseResult> variants, CauseCategory category)
    {
        var amount = 0m;
        var count = 0;
        foreach (var variant in variants)
        {
            if (variant.Category != category)
            {
                continue;
            }

            amount += variant.AmountImpact;
            count++;
        }

        return (amount, count);
    }

    private static VariantCauseResult Explain(VariantCauseInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var current = input.Current;
        var baseline = input.Baseline;

        var currentQuantity = current?.Quantity ?? 0m;
        var baselineQuantity = baseline?.Quantity ?? 0m;
        var currentAmount = current?.PricedAmount ?? 0m;
        var baselineAmount = baseline?.PricedAmount ?? 0m;
        var impact = currentAmount - baselineAmount;

        var missingPriceItems = (current?.MissingPriceItemCount ?? 0) + (baseline?.MissingPriceItemCount ?? 0);
        var priceIsComplete = missingPriceItems == 0;

        var currentPrice = WeightedPrice(current);
        var baselinePrice = WeightedPrice(baseline);

        decimal? quantityImpact = null;
        decimal? priceImpact = null;
        CauseCategory category;

        if (!priceIsComplete)
        {
            // No trustworthy unit price on one of the sides, so no trustworthy split. The money is kept; only
            // the reason for it is withheld.
            category = CauseCategory.UnattributedDueToMissingPrice;
        }
        else if (input.Kind != AnalyticsKind.QuantityComparable)
        {
            // "One month" to "two months" is not twice the cleaning. A service is compared by its money and is
            // never given a quantity effect, whether it is new, dropped or ongoing.
            category = CauseCategory.Services;
        }
        else if (baselineQuantity == 0m && currentQuantity > 0m)
        {
            category = CauseCategory.NewOrders;
        }
        else if (currentQuantity == 0m && baselineQuantity > 0m)
        {
            category = CauseCategory.NoLongerOrdered;
        }
        else if (baselineQuantity == 0m)
        {
            // Ordered in neither month in any quantity: nothing happened, and nothing is claimed about it.
            quantityImpact = impact;
            priceImpact = 0m;
            category = CauseCategory.QuantityChange;
        }
        else
        {
            // The pivot is the baseline's own money over its own quantity — not the rounded unit price, so the
            // two effects below reconstruct the difference to the last digit.
            var pivot = baselineAmount / baselineQuantity;
            quantityImpact = Math.Round((currentQuantity - baselineQuantity) * pivot, AmountScale, MidpointRounding.AwayFromZero);
            priceImpact = impact - quantityImpact;
            category = Math.Abs(quantityImpact.Value) >= Math.Abs(priceImpact.Value)
                ? CauseCategory.QuantityChange
                : CauseCategory.PriceChange;
        }

        return new VariantCauseResult(
            input.ProductVariantId,
            input.Kind,
            category,
            impact,
            quantityImpact,
            priceImpact,
            // A service has no comparable quantity, so none is offered — on either side.
            input.Kind == AnalyticsKind.QuantityComparable ? currentQuantity : null,
            input.Kind == AnalyticsKind.QuantityComparable ? baselineQuantity : null,
            input.Kind == AnalyticsKind.QuantityComparable
                ? OrderAnalyticsCalculator.PercentChange(currentQuantity, baselineQuantity)
                : null,
            currentPrice,
            baselinePrice,
            currentPrice is { } now && baselinePrice is { } then
                ? OrderAnalyticsCalculator.PercentChange(now, then)
                : null,
            current?.KnownAmountTotal,
            baseline?.KnownAmountTotal,
            current?.ItemCount ?? 0,
            baseline?.ItemCount ?? 0,
            missingPriceItems,
            priceIsComplete);
    }

    /// <summary>
    /// The price a side was actually charged, as money over the quantity that carried it — the same weighting
    /// the comparison engine uses, so the two screens never disagree about what a thing cost.
    /// </summary>
    private static decimal? WeightedPrice(VariantPeriodSnapshot? snapshot) =>
        snapshot is { PricedQuantity: > 0 }
            ? Math.Round(snapshot.PricedAmount / snapshot.PricedQuantity, OrderAnalyticsCalculator.MoneyScale, MidpointRounding.AwayFromZero)
            : null;
}
