namespace BaxOrders.Domain.Catalog;

/// <summary>
/// An approved spelling that maps to a unit ("əd", "ədəd" → PCS). Normalized aliases are globally unique,
/// so one spelling can never point at two units.
/// </summary>
public sealed class UnitOfMeasureAlias
{
    public const int AliasMaxLength = 64;

    private UnitOfMeasureAlias()
    {
    }

    public UnitOfMeasureAlias(UnitOfMeasure unitOfMeasure, string alias)
    {
        ArgumentNullException.ThrowIfNull(unitOfMeasure);

        UnitOfMeasure = unitOfMeasure;
        UnitOfMeasureId = unitOfMeasure.Id;
        Alias = Guard.RequiredText(alias, AliasMaxLength, nameof(Alias));
        NormalizedAlias = Guard.NormalizedName(Alias, AliasMaxLength, nameof(Alias));
    }

    public int Id { get; private set; }

    public int UnitOfMeasureId { get; private set; }

    public UnitOfMeasure UnitOfMeasure { get; private set; } = null!;

    public string Alias { get; private set; } = null!;

    public string NormalizedAlias { get; private set; } = null!;

    public DateTime CreatedAtUtc { get; private set; }
}
