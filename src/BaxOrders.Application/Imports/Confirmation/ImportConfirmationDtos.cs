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

/// <param name="MissingPriceItemCount">
/// Task 2's «qiymət yoxdur» for this group: unpriced rows nobody classified plus those said to be bought. Always
/// <see cref="UnclassifiedPriceItemCount"/> + <see cref="PriceRequiredItemCount"/>.
/// </param>
/// <param name="ProposedVersion">The version the server would write, or null when the group needs a decision.</param>
/// <param name="RequiredDecision">Null when the default action needs no confirmation of its own.</param>
/// <param name="UnclassifiedPriceItemCount">Unpriced rows nobody classified: «Təsnif edilməyib» once imported.</param>
/// <param name="PriceRequiredItemCount">Unpriced rows a reviewer said are bought.</param>
/// <param name="InternalSupplyItemCount">Unpriced rows a reviewer said are supplied free. Never a warning.</param>
/// <param name="MonthlyItemCount">Rows this group would import as the month's planned material.</param>
/// <param name="OutsideMonthlyItemCount">Rows it would import as ordered on top of the plan.</param>
/// <param name="UnclassifiedLineTypeItemCount">
/// Rows whose «Növ» cell says nothing this system can read, so they would arrive «Təsnif edilməyib». Said here
/// because this is the screen where the group is confirmed: the operator should not have to open the rows to
/// find out that a whole month arrives unclassified.
/// </param>
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
    GroupDecisionAction? RequiredDecision,
    int UnclassifiedPriceItemCount,
    int PriceRequiredItemCount,
    int InternalSupplyItemCount,
    int MonthlyItemCount,
    int OutsideMonthlyItemCount,
    int UnclassifiedLineTypeItemCount);

/// <summary>
/// Everything the operator needs before turning staged rows into orders. Reads only; nothing is written.
/// </summary>
/// <param name="RowsToImport">Included rows that would become items, before any group is skipped.</param>
/// <param name="MissingPriceRows">
/// Task 2's «N sətirdə qiymət yoxdur» over the rows to import, before any group is skipped: always
/// <see cref="UnclassifiedPriceRows"/> + <see cref="PriceRequiredRows"/>.
/// </param>
/// <param name="CanConfirm">
/// False only for a reason the operator cannot wave through: the batch is not ready, or a group needs a
/// decision that has not been given. Warnings never make it false.
/// </param>
/// <param name="UnclassifiedPriceRows">
/// Rows that will land on Qiymət təsnifatı as «Təsnif edilməyib», before any group is skipped. A skipped group's
/// share is its <see cref="ConfirmationGroupPreview.UnclassifiedPriceItemCount"/>.
/// </param>
/// <param name="PriceRequiredRows">Rows that will land as «Alış qiyməti tələb olunur», before any group is skipped.</param>
/// <param name="InternalSupplyRows">Rows that will land as «Ödənişsiz daxili təminat», before any group is skipped.</param>
/// <param name="MonthlyRows">Rows that would be imported as the month's planned material, before any group is skipped.</param>
/// <param name="OutsideMonthlyRows">Rows that would be imported as ordered on top of the plan.</param>
/// <param name="UnclassifiedLineTypeRows">
/// Rows that would arrive «Təsnif edilməyib» because the source says nothing readable about them. Never inferred
/// from the month or from anything else — see the classification rules.
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
    ImportConfirmationResult? Result,
    int UnclassifiedPriceRows,
    int PriceRequiredRows,
    int InternalSupplyRows,
    int MonthlyRows,
    int OutsideMonthlyRows,
    int UnclassifiedLineTypeRows);

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
/// <param name="MissingPriceItems">
/// Task 2's «qiymət yoxdur» over the lines actually written, after skips: always
/// <see cref="UnclassifiedPriceItems"/> + <see cref="PriceRequiredItems"/>. Zero on a replay, as every count here.
/// </param>
/// <param name="UnclassifiedPriceItems">Lines written as «Təsnif edilməyib»: the work left on Qiymət təsnifatı.</param>
/// <param name="PriceRequiredItems">Unpriced lines written as bought, as a reviewer said.</param>
/// <param name="InternalSupplyItems">Unpriced lines written as supplied free, as a reviewer said.</param>
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
    long DurationMilliseconds,
    int UnclassifiedPriceItems,
    int PriceRequiredItems,
    int InternalSupplyItems);
