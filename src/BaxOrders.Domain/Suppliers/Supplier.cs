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
    }

    public int Id { get; private set; }

    public string? Code { get; private set; }

    public string Name { get; private set; } = null!;

    public string NormalizedName { get; private set; } = null!;

    public bool IsActive { get; private set; }

    public DateTime CreatedAtUtc { get; private set; }

    public DateTime UpdatedAtUtc { get; private set; }

    public void Rename(string name)
    {
        Name = Guard.RequiredText(name, NameMaxLength, nameof(Name));
        NormalizedName = Guard.NormalizedName(Name, NameMaxLength, nameof(Name));
    }

    public void ChangeCode(string? code) => Code = Guard.OptionalCode(code, CodeMaxLength, nameof(Code));

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;
}
