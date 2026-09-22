using BaxOrders.Domain.Imports;

namespace BaxOrders.Application.Imports.Review;

/// <param name="Column">The workbook header this cell belongs to ("Obyekt", "Ö/v", …).</param>
/// <param name="SourceValue">What the workbook holds. It is never changed.</param>
/// <param name="CorrectedValue">What the operator says it should have said, if anything.</param>
/// <param name="EffectiveValue">What the importer works with: the correction when there is one.</param>
/// <param name="StoredAsDate">Excel turned this cell into a date; what the author typed cannot be recovered.</param>
public sealed record RowFieldDetail(
    ImportCorrectionField Field,
    string Column,
    string? SourceValue,
    string? CorrectedValue,
    string? EffectiveValue,
    bool IsCorrected,
    bool StoredAsDate,
    /// <summary>The operator confirmed this cell is empty on purpose; it is not simply uncorrected.</summary>
    bool IsIntentionallyEmpty = false);

public sealed record RowIssueDetail(
    ImportIssueType IssueType,
    IssueSeverity Severity,
    ImportIssueOrigin Origin,
    string? FieldName,
    string Message);

/// <summary>The canonical records this row currently matches, as labels for a person.</summary>
public sealed record RowMatchDetail(
    string? Location = null,
    string? Supplier = null,
    string? ResponsiblePerson = null,
    string? Category = null,
    string? Product = null,
    string? ProductVariant = null,
    string? OrderUnit = null,
    string? SpecificationUnit = null);

/// <param name="OriginalLineTotal">The workbook's "Cəmi", kept for auditing only; the total is always recalculated.</param>
public sealed record ImportRowDetail(
    long Id,
    long ImportBatchId,
    string SheetName,
    int RowNumber,
    string? SequenceNumber,
    ImportRowValidationStatus Status,
    bool IsExcluded,
    string? ExclusionReason,
    DateTime? ExcludedAtUtc,
    decimal? ParsedQuantity,
    decimal? ParsedUnitPrice,
    DateOnly? ParsedRequestPeriod,
    decimal? CalculatedLineTotal,
    string? OriginalLineTotal,
    int CorrectionCount,
    IReadOnlyList<RowFieldDetail> Fields,
    RowMatchDetail Matches,
    IReadOnlyList<RowIssueDetail> Issues);

/// <summary>A staged row that may need a row-specific decision, with just enough context to pick it.</summary>
public sealed record CorrectionCandidate(
    long RowId,
    string SheetName,
    int RowNumber,
    string? ProductName,
    string? LocationName,
    DateOnly? Period,
    ImportRowValidationStatus Status,
    bool IsExcluded,
    int CorrectionCount,
    IReadOnlyList<RowIssueDetail> Issues);

/// <param name="IssueType">Only rows carrying this issue.</param>
/// <param name="Excluded">null: both, true: only excluded rows, false: only rows still in the import.</param>
public sealed record CorrectionCandidateQuery(
    ImportIssueType? IssueType = null,
    ImportRowValidationStatus? Status = null,
    bool? Excluded = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 25);

public sealed record ApplyCorrectionCommand(long ImportBatchId, long ImportRowId, ImportCorrectionField Field, string Value);

public sealed record ExcludeRowCommand(long ImportBatchId, long ImportRowId, string Reason);

/// <summary>The row after the change, plus the refreshed batch preview, so one call updates the whole screen.</summary>
public sealed record RowCorrectionResult(ImportRowDetail Row, ImportPreview Preview);
