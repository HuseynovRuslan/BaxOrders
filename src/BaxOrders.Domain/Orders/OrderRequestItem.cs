using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Suppliers;

namespace BaxOrders.Domain.Orders;

/// <summary>
/// One requested line: a quantity of a specific product variant, optionally with the price and supplier
/// valid at the time of the request. The price here is the historical truth for analytics.
/// </summary>
public sealed class OrderRequestItem
{
    public const int QuantityPrecision = 18;
    public const int QuantityScale = 3;
    public const int UnitPricePrecision = 18;
    public const int UnitPriceScale = 4;
    public const int OriginalProductNameMaxLength = 500;
    public const int NotesMaxLength = 1000;

    private OrderRequestItem()
    {
    }

    internal OrderRequestItem(
        OrderRequest orderRequest,
        ProductVariant productVariant,
        Supplier? supplier,
        decimal quantity,
        decimal? unitPrice,
        string? originalProductName,
        string? notes)
    {
        ArgumentNullException.ThrowIfNull(productVariant);

        if (!productVariant.IsActive)
        {
            throw new DomainException("An inactive product variant cannot be requested.");
        }

        if (supplier is { IsActive: false })
        {
            throw new DomainException($"Supplier '{supplier.Name}' is inactive.");
        }

        OrderRequest = orderRequest;
        OrderRequestId = orderRequest.Id;
        ProductVariant = productVariant;
        ProductVariantId = productVariant.Id;
        Supplier = supplier;
        SupplierId = supplier is { Id: > 0 } ? supplier.Id : null;
        Quantity = ValidQuantity(quantity);
        UnitPrice = ValidUnitPrice(unitPrice);
        OriginalProductName = Guard.OptionalText(originalProductName, OriginalProductNameMaxLength, nameof(OriginalProductName));
        Notes = Guard.OptionalText(notes, NotesMaxLength, nameof(Notes));
    }

    public long Id { get; private set; }

    public long OrderRequestId { get; private set; }

    public OrderRequest OrderRequest { get; private set; } = null!;

    public long ProductVariantId { get; private set; }

    public ProductVariant ProductVariant { get; private set; } = null!;

    public int? SupplierId { get; private set; }

    public Supplier? Supplier { get; private set; }

    /// <summary>Quantity expressed in the variant's order unit.</summary>
    public decimal Quantity { get; private set; }

    public decimal? UnitPrice { get; private set; }

    public string? OriginalProductName { get; private set; }

    public string? Notes { get; private set; }

    public DateTime CreatedAtUtc { get; private set; }

    /// <summary>
    /// The line of the previous version this line was copied from when a correction version was made. Null for
    /// a line that came from an import, and for one added by hand to a correction.
    /// </summary>
    /// <remarks>
    /// Points at the version immediately before, never straight at the first: a line of version 3 leads to its
    /// line in version 2, and that one to version 1. The chain is the history. Import provenance is not copied
    /// along it — a copied line has no workbook row of its own, and its origin is found by following the chain
    /// back to the line that has one.
    /// </remarks>
    public long? SourceOrderRequestItemId { get; private set; }

    public OrderRequestItem? SourceOrderRequestItem { get; private set; }

    /// <summary>
    /// Canonical line total, always derived as Quantity × UnitPrice (unrounded) and never stored,
    /// so it cannot drift from its inputs. Null when the price is unknown.
    /// </summary>
    public decimal? LineTotal => UnitPrice is { } price ? Quantity * price : null;

    /// <summary>
    /// This line, copied exactly into a correction version.
    /// </summary>
    /// <remarks>
    /// Nothing is re-checked or changed on the way: the same variant, quantity, price, supplier and source
    /// wording, even where a catalog record has been deactivated since. The copy states what the reviewed
    /// version said, and the person correcting it decides what to change — a deactivated variant is removed
    /// and replaced there, not silently dropped here.
    /// </remarks>
    internal OrderRequestItem CopyInto(OrderRequest revision) => new()
    {
        OrderRequest = revision,
        OrderRequestId = revision.Id,
        ProductVariant = ProductVariant,
        ProductVariantId = ProductVariantId,
        Supplier = Supplier,
        SupplierId = SupplierId,
        Quantity = Quantity,
        UnitPrice = UnitPrice,
        OriginalProductName = OriginalProductName,
        Notes = Notes,
        SourceOrderRequestItem = this,
        SourceOrderRequestItemId = Id > 0 ? Id : null,
    };

    internal void ChangeQuantity(decimal quantity) => Quantity = ValidQuantity(quantity);

    /// <remarks>Null means the price is not known. It is never turned into zero, which would be a price.</remarks>
    internal void ChangeUnitPrice(decimal? unitPrice) => UnitPrice = ValidUnitPrice(unitPrice);

    internal void ChangeSupplier(Supplier? supplier)
    {
        if (supplier is { IsActive: false })
        {
            throw new DomainException($"Supplier '{supplier.Name}' is inactive.");
        }

        Supplier = supplier;
        SupplierId = supplier is { Id: > 0 } ? supplier.Id : null;
    }

    private static decimal ValidQuantity(decimal quantity)
    {
        if (quantity <= 0)
        {
            throw new DomainException("Quantity must be greater than zero.");
        }

        Guard.FitsDecimal(quantity, QuantityPrecision, QuantityScale, nameof(Quantity));
        return quantity;
    }

    private static decimal? ValidUnitPrice(decimal? unitPrice)
    {
        if (unitPrice is { } price)
        {
            if (price < 0)
            {
                throw new DomainException("Unit price must not be negative.");
            }

            Guard.FitsDecimal(price, UnitPricePrecision, UnitPriceScale, nameof(UnitPrice));
        }

        return unitPrice;
    }
}
