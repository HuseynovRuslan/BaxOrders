namespace BaxOrders.Domain.ResponsiblePeople;

/// <summary>
/// A spelling an operator has confirmed to mean a responsible person ("Eldar M." → "Eldar Məmmədov"),
/// so later imports resolve it without asking again.
/// </summary>
/// <remarks>
/// Aliases record human decisions and are never inferred automatically. Normalized aliases are unique
/// across all responsible persons, so one spelling can never point at two people.
/// </remarks>
public sealed class ResponsiblePersonAlias
{
    public const int AliasMaxLength = ResponsiblePerson.NameMaxLength;

    private ResponsiblePersonAlias()
    {
    }

    public ResponsiblePersonAlias(ResponsiblePerson responsiblePerson, string alias)
    {
        ArgumentNullException.ThrowIfNull(responsiblePerson);

        if (!responsiblePerson.IsActive)
        {
            throw new DomainException($"Cannot add an alias to inactive responsible person '{responsiblePerson.Name}'.");
        }

        Alias = Guard.RequiredText(alias, AliasMaxLength, nameof(Alias));
        NormalizedAlias = Guard.NormalizedName(Alias, AliasMaxLength, nameof(Alias));

        if (NormalizedAlias == responsiblePerson.NormalizedName)
        {
            throw new DomainException($"'{Alias}' already matches the name of '{responsiblePerson.Name}'.");
        }

        ResponsiblePerson = responsiblePerson;
        ResponsiblePersonId = responsiblePerson.Id;
    }

    public int Id { get; private set; }

    public int ResponsiblePersonId { get; private set; }

    public ResponsiblePerson ResponsiblePerson { get; private set; } = null!;

    public string Alias { get; private set; } = null!;

    public string NormalizedAlias { get; private set; } = null!;

    public DateTime CreatedAtUtc { get; private set; }
}
