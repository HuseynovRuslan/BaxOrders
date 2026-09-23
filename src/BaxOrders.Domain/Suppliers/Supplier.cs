namespace BaxOrders.Domain.Suppliers;

/// <summary>
/// A company materials are bought from ("Şirkət" in Excel). Never deleted; deactivate instead.
/// </summary>
public sealed class Supplier
{
    public const int CodeMaxLength = 32;
    public const int NameMaxLength = 300;

    private Supplier()
    {
    }

    public Supplier(string name, string? code = null)
    {
        Rename(name);
        ChangeCode(code);
        IsActive = true;
        // Everything is bought from outside until somebody says otherwise. A supplier that turns out to be the
        // company's own store is marked as such deliberately, by a person, and never inferred from its name.
        PriceRequirement = SupplierPriceRequirement.Required;
    }

    public int Id { get; private set; }

    public string? Code { get; private set; }

    public string Name { get; private set; } = null!;

    public string NormalizedName { get; private set; } = null!;

    public bool IsActive { get; private set; }

    /// <summary>
    /// Whether a purchase price is expected on lines supplied by this company.
    /// </summary>
    /// <remarks>
    /// Changing this changes what the whole system calls a missing price, so it is a decision somebody makes
    /// and not a value that drifts. <see cref="ChangePriceRequirement"/> is the only way to move it.
    /// </remarks>
    public SupplierPriceRequirement PriceRequirement { get; private set; } = SupplierPriceRequirement.Required;

    public DateTime CreatedAtUtc { get; private set; }

    public DateTime UpdatedAtUtc { get; private set; }

    public void Rename(string name)
    {
        Name = Guard.RequiredText(name, NameMaxLength, nameof(Name));
        NormalizedName = Guard.NormalizedName(Name, NameMaxLength, nameof(Name));
    }

    public void ChangeCode(string? code) => Code = Guard.OptionalCode(code, CodeMaxLength, nameof(Code));

    /// <summary>Records that this supplier does, or does not, need a purchase price on its lines.</summary>
    /// <returns>False when it already says that, so a caller can avoid writing an audit entry for nothing.</returns>
    public bool ChangePriceRequirement(SupplierPriceRequirement requirement)
    {
        if (!Enum.IsDefined(requirement))
        {
            throw new DomainException($"'{requirement}' is not a price requirement this system knows.");
        }

        if (PriceRequirement == requirement)
        {
            return false;
        }

        PriceRequirement = requirement;
        return true;
    }

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;
}
