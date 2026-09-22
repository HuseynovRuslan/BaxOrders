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

        if (quantity <= 0)
        {
            throw new DomainException("Quantity must be greater than zero.");
        }

        Guard.FitsDecimal(quantity, QuantityPrecision, QuantityScale, nameof(Quantity));

        if (unitPrice is { } price)
        {
            if (price < 0)
            {
                throw new DomainException("Unit price must not be negative.");
            }

            Guard.FitsDecimal(price, UnitPricePrecision, UnitPriceScale, nameof(UnitPrice));
        }

        OrderRequest = orderRequest;
        OrderRequestId = orderRequest.Id;
        ProductVariant = productVariant;
        ProductVariantId = productVariant.Id;
        Supplier = supplier;
        SupplierId = supplier is { Id: > 0 } ? supplier.Id : null;
        Quantity = quantity;
        UnitPrice = unitPrice;
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
    /// Canonical line total, always derived as Quantity × UnitPrice (unrounded) and never stored,
    /// so it cannot drift from its inputs. Null when the price is unknown.
    /// </summary>
    public decimal? LineTotal => UnitPrice is { } price ? Quantity * price : null;
}
