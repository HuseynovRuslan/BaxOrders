namespace BaxOrders.Domain.ResponsiblePeople;

/// <summary>
/// The person responsible for a request ("Cavabdeh şəxs"). A business record, not a login account.
/// </summary>
public sealed class ResponsiblePerson
{
    public const int NameMaxLength = 200;

    private ResponsiblePerson()
    {
    }

    public ResponsiblePerson(string name)
    {
        Rename(name);
        IsActive = true;
    }

    public int Id { get; private set; }

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
