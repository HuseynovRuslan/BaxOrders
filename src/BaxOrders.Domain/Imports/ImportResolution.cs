namespace BaxOrders.Domain.Imports;

/// <summary>
/// A human decision for one distinct unresolved source value of an import batch
/// ("Green Gardem" → supplier #12). It applies to every staged row of the batch with the same source key.
/// </summary>
/// <remarks>
/// (ImportBatchId, Kind, SourceKeyHash) is unique, so two different decisions for the same value can never both
/// be stored. Exactly one target column is set, chosen by <see cref="Kind"/>.
/// </remarks>
public sealed class ImportResolution
{
    public const int SourceKeyMaxLength = 4000;
    public const int SourceKeyHashLength = 64;

    private ImportResolution()
    {
    }

    public ImportResolution(
        long importBatchId,
        ImportResolutionKind kind,
        string sourceKey,
        ResolutionScope scope,
        ResolutionAction action,
        long targetId)
    {
        if (action == ResolutionAction.MarkNotAUnit)
        {
            throw new DomainException($"Use {nameof(NotAUnit)} for a value that is not a unit; it has no target record.");
        }

        if (targetId <= 0)
        {
            throw new DomainException("An import resolution requires a saved target record.");
        }

        Initialize(importBatchId, kind, sourceKey, scope, action);

        switch (Kind)
        {
            case ImportResolutionKind.Location: LocationId = ToInt(targetId); break;
            case ImportResolutionKind.Supplier: SupplierId = ToInt(targetId); break;
            case ImportResolutionKind.ResponsiblePerson: ResponsiblePersonId = ToInt(targetId); break;
            case ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit: UnitOfMeasureId = ToInt(targetId); break;
            case ImportResolutionKind.CategoryPath: CategoryId = ToInt(targetId); break;
            case ImportResolutionKind.Product: ProductId = targetId; break;
            case ImportResolutionKind.ProductVariant: ProductVariantId = targetId; break;
        }
    }

    /// <summary>
    /// Records that a value in a unit column is not a unit of measure. Nothing is created and no target is set:
    /// in "Vahid" the value stays as a specification descriptor, in "Ö/v" the line becomes explicitly unitless.
    /// </summary>
    /// <remarks>
    /// Always <see cref="ResolutionScope.BatchOnly"/>: a global alias points a spelling at a record, and this
    /// decision has no record to point at. The next import decides again, with its own rows in front of it.
    /// </remarks>
    public static ImportResolution NotAUnit(long importBatchId, ImportResolutionKind kind, string sourceKey)
    {
        if (kind is not (ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit))
        {
            throw new DomainException($"Only a unit column can hold a value that is not a unit; {kind} cannot.");
        }

        var resolution = new ImportResolution();
        resolution.Initialize(importBatchId, kind, sourceKey, ResolutionScope.BatchOnly, ResolutionAction.MarkNotAUnit);
        return resolution;
    }

    private void Initialize(
        long importBatchId, ImportResolutionKind kind, string sourceKey, ResolutionScope scope, ResolutionAction action)
    {
        if (importBatchId <= 0)
        {
            throw new DomainException("An import resolution requires a saved import batch.");
        }

        if (string.IsNullOrEmpty(sourceKey))
        {
            throw new DomainException("An import resolution requires a source key.");
        }

        if (sourceKey.Length > SourceKeyMaxLength)
        {
            throw new DomainException($"The source key must not exceed {SourceKeyMaxLength} characters.");
        }

        Kind = Guard.DefinedEnum(kind, nameof(Kind));
        Action = Guard.DefinedEnum(action, nameof(Action));
        Scope = Guard.DefinedEnum(scope, nameof(Scope));
        EnsureScopeAllowed(Kind, Scope);

        ImportBatchId = importBatchId;
        SourceKey = sourceKey;
        SourceKeyHash = ImportSourceKeys.Hash(sourceKey);
    }

    public long Id { get; private set; }

    public long ImportBatchId { get; private set; }

    public ImportResolutionKind Kind { get; private set; }

    /// <summary>The distinct value, as produced by <see cref="ImportSourceKeys"/>.</summary>
    public string SourceKey { get; private set; } = null!;

    public string SourceKeyHash { get; private set; } = null!;

    public ResolutionScope Scope { get; private set; }

    public ResolutionAction Action { get; private set; }

    public int? LocationId { get; private set; }

    public int? SupplierId { get; private set; }

    public int? ResponsiblePersonId { get; private set; }

    public int? UnitOfMeasureId { get; private set; }

    public int? CategoryId { get; private set; }

    public long? ProductId { get; private set; }

    public long? ProductVariantId { get; private set; }

    public DateTime CreatedAtUtc { get; private set; }

    /// <summary>The id of the record the value was resolved to, or 0 when the decision has no target.</summary>
    public long TargetId => LocationId ?? SupplierId ?? ResponsiblePersonId ?? UnitOfMeasureId ?? CategoryId ?? ProductId ?? ProductVariantId ?? 0;

    /// <summary>True when the operator confirmed the value is not a unit of measure.</summary>
    public bool IsNotAUnit => Action == ResolutionAction.MarkNotAUnit;

    /// <summary>Records that the same decision was later also saved as an alias.</summary>
    public void PromoteToGlobalAlias()
    {
        if (IsNotAUnit)
        {
            throw new DomainException("A value that is not a unit has no record to alias.");
        }

        EnsureScopeAllowed(Kind, ResolutionScope.GlobalAlias);
        Scope = ResolutionScope.GlobalAlias;
    }

    private static void EnsureScopeAllowed(ImportResolutionKind kind, ResolutionScope scope)
    {
        if (scope == ResolutionScope.GlobalAlias && kind is ImportResolutionKind.CategoryPath or ImportResolutionKind.ProductVariant)
        {
            throw new DomainException($"A {kind} decision cannot be saved as a global alias; it applies to this import only.");
        }
    }

    private static int ToInt(long targetId) =>
        targetId <= int.MaxValue ? (int)targetId : throw new DomainException("The target id is out of range.");
}
