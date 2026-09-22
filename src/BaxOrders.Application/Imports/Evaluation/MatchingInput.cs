using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Imports;

namespace BaxOrders.Application.Imports.Evaluation;

/// <summary>
/// The source text that identity matching needs. It can be built from a workbook row during upload or from a
/// staged row during review, so matching never needs the Excel file again.
/// </summary>
public sealed record MatchingInput(
    string? LocationName,
    string? OrderUnit,
    string? SpecificationUnit,
    string? SupplierName,
    string? ResponsiblePersonName,
    string? MainCategory,
    string? MiddleCategory,
    string? SubCategory,
    string? ProductName,
    string? SpecificationValue,
    string? ModelCode,
    bool OrderUnitExplicitlyEmpty = false)
{
    public static MatchingInput From(IRowValues row) => new(
        row.Text(ImportField.Location),
        row.Text(ImportField.OrderUnit),
        row.Text(ImportField.SpecificationUnit),
        row.Text(ImportField.Supplier),
        row.Text(ImportField.ResponsiblePerson),
        row.Text(ImportField.MainCategory),
        row.Text(ImportField.MiddleCategory),
        row.Text(ImportField.SubCategory),
        row.Text(ImportField.ProductName),
        row.Text(ImportField.SpecificationValue),
        row.Text(ImportField.ModelCode),
        row.IsExplicitlyEmpty(ImportField.OrderUnit));

    /// <summary>
    /// A staged row is matched by its effective values, so an operator's correction decides the identity and a
    /// corrected row never inherits the decision made for the value it used to carry.
    /// </summary>
    public static MatchingInput From(ImportRow row) => From(EffectiveRowValues.Of(row));
}

/// <summary>Review decisions of one import batch, by kind and source key.</summary>
public sealed class ImportResolutionSet
{
    private readonly Dictionary<(ImportResolutionKind Kind, string SourceKey), long> _targets;
    private readonly HashSet<(ImportResolutionKind Kind, string SourceKey)> _notAUnit;

    public ImportResolutionSet(IEnumerable<(ImportResolutionKind Kind, string SourceKey, long TargetId)> resolutions)
        : this(resolutions, [])
    {
    }

    /// <param name="notAUnit">Values an operator confirmed are not a unit of measure; they have no target.</param>
    public ImportResolutionSet(
        IEnumerable<(ImportResolutionKind Kind, string SourceKey, long TargetId)> resolutions,
        IEnumerable<(ImportResolutionKind Kind, string SourceKey)> notAUnit)
    {
        _targets = resolutions.ToDictionary(r => (r.Kind, r.SourceKey), r => r.TargetId);
        _notAUnit = [.. notAUnit];
    }

    public static ImportResolutionSet Empty { get; } = new([]);

    /// <summary>True when the review confirmed this value is not a unit of measure.</summary>
    public bool IsNotAUnit(ImportResolutionKind kind, string? sourceKey) =>
        sourceKey is not null && _notAUnit.Contains((kind, sourceKey));

    public bool TryGetTarget(ImportResolutionKind kind, string? sourceKey, out long targetId)
    {
        targetId = 0;
        return sourceKey is not null && _targets.TryGetValue((kind, sourceKey), out targetId);
    }

    /// <summary>Every record this batch already points at for one kind, for example the products to load variants for.</summary>
    public IReadOnlyCollection<long> TargetsOf(ImportResolutionKind kind) =>
        [.. _targets.Where(target => target.Key.Kind == kind).Select(target => target.Value).Distinct()];
}
