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

    /// <param name="pricingMode">
    /// The mode the line starts with, used as given. An import always passes it (brief 16: nothing is classified by
    /// source). Null is only for a line built by hand, which keeps the supplier's seed below.
    /// </param>
    /// <param name="orderLineType">
    /// What kind of demand the line is. An import always passes it, and passes
    /// <see cref="OrderLineType.Unclassified"/> when the workbook says nothing — a file is never guessed at.
    /// A line built by hand is the ordinary case, the month's planned material, and the person adding it is
    /// shown that as the choice already made and may change it before the request is sent.
    /// </param>
    internal OrderRequestItem(
        OrderRequest orderRequest,
        ProductVariant productVariant,
        Supplier? supplier,
        decimal quantity,
        decimal? unitPrice,
        string? originalProductName,
        string? notes,
        PricingMode? pricingMode = null,
        OrderLineType orderLineType = OrderLineType.Monthly)
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
        // A supplier that is known never to charge seeds a line built by hand; from then on the line owns the
        // answer, because one supplier can be both — see PricingMode for why this cannot live on the supplier.
        // An import never reaches the seed: it always states the mode, and states it without reading the source.
        PricingMode = pricingMode is { } given
            ? ValidInitialMode(given, UnitPrice)
            : supplier?.PriceRequirement == SupplierPriceRequirement.NotRequired
                ? PricingMode.InternalFreeSupply
                : PricingMode.PriceRequired;
        OriginalProductName = Guard.OptionalText(originalProductName, OriginalProductNameMaxLength, nameof(OriginalProductName));
        Notes = Guard.OptionalText(notes, NotesMaxLength, nameof(Notes));
        OrderLineType = ValidLineType(orderLineType);
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

    /// <summary>
    /// Whether this line is expected to carry a purchase price at all.
    /// </summary>
    /// <remarks>
    /// The authoritative answer, and the only one any count or warning consults. A null
    /// <see cref="UnitPrice"/> beside <see cref="PricingMode.InternalFreeSupply"/> is a complete line, not a
    /// missing one.
    /// </remarks>
    public PricingMode PricingMode { get; private set; } = PricingMode.PriceRequired;

    /// <summary>
    /// Whether this line is the month's planned material or was asked for on top of the plan.
    /// </summary>
    /// <remarks>
    /// Like <see cref="PricingMode"/>, it belongs to the line rather than the request, because one request
    /// routinely holds both kinds. It is never inferred — see <see cref="OrderLineType"/>.
    /// </remarks>
    public OrderLineType OrderLineType { get; private set; } = OrderLineType.Unclassified;

    /// <summary>
    /// What this line's price situation is, read through the one rule the whole system shares.
    /// </summary>
    public OrderLinePricingState PricingState => OrderLinePricing.Classify(UnitPrice, PricingMode);

    /// <summary>True when this line still owes a price nobody has given it.</summary>
    /// <remarks>An unreviewed line counts here: not knowing is not the same as knowing none is owed.</remarks>
    public bool IsMissingRequiredPrice => PricingState.IsWarning();

    /// <summary>True when this line carries no price because none was ever owed.</summary>
    public bool IsInternalFreeSupply => PricingState.IsInternalSupply();

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
        // A correction inherits how its source was supplied; changing that is its own decision.
        PricingMode = PricingMode,
        // And whether it was planned for the month. A correction that lost this would quietly drop the line
        // out of the monthly figures it has always been counted in.
        OrderLineType = OrderLineType,
        OriginalProductName = OriginalProductName,
        Notes = Notes,
        SourceOrderRequestItem = this,
        SourceOrderRequestItemId = Id > 0 ? Id : null,
    };

    internal void ChangeQuantity(decimal quantity) => Quantity = ValidQuantity(quantity);

    /// <remarks>
    /// Moving a line back to <see cref="OrderLineType.Unclassified"/> is allowed: a person who no longer
    /// stands behind a classification should be able to say so rather than pick the less wrong of two.
    /// </remarks>
    internal void ChangeOrderLineType(OrderLineType orderLineType) => OrderLineType = ValidLineType(orderLineType);

    private static OrderLineType ValidLineType(OrderLineType orderLineType) =>
        Enum.IsDefined(orderLineType)
            ? orderLineType
            : throw new DomainException($"'{orderLineType}' is not an order line type this system knows.");

    /// <remarks>Null means the price is not known. It is never turned into zero, which would be a price.</remarks>
    internal void ChangeUnitPrice(decimal? unitPrice) => UnitPrice = ValidUnitPrice(unitPrice);

    /// <summary>
    /// Records what this line's supply actually is, and who said so. The only way the mode moves.
    /// </summary>
    /// <remarks>
    /// Deliberately public on the item rather than internal to a revision: this is a statement about a line
    /// that may be years old and long approved, not an edit to what was ordered. It touches no price, no
    /// quantity and no status.
    /// </remarks>
    /// <returns>The decision written, or null when the line already said this.</returns>
    public OrderItemPricingDecision? SetPricingMode(
        PricingMode mode, WorkflowActor actor, string? reason, DateTime utcNow)
    {
        if (!Enum.IsDefined(mode))
        {
            throw new DomainException($"'{mode}' is not a pricing mode this system knows.");
        }

        if (UnitPrice is not null && mode is PricingMode.InternalFreeSupply)
        {
            // A recorded price is the strongest possible statement that this line was bought.
            throw new DomainException(
                "This line carries a price, so it cannot be recorded as supplied free of charge.");
        }

        if (PricingMode == mode)
        {
            return null;
        }

        var previous = PricingMode;
        PricingMode = mode;
        return new OrderItemPricingDecision(this, previous, mode, actor, reason, utcNow);
    }

    internal void ChangeSupplier(Supplier? supplier)
    {
        if (supplier is { IsActive: false })
        {
            throw new DomainException($"Supplier '{supplier.Name}' is inactive.");
        }

        Supplier = supplier;
        SupplierId = supplier is { Id: > 0 } ? supplier.Id : null;
    }

    private static PricingMode ValidInitialMode(PricingMode mode, decimal? unitPrice)
    {
        if (!Enum.IsDefined(mode))
        {
            throw new DomainException($"'{mode}' is not a pricing mode this system knows.");
        }

        if (unitPrice is not null && mode is PricingMode.InternalFreeSupply)
        {
            // The same refusal as SetPricingMode: a recorded price says this line was bought.
            throw new DomainException(
                "This line carries a price, so it cannot be recorded as supplied free of charge.");
        }

        return mode;
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
