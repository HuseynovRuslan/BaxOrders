namespace BaxOrders.Domain.Locations;

/// <summary>
/// An operational location / object of the company ("Ramana", "Maştağa", "H.Ə.M").
/// Never deleted: deactivate it so historical requests keep their location.
/// </summary>
public sealed class Location
{
    public const int CodeMaxLength = 32;
    public const int NameMaxLength = 200;

    private Location()
    {
    }

    public Location(string code, string name)
    {
        Code = Guard.Code(code, CodeMaxLength, nameof(Code));
        Rename(name);
        IsActive = true;
    }

    public int Id { get; private set; }

    public string Code { get; private set; } = null!;

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

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;
}
