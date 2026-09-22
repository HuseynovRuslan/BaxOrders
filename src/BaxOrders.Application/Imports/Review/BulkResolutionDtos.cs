using BaxOrders.Domain.Imports;

namespace BaxOrders.Application.Imports.Review;

/// <summary>What an operator asks for one distinct source value inside a bulk operation.</summary>
public enum BulkResolutionAction
{
    /// <summary>Point the value at an existing canonical record the operator picked.</summary>
    MapExisting,

    /// <summary>
    /// Create the record the value stands for. For a name-like value that is a record named exactly as the sheet
    /// spells it; for a product variant it is the variant its resolved product and units describe. Nothing is
    /// invented: the name comes from the staged rows and codes come from the sequences.
    /// </summary>
    CreateFromValue,
}

/// <param name="TargetId">Required for <see cref="BulkResolutionAction.MapExisting"/>, forbidden otherwise.</param>
/// <param name="Scope">BatchOnly by default; GlobalAlias is only honoured for a mapping the operator marked so.</param>
public sealed record BulkResolutionItem(
    ImportResolutionKind Kind,
    string SourceKey,
    BulkResolutionAction Action,
    long? TargetId = null,
    ResolutionScope Scope = ResolutionScope.BatchOnly);

/// <summary>The explicit list of decisions an operator selected. The server never widens it.</summary>
public sealed record BulkResolutionRequest(IReadOnlyList<BulkResolutionItem> Items);

public enum BulkItemStatus
{
    /// <summary>Can be applied as asked.</summary>
    Ready,

    /// <summary>The same decision is already stored for this value; applying it again changes nothing.</summary>
    AlreadyResolved,

    /// <summary>A decision this value depends on is still missing (product or units of a variant).</summary>
    DependencyBlocked,

    /// <summary>Applying it would contradict existing data; the whole operation is refused.</summary>
    Conflict,

    /// <summary>No staged row of this batch carries the value any more.</summary>
    NotFound,
}

/// <param name="DisplayValue">The spelling the operator sees: most common in the sheet, ties by first appearance.</param>
/// <param name="SourceSpellings">How many different raw spellings of the sheet fall into this one value.</param>
/// <param name="TargetLabel">The existing record it would point at, or the record that would be created.</param>
public sealed record BulkPreviewItem(
    ImportResolutionKind Kind,
    string SourceKey,
    string DisplayValue,
    int AffectedRowCount,
    BulkResolutionAction Action,
    BulkItemStatus Status,
    string? TargetLabel,
    bool CreatesRecord,
    bool CreatesAlias,
    string? Problem = null,
    string? ParentLabel = null,
    int SourceSpellings = 1);

public sealed record BulkPreviewSummary(
    int Selected,
    int Ready,
    int Conflicts,
    int AlreadyResolved,
    int DependencyBlocked,
    int RecordsToCreate,
    int AliasesToCreate,
    int RowsAffected);

public sealed record BulkPreviewResult(BulkPreviewSummary Summary, IReadOnlyList<BulkPreviewItem> Items);

/// <param name="SkippedItems">Values that already carried the same decision.</param>
public sealed record BulkApplyResult(
    int AppliedItems,
    int SkippedItems,
    int CreatedRecords,
    int AliasesSaved,
    int RowsRematched,
    ImportPreview Preview,
    IReadOnlyList<BulkPreviewItem> Items);

/// <summary>
/// A bulk operation was refused as a whole. It carries the offending items so the operator sees which values
/// caused it; nothing was written.
/// </summary>
public sealed class BulkResolutionConflictException(string message, IReadOnlyList<BulkPreviewItem> items) : Exception(message)
{
    public IReadOnlyList<BulkPreviewItem> Items { get; } = items;
}
