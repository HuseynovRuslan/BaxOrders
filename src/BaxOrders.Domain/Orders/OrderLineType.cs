namespace BaxOrders.Domain.Orders;

/// <summary>
/// Whether one order line belongs to the monthly plan or was ordered outside it.
/// </summary>
/// <remarks>
/// <para>
/// The business runs two kinds of demand through the same request. Most lines are the month's planned
/// material — "Aylıq sifariş". Some are asked for on top of it, because something broke or an event needed
/// material nobody planned for — "Aylıqdan kənar sifarişlər". The two are reported and budgeted separately,
/// so a line that does not say which it is cannot be counted as either.
/// </para>
/// <para>
/// <b>Why this lives on the line and not on the request.</b> The obvious place would be the request, and it
/// would be wrong: of the 143 requests the source workbook classifies, <b>59 contain both kinds</b>. One
/// request for one object in one month routinely carries the month's planned material and an unplanned
/// item side by side. Only the line knows.
/// </para>
/// <para>
/// It is never inferred. Not from the product, not from the supplier, not from the amount, and not from
/// whether the line looks unusual. It comes from the source that states it, or it stays
/// <see cref="Unclassified"/> until a person says otherwise.
/// </para>
/// </remarks>
public enum OrderLineType
{
    /// <summary>
    /// Nobody has said which kind this line is.
    /// </summary>
    /// <remarks>
    /// The safe initial state, and the honest one. It is never treated as
    /// <see cref="Monthly"/> by default: a line missing from the monthly figures is visible, whereas a line
    /// wrongly added to them is not.
    /// </remarks>
    Unclassified = 0,

    /// <summary>The month's planned material. "Aylıq sifariş".</summary>
    Monthly = 1,

    /// <summary>Material asked for on top of the monthly plan. "Aylıqdan kənar sifarişlər".</summary>
    OutsideMonthly = 2,
}
