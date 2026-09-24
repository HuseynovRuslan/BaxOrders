namespace BaxOrders.Domain.Orders;

/// <summary>
/// What one order line's price situation actually is. The single definition the whole system reads from.
/// </summary>
/// <remarks>
/// <para>
/// An empty price cell used to mean whatever the screen looking at it decided. The object page counted it as a
/// gap, the order page did not, and a manager comparing the two was told the same month had one problem and
/// two problems. There is one classification now and every count is derived from it.
/// </para>
/// <para>
/// Three of the four are about an <i>absent</i> price and only two of those are a problem. Material the
/// company issues from its own store has no purchase price and never had one: that is a finished line, not a
/// missing one, and it must never be coloured or counted as a shortfall.
/// </para>
/// </remarks>
public enum OrderLinePricingState
{
    /// <summary>A unit price is recorded. Nothing is in question.</summary>
    Priced = 1,

    /// <summary>
    /// No price, and nobody has said whether one is owed. <b>A warning.</b>
    /// </summary>
    /// <remarks>
    /// The cautious reading, and deliberately so: an unclassified line must not be able to silence a real gap
    /// by being unanswered. It is resolved on the pricing-classification screen, by a person.
    /// </remarks>
    MissingUnclassified = 2,

    /// <summary>No price, and somebody has said one is owed. <b>A warning.</b></summary>
    MissingPriceRequired = 3,

    /// <summary>
    /// No price because the company supplies this itself, free of charge. <b>Never a warning.</b>
    /// </summary>
    /// <remarks>
    /// It contributes its real quantity and nothing at all to money — not zero manat, which would be a claim
    /// that it was bought for nothing, but no amount.
    /// </remarks>
    FreeInternalSupply = 4,
}

/// <summary>Reading a line's price situation, and nothing else.</summary>
public static class OrderLinePricing
{
    /// <summary>
    /// The one rule. Every count in the system resolves to this.
    /// </summary>
    /// <remarks>
    /// <b>A recorded price wins.</b> A line that carries a price is <see cref="OrderLinePricingState.Priced"/>
    /// whatever its <see cref="PricingMode"/> says, because a price is the strongest possible statement that
    /// this was bought, and the mode is a statement about an absence that is not there. The domain refuses to
    /// mark a priced line as internally supplied in the first place — see
    /// <see cref="OrderRequestItem.SetPricingMode"/> — so this settles a state that can only arrive from
    /// imported history, and settles it towards the fact rather than towards the label.
    /// </remarks>
    public static OrderLinePricingState Classify(decimal? unitPrice, PricingMode pricingMode) =>
        unitPrice is not null ? OrderLinePricingState.Priced
            : pricingMode switch
            {
                PricingMode.InternalFreeSupply => OrderLinePricingState.FreeInternalSupply,
                PricingMode.PriceRequired => OrderLinePricingState.MissingPriceRequired,
                _ => OrderLinePricingState.MissingUnclassified,
            };

    /// <summary>Whether this state is something somebody has to put right.</summary>
    public static bool IsWarning(this OrderLinePricingState state) =>
        state is OrderLinePricingState.MissingUnclassified or OrderLinePricingState.MissingPriceRequired;

    /// <summary>Whether this state is the company supplying itself. Context, never a problem.</summary>
    public static bool IsInternalSupply(this OrderLinePricingState state) =>
        state is OrderLinePricingState.FreeInternalSupply;
}
