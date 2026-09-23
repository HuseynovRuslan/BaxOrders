namespace BaxOrders.Domain.Suppliers;

/// <summary>
/// Whether a purchase price is expected from this supplier at all.
/// </summary>
/// <remarks>
/// <para>
/// A line with no unit price used to mean one thing: somebody has not filled the price in yet. That is only
/// true of material the company <b>buys</b>. Material issued from the company's own warehouse is not bought
/// from anybody, so there is no purchase price to be missing — the line is complete exactly as it stands.
/// </para>
/// <para>
/// This is a property of the supplier, recorded deliberately, and never guessed from its name. Two suppliers
/// in this catalogue have warehouse-sounding names and only one of them is the company's own store; a rule
/// based on the word "anbar" would have got the other one wrong.
/// </para>
/// <para>
/// It says nothing about whether a price <i>may</i> be recorded. An internal line that does carry a price
/// keeps it and is counted like any other priced line — <see cref="NotRequired"/> withdraws the expectation,
/// not the possibility.
/// </para>
/// </remarks>
public enum SupplierPriceRequirement
{
    /// <summary>Material bought from outside. A line without a price is a gap somebody has to close.</summary>
    Required = 1,

    /// <summary>
    /// Material supplied internally. A line without a price is finished work, not missing data: it must not
    /// raise a warning, block an approval, or be counted among the prices anybody is waiting for.
    /// </summary>
    NotRequired = 2,
}
