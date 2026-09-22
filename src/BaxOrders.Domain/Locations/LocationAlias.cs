namespace BaxOrders.Domain.Locations;

/// <summary>
/// A spelling an operator has confirmed to mean a location ("HƏM" → "H.Ə.M"),
/// so later imports resolve it without asking again.
/// </summary>
/// <remarks>
/// Aliases record human decisions and are never inferred automatically. Normalized aliases are unique
/// across all locations, so one spelling can never point at two locations.
/// </remarks>
public sealed class LocationAlias
{
    public const int AliasMaxLength = Location.NameMaxLength;

    private LocationAlias()
    {
    }

    public LocationAlias(Location location, string alias)
    {
        ArgumentNullException.ThrowIfNull(location);

        if (!location.IsActive)
        {
            throw new DomainException($"Cannot add an alias to inactive location '{location.Name}'.");
        }

        Alias = Guard.RequiredText(alias, AliasMaxLength, nameof(Alias));
        NormalizedAlias = Guard.NormalizedName(Alias, AliasMaxLength, nameof(Alias));

        if (NormalizedAlias == location.NormalizedName)
        {
            throw new DomainException($"'{Alias}' already matches the name of location '{location.Name}'.");
        }

        Location = location;
        LocationId = location.Id;
    }

    public int Id { get; private set; }

    public int LocationId { get; private set; }

    public Location Location { get; private set; } = null!;

    public string Alias { get; private set; } = null!;

    public string NormalizedAlias { get; private set; } = null!;

    public DateTime CreatedAtUtc { get; private set; }
}
