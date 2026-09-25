using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Imports;

namespace BaxOrders.Application.Imports;

public sealed record ImportBatchSummary(
    long Id,
    string FileName,
    ImportStatus Status,
    int TotalRows,
    int ValidRows,
    int WarningRows,
    int InvalidRows,
    DateTime UploadedAtUtc,
    DateTime? CompletedAtUtc,
    string? FailureReason);

public sealed record ImportIssueCount(ImportIssueType IssueType, IssueSeverity Severity, int Count);

public enum GroupSuggestedAction
{
    /// <summary>No request exists yet for this location and period.</summary>
    CreateNewRequest,

    /// <summary>A request already exists; an operator must decide (new version, ignore, …) in a later step.</summary>
    RequiresOperatorDecision,
}

/// <summary>
/// Rows of one resolved location and request period. Warning and error counts are numbers of issues, not rows.
/// </summary>
/// <param name="MissingPriceRows">
/// Task 2's «qiymət yoxdur» over the group's rows still part of the import (<c>ImportLinePricing</c>): unpriced,
/// and either unclassified or said to be bought. An excluded row is never imported, so it is not counted here.
/// </param>
/// <param name="InternalSupplyRows">
/// The group's included unpriced rows a reviewer said are supplied free. Never a warning.
/// </param>
public sealed record ImportGroupPreview(
    int LocationId,
    string LocationName,
    DateOnly Period,
    int RowCount,
    int PricedRows,
    int UnpricedRows,
    int WarningCount,
    int ErrorCount,
    bool ExistingRequest,
    int? LatestVersion,
    GroupSuggestedAction SuggestedAction,
    int MissingPriceRows,
    int InternalSupplyRows);

/// <param name="UngroupedRows">Rows without a resolved location or a valid date, so they belong to no group yet.</param>
public sealed record ImportPreview(
    ImportBatchSummary Batch,
    IReadOnlyList<ImportIssueCount> IssueSummary,
    IReadOnlyList<ImportGroupPreview> Groups,
    int UngroupedRows);

public sealed record SheetDetection(
    string SheetName,
    int? HeaderRowNumber,
    int DataRows,
    IReadOnlyList<ImportField> MissingRequiredColumns,
    string? Problem);

public sealed record ImportRowIssueDto(ImportIssueType IssueType, IssueSeverity Severity, string? FieldName, string Message);

public sealed record ImportRowDto(
    long Id,
    string SheetName,
    int RowNumber,
    string? ProductName,
    string? SpecificationValue,
    string? SpecificationUnit,
    string? ModelCode,
    string? Quantity,
    decimal? ParsedQuantity,
    string? OrderUnit,
    string? UnitPrice,
    decimal? ParsedUnitPrice,
    string? LineTotal,
    string? SupplierName,
    string? LocationName,
    string? RequestDate,
    DateOnly? ParsedRequestPeriod,
    string? ResponsiblePersonName,
    ImportRowValidationStatus ValidationStatus,
    IReadOnlyList<ImportRowIssueDto> Issues);

public sealed record ImportRowQuery(
    int Page = 1,
    int PageSize = 50,
    ImportRowValidationStatus? Status = null,
    ImportIssueType? IssueType = null,
    int? LocationId = null,
    DateOnly? Period = null,
    string? Search = null);

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
