namespace BaxOrders.Domain.Imports;

/// <summary>
/// Cell text of one Excel row exactly as read. Nothing here is trimmed, parsed or interpreted.
/// </summary>
public sealed record ImportRowOriginalValues
{
    /// <summary>"№"</summary>
    public string? SequenceNumber { get; init; }

    /// <summary>"Ana kateqoriya"</summary>
    public string? MainCategory { get; init; }

    /// <summary>"Orta kateqoriya"</summary>
    public string? MiddleCategory { get; init; }

    /// <summary>"Alt kateqoriya"</summary>
    public string? SubCategory { get; init; }

    /// <summary>"Malın adı"</summary>
    public string? ProductName { get; init; }

    /// <summary>"Ölçü" — specification value, e.g. 50 or 40x40.</summary>
    public string? SpecificationValue { get; init; }

    /// <summary>"Vahid" — unit of the specification, e.g. sm.</summary>
    public string? SpecificationUnit { get; init; }

    /// <summary>"Model/Kod"</summary>
    public string? ModelCode { get; init; }

    /// <summary>"Miqdarı"</summary>
    public string? Quantity { get; init; }

    /// <summary>"Ö/v" — unit of the ordered quantity, e.g. ədəd or paçka.</summary>
    public string? OrderUnit { get; init; }

    /// <summary>"Qiyməti"</summary>
    public string? UnitPrice { get; init; }

    /// <summary>"Cəmi" — kept for validation only; never trusted as the line total.</summary>
    public string? LineTotal { get; init; }

    /// <summary>"Şirkət"</summary>
    public string? SupplierName { get; init; }

    /// <summary>"Obyekt"</summary>
    public string? LocationName { get; init; }

    /// <summary>"Tarix"</summary>
    public string? RequestDate { get; init; }

    /// <summary>"Cavabdeh şəxs"</summary>
    public string? ResponsiblePersonName { get; init; }

    /// <summary>
    /// Whether the sheet had a "Cavabdeh şəxs" column at all, which is not the same fact as an empty cell in one.
    /// </summary>
    /// <remarks>Null only where nobody looked: a reader that knows always says true or false.</remarks>
    public bool? HasResponsiblePersonColumn { get; init; }

    /// <summary>"Növ" — "Aylıq sifariş" or "Aylıqdan kənar", as written. Absent in older workbooks.</summary>
    public string? OrderLineType { get; init; }

    /// <summary>
    /// Whether the sheet had a "Növ" column at all, which is not the same fact as an empty cell in one.
    /// </summary>
    /// <remarks>Null only where nobody looked: a reader that knows always says true or false.</remarks>
    public bool? HasOrderLineTypeColumn { get; init; }
}
