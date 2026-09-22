using BaxOrders.Domain.Imports;

namespace BaxOrders.Application.Imports.Confirmation;

/// <summary>What the operator must still decide for one location + period group before the import can run.</summary>
public enum GroupConflictState
{
    /// <summary>No request exists for this location and period; version 1 will be created.</summary>
    New = 1,

    /// <summary>A request already exists. Nothing happens to it until the operator says what to do.</summary>
    ExistingRequest = 2,

    /// <summary>
    /// A request exists but is still a draft. The domain corrects a draft in place instead of versioning it,
    /// so this group cannot be imported until the draft is dealt with outside the import.
    /// </summary>
    ExistingDraft = 3,
}

/// <summary>What an operator may decide for one group.</summary>
public enum GroupDecisionAction
{
    /// <summary>Create the first version. Only valid when no request exists yet.</summary>
    Create = 1,

    /// <summary>Create the next version and leave every earlier one untouched.</summary>
    CreateNewVersion = 2,

    /// <summary>Deliberately import nothing for this group. Needs a reason.</summary>
    Skip = 3,
}

/// <param name="ProposedVersion">The version the server would write, or null when the group needs a decision.</param>
/// <param name="RequiredDecision">Null when the default action needs no confirmation of its own.</param>
public sealed record ConfirmationGroupPreview(
    int LocationId,
    string LocationCode,
    string LocationName,
    DateOnly RequestPeriod,
    int SourceRowCount,
    int KnownPriceItemCount,
    int MissingPriceItemCount,
    int PossibleDuplicateItemCount,
    decimal? KnownAmountTotal,
    bool ExistingRequest,
    int ExistingVersions,
    int? LatestVersion,
    int? ProposedVersion,
    GroupConflictState ConflictState,
    GroupDecisionAction? RequiredDecision);

/// <summary>
/// Everything the operator needs before turning staged rows into orders. Reads only; nothing is written.
/// </summary>
/// <param name="RowsToImport">Included rows that would become items, before any group is skipped.</param>
/// <param name="CanConfirm">
/// False only for a reason the operator cannot wave through: the batch is not ready, or a group needs a
/// decision that has not been given. Warnings never make it false.
/// </param>
public sealed record ImportConfirmationPreview(
    long ImportBatchId,
    ImportStatus BatchStatus,
    bool CanImport,
    int SourceRows,
    int IncludedRows,
    int ExcludedRows,
    int GroupCount,
    int RowsToImport,
    int KnownPriceRows,
    int MissingPriceRows,
    int PossibleDuplicateRows,
    int ResolvedSupplierRows,
    int MissingSupplierRows,
    int UnitlessVariantRows,
    int DescriptorVariantRows,
    int ExistingRequestConflictGroups,
    bool CanConfirm,
    bool AlreadyImported,
    IReadOnlyList<ConfirmationGroupPreview> Groups,
    ImportConfirmationResult? Result = null);

/// <param name="Reason">Required for <see cref="GroupDecisionAction.Skip"/>, forbidden otherwise.</param>
public sealed record ConfirmationGroupDecision(
    int LocationId,
    DateOnly RequestPeriod,
    GroupDecisionAction Action,
    string? Reason = null);

/// <param name="ExpectedRowsToImport">
/// What the operator saw in the preview. When it no longer matches the staged data the confirmation is
/// refused instead of importing something the operator never looked at. Optional.
/// </param>
public sealed record ImportConfirmationCommand(
    IReadOnlyList<ConfirmationGroupDecision> Decisions,
    int? ExpectedRowsToImport = null,
    int? ExpectedGroupCount = null);

/// <param name="AlreadyImported">True when this batch was already confirmed and nothing new was written.</param>
public sealed record ImportConfirmationResult(
    long ImportBatchId,
    ImportStatus BatchStatus,
    bool AlreadyImported,
    DateTime ConfirmedAtUtc,
    int CreatedRequests,
    int CreatedItems,
    int SkippedGroups,
    int SkippedRows,
    int MissingPriceItems,
    int PossibleDuplicateItems,
    int MissingSupplierItems,
    decimal? KnownAmountTotal,
    long DurationMilliseconds);
