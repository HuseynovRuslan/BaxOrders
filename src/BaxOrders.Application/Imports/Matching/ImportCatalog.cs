using BaxOrders.Domain.Normalization;

namespace BaxOrders.Application.Imports.Matching;

/// <summary>
/// In-memory snapshot of the canonical records an import is matched against, loaded once per import.
/// </summary>
public sealed class ImportCatalog
{
    private readonly Dictionary<int, string> _unitCodes = [];
    private readonly Dictionary<(long ProductId, string Key), long> _variantIds = [];

    public NameIndex<int> Locations { get; } = new();

    public NameIndex<int> Suppliers { get; } = new();

    public NameIndex<int> ResponsiblePeople { get; } = new();

    /// <summary>Units by code, name, symbol and approved alias.</summary>
    public NameIndex<int> Units { get; } = new();

    public NameIndex<long> Products { get; } = new();

    public CategoryPathIndex Categories { get; } = new();

    public void AddUnit(int id, string code, string name, string symbol)
    {
        _unitCodes[id] = code;
        Units.Add(TextNormalizer.Normalize(code), id);
        Units.Add(TextNormalizer.Normalize(name), id);
        Units.Add(TextNormalizer.Normalize(symbol), id);
    }

    public string UnitCode(int unitId) => _unitCodes[unitId];

    /// <summary>False when the unit is not active in the catalog (for example deactivated after a review decision).</summary>
    public bool TryGetUnitCode(int unitId, out string code)
    {
        if (_unitCodes.TryGetValue(unitId, out var found))
        {
            code = found;
            return true;
        }

        code = string.Empty;
        return false;
    }

    public void AddVariant(long productId, string normalizedVariantKey, long variantId) =>
        _variantIds[(productId, normalizedVariantKey)] = variantId;

    public long? FindVariant(long productId, string normalizedVariantKey) =>
        _variantIds.TryGetValue((productId, normalizedVariantKey), out var id) ? id : null;
}
