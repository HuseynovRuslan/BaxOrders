namespace BaxOrders.Domain.Suppliers;

/// <summary>
/// A spelling an operator has confirmed to mean a supplier ("Cleanfix" → "Cleanfix MMC"),
/// so later imports resolve it without asking again.
/// </summary>
/// <remarks>
/// Aliases record human decisions and are never inferred automatically. Normalized aliases are unique
/// across all suppliers, so one spelling can never point at two suppliers.
/// </remarks>
public sealed class SupplierAlias
{
    public const int AliasMaxLength = Supplier.NameMaxLength;

    private SupplierAlias()
    {
    }

    public SupplierAlias(Supplier supplier, string alias)
    {
        ArgumentNullException.ThrowIfNull(supplier);

        if (!supplier.IsActive)
        {
            throw new DomainException($"Cannot add an alias to inactive supplier '{supplier.Name}'.");
        }

        Alias = Guard.RequiredText(alias, AliasMaxLength, nameof(Alias));
        NormalizedAlias = Guard.NormalizedName(Alias, AliasMaxLength, nameof(Alias));

        if (NormalizedAlias == supplier.NormalizedName)
        {
            throw new DomainException($"'{Alias}' already matches the name of supplier '{supplier.Name}'.");
        }

        Supplier = supplier;
        SupplierId = supplier.Id;
    }

    public int Id { get; private set; }

    public int SupplierId { get; private set; }

    public Supplier Supplier { get; private set; } = null!;

    public string Alias { get; private set; } = null!;

    public string NormalizedAlias { get; private set; } = null!;

    public DateTime CreatedAtUtc { get; private set; }
}
