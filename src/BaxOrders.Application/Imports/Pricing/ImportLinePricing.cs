using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Imports.Pricing;

/// <summary>
/// What an imported line's pricing mode will be, and therefore what Task 2's rule says about it. The only place the
/// import decides this.
/// </summary>
/// <remarks>
/// <para>
/// Two inputs and no third: the price the line will carry, and what a person said in review. There is no parameter
/// through which a supplier, the workbook's supplier text, a location, a product or a category could reach it —
/// that is the whole of "mənbəyə görə avtomatik təsnifat olmur" (brief 16) in code. Qala anbar holds bought and free
/// material alike, and only part of Azpetrol baza is free, so no source can speak for its lines.
/// </para>
/// <para>
/// Every import count — readiness, the confirmation preview and its result, the staging preview — and the
/// confirmation's write go through here, and through <see cref="OrderLinePricing.Classify"/> after it, so the
/// import speaks exactly the words Qiymət təsnifatı does.
/// </para>
/// </remarks>
public static class ImportLinePricing
{
    /// <summary>The mode the imported line will carry.</summary>
    /// <remarks>
    /// A price wins: there is nothing to classify, and a stored classification on a row that has since been given
    /// a price is ignored. Otherwise what the reviewer said, and when nobody said, "Təsnif edilməyib".
    /// </remarks>
    public static PricingMode ModeOf(decimal? effectiveUnitPrice, PricingMode? classification) =>
        effectiveUnitPrice is not null ? PricingMode.PriceRequired
            : classification ?? PricingMode.Unresolved;

    /// <summary>The line's Task 2 state, read through the one rule the whole system shares.</summary>
    public static OrderLinePricingState StateOf(decimal? effectiveUnitPrice, PricingMode? classification) =>
        OrderLinePricing.Classify(effectiveUnitPrice, ModeOf(effectiveUnitPrice, classification));
}

/// <summary>
/// The import's price counts in Task 2's words, over one set of rows that will become lines.
/// </summary>
/// <param name="Unclassified">Unpriced, and nobody said which: «Təsnif edilməyib» once imported.</param>
/// <param name="PriceRequired">Unpriced, and said to be bought: «Alış qiyməti tələb olunur».</param>
/// <param name="InternalSupply">Unpriced, and said to be supplied free: «Ödənişsiz daxili təminat». Never a warning.</param>
public sealed record ImportPricingCounts(int Unclassified, int PriceRequired, int InternalSupply)
{
    public static readonly ImportPricingCounts Empty = new(0, 0, 0);

    /// <summary>«N sətirdə qiymət yoxdur»: the unpriced rows that are a warning, exactly as on every other screen.</summary>
    public int MissingPrice => Unclassified + PriceRequired;

    /// <summary>Every unpriced row, whatever was said about it.</summary>
    public int Unpriced => Unclassified + PriceRequired + InternalSupply;

    /// <param name="rows">Each row's effective price and review classification; nothing else is read.</param>
    public static ImportPricingCounts Of(IEnumerable<(decimal? UnitPrice, PricingMode? Classification)> rows)
    {
        ArgumentNullException.ThrowIfNull(rows);

        int unclassified = 0, priceRequired = 0, internalSupply = 0;
        foreach (var (unitPrice, classification) in rows)
        {
            switch (ImportLinePricing.StateOf(unitPrice, classification))
            {
                case OrderLinePricingState.MissingUnclassified:
                    unclassified++;
                    break;
                case OrderLinePricingState.MissingPriceRequired:
                    priceRequired++;
                    break;
                case OrderLinePricingState.FreeInternalSupply:
                    internalSupply++;
                    break;
            }
        }

        return new ImportPricingCounts(unclassified, priceRequired, internalSupply);
    }
}
