using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;

namespace BaxOrders.Application.Imports.Review;

/// <param name="Scope">
/// BatchOnly applies the decision to this import; GlobalAlias also saves the incoming spelling as an alias,
/// so later imports resolve it without asking again.
/// </param>
public sealed record ResolveToExistingCommand(long ImportBatchId, string SourceKey, long TargetId, ResolutionScope Scope);

/// <summary>
/// Records that a value standing in a unit column is not a unit of measure. In "Vahid" it stays as a
/// specification descriptor; in "Ö/v" the lines become explicitly unitless. Nothing is created.
/// </summary>
public sealed record MarkNotAUnitCommand(long ImportBatchId, ImportResolutionKind Kind, string SourceKey);

public sealed record CreateLocationCommand(long ImportBatchId, string SourceKey, string Name, ResolutionScope Scope);

public sealed record CreateSupplierCommand(long ImportBatchId, string SourceKey, string Name, string? Code, ResolutionScope Scope);

public sealed record CreateResponsiblePersonCommand(long ImportBatchId, string SourceKey, string Name, ResolutionScope Scope);

/// <param name="Kind">OrderUnit or SpecificationUnit: the column the value came from.</param>
public sealed record CreateUnitCommand(
    long ImportBatchId,
    ImportResolutionKind Kind,
    string SourceKey,
    string Code,
    string Name,
    string? Symbol,
    UnitType UnitType,
    ResolutionScope Scope);

/// <summary>Creates the missing levels of the path and reuses the levels that already exist.</summary>
public sealed record CreateCategoryPathCommand(long ImportBatchId, string SourceKey);

/// <param name="CategoryId">The category the operator picked for the new product, if any.</param>
public sealed record CreateProductCommand(long ImportBatchId, string SourceKey, string Name, int? CategoryId, ResolutionScope Scope);

/// <summary>
/// Creates the variant the staged rows of this value describe. It carries no identity fields: they come from
/// the decisions already made, so an operator cannot invent a variant the rows do not describe.
/// </summary>
public sealed record CreateProductVariantCommand(long ImportBatchId, string SourceKey);

public enum ResolutionOutcome
{
    Applied,

    /// <summary>The same decision was already stored; nothing changed.</summary>
    AlreadyApplied,
}

/// <param name="AffectedRows">Staged rows of the batch that carry this source value.</param>
/// <param name="AliasSaved">True when the incoming spelling was saved as an alias for future imports.</param>
public sealed record ResolutionResult(
    ResolutionOutcome Outcome,
    long ResolutionId,
    ImportResolutionKind Kind,
    string SourceKey,
    long TargetId,
    string TargetLabel,
    bool AliasSaved,
    int AffectedRows,
    ImportPreview Preview);
