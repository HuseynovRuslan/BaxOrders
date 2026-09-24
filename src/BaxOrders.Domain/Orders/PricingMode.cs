namespace BaxOrders.Domain.Orders;

/// <summary>
/// Whether a purchase price is expected on one order line.
/// </summary>
/// <remarks>
/// <para>
/// A line with no unit price means one of three things, and the system has to keep them apart. It may be
/// material the company buys and nobody has priced yet, which is a gap. It may be material the company
/// supplies itself, free of charge, which is a finished line with nothing missing. Or nobody has yet said
/// which of the two it is.
/// </para>
/// <para>
/// <b>Why this lives on the line and not on the supplier.</b> The first attempt at this recorded it against
/// the supplier, and the business corrected it: one source can be both. Material from Qala anbar is sometimes
/// bought through Cleanfix MMC and sometimes issued free from the same store, so no property of the supplier
/// can answer the question. Only the line knows.
/// </para>
/// <para>
/// It is never inferred — not from a supplier's name, not from the words "baza" or "anbar", not from the
/// product or its category. It is imported as a default, or a person sets it, and nothing else moves it.
/// </para>
/// </remarks>
public enum PricingMode
{
    /// <summary>Material the company buys. A line with no price is a gap somebody has to close.</summary>
    PriceRequired = 1,

    /// <summary>
    /// Material the company supplies itself, free of charge. There is no purchase price to record, so a null
    /// unit price is the finished state of this line and never a warning.
    /// </summary>
    InternalFreeSupply = 2,

    /// <summary>
    /// Nobody has said which of the two this is.
    /// </summary>
    /// <remarks>
    /// Treated as <see cref="PriceRequired"/> everywhere a decision has to be made — an unreviewed line must
    /// not quietly suppress a warning — but counted and listed separately, so the rows waiting on somebody
    /// are visible as exactly that rather than hidden among genuine gaps.
    /// </remarks>
    Unresolved = 3,
}
