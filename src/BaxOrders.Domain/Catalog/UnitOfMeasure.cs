namespace BaxOrders.Domain.Catalog;

/// <summary>
/// A unit used either for a product specification ("Vahid": sm, ml) or for an ordered quantity ("Ö/v": ədəd, paçka).
/// </summary>
/// <remarks>
/// <see cref="Code"/> is an immutable business identifier: it is part of every persisted product variant key.
/// </remarks>
public sealed class UnitOfMeasure
{
    public const int CodeMaxLength = 16;
    public const int NameMaxLength = 64;
    public const int SymbolMaxLength = 16;

    private UnitOfMeasure()
    {
    }

    public UnitOfMeasure(string code, string name, string symbol, UnitType unitType)
    {
        Code = Guard.Code(code, CodeMaxLength, nameof(Code));
        Name = Guard.RequiredText(name, NameMaxLength, nameof(Name));
        Symbol = Guard.RequiredText(symbol, SymbolMaxLength, nameof(Symbol));
        UnitType = Guard.DefinedEnum(unitType, nameof(UnitType));
        IsActive = true;
    }

    public int Id { get; private set; }

    public string Code { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public string Symbol { get; private set; } = null!;

    public UnitType UnitType { get; private set; }

    public bool IsActive { get; private set; }

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;
}
