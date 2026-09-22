using System.Text.RegularExpressions;

namespace BaxOrders.Domain.Imports;

/// <summary>
/// One uploaded Excel file. Not tied to a single location: a workbook may contain rows for several
/// locations, dates and responsible persons.
/// </summary>
public sealed partial class ImportBatch
{
    public const int OriginalFileNameMaxLength = 260;
    public const int FileHashLength = 64;
    public const int FailureReasonMaxLength = 2000;

    private readonly List<ImportRow> _rows = [];

    private ImportBatch()
    {
    }

    /// <param name="originalFileName">File name as uploaded.</param>
    /// <param name="fileHash">Optional SHA-256 of the file content as 64 hex characters, used to detect re-uploads.</param>
    /// <param name="uploadedAtUtc">Upload time (UTC).</param>
    public ImportBatch(string originalFileName, string? fileHash, DateTime uploadedAtUtc)
    {
        OriginalFileName = Guard.RequiredText(originalFileName, OriginalFileNameMaxLength, nameof(OriginalFileName));

        if (fileHash is not null && !Sha256Hex().IsMatch(fileHash))
        {
            throw new DomainException("File hash must be a SHA-256 value of 64 hexadecimal characters.");
        }

        FileHash = fileHash?.ToLowerInvariant();
        UploadedAtUtc = Guard.Utc(uploadedAtUtc, nameof(uploadedAtUtc));
        Status = ImportStatus.Uploaded;
    }

    public long Id { get; private set; }

    public string OriginalFileName { get; private set; } = null!;

    public string? FileHash { get; private set; }

    public ImportStatus Status { get; private set; }

    public int TotalRows { get; private set; }

    public int ValidRows { get; private set; }

    public int WarningRows { get; private set; }

    public int InvalidRows { get; private set; }

    /// <summary>Rows an operator kept out of the import. They stay staged and still count in <see cref="TotalRows"/>.</summary>
    public int ExcludedRows { get; private set; }

    public DateTime UploadedAtUtc { get; private set; }

    public DateTime? CompletedAtUtc { get; private set; }

    /// <summary>Internal reason why processing failed. Null unless <see cref="Status"/> is Failed.</summary>
    public string? FailureReason { get; private set; }

    public IReadOnlyCollection<ImportRow> Rows => _rows;

    /// <summary>
    /// Stages one Excel row exactly as read. Only allowed while the file is being read.
    /// </summary>
    public ImportRow AddRow(string sheetName, int rowNumber, ImportRowOriginalValues originalValues)
    {
        if (Status is not (ImportStatus.Uploaded or ImportStatus.Parsing))
        {
            throw new DomainException($"Rows cannot be added to an import in status {Status}.");
        }

        var row = new ImportRow(this, sheetName, rowNumber, originalValues);
        if (_rows.Any(existing => existing.SheetName == row.SheetName && existing.RowNumber == row.RowNumber))
        {
            throw new DomainException($"Row {rowNumber} of sheet '{sheetName}' is already staged.");
        }

        _rows.Add(row);
        TotalRows++;
        return row;
    }

    public void StartParsing() => Transition(ImportStatus.Uploaded, ImportStatus.Parsing);

    public void StartValidating() => Transition(ImportStatus.Parsing, ImportStatus.Validating);

    /// <summary>
    /// Finishes validation. Every staged row must be counted in exactly one bucket.
    /// </summary>
    /// <param name="requiresReview">True when at least one row has a blocking problem; the batch then needs review.</param>
    public void CompleteValidation(int validRows, int warningRows, int invalidRows, bool requiresReview, DateTime completedAtUtc)
    {
        EnsureStatus(ImportStatus.Validating, "complete validation of");
        // Nothing can be excluded while the workbook is still being read.
        ApplySummary(validRows, warningRows, invalidRows, 0, requiresReview);
        CompletedAtUtc = Guard.Utc(completedAtUtc, nameof(completedAtUtc));
    }

    /// <summary>
    /// Recalculates the summary after staged rows were re-evaluated, for example after a review decision.
    /// Moves between NeedsReview and ReadyToImport only.
    /// </summary>
    public void RefreshValidationSummary(int validRows, int warningRows, int invalidRows, int excludedRows, bool requiresReview)
    {
        EnsureReviewable();
        ApplySummary(validRows, warningRows, invalidRows, excludedRows, requiresReview);
    }

    /// <summary>Review decisions are allowed only on a staged import that is not yet imported.</summary>
    public void EnsureReviewable()
    {
        if (Status is not (ImportStatus.NeedsReview or ImportStatus.ReadyToImport))
        {
            throw new DomainException($"An import in status {Status} cannot be reviewed.");
        }
    }

    private void ApplySummary(int validRows, int warningRows, int invalidRows, int excludedRows, bool requiresReview)
    {
        if (validRows < 0 || warningRows < 0 || invalidRows < 0 || excludedRows < 0
            || validRows + warningRows + invalidRows + excludedRows != TotalRows)
        {
            throw new DomainException("The row summary must count every staged row exactly once.");
        }

        // An excluded row never reaches an order request, so its problems cannot block the import either.
        if (invalidRows > 0 && !requiresReview)
        {
            throw new DomainException("An import with invalid rows cannot be ready to import.");
        }

        ValidRows = validRows;
        WarningRows = warningRows;
        InvalidRows = invalidRows;
        ExcludedRows = excludedRows;
        Status = requiresReview ? ImportStatus.NeedsReview : ImportStatus.ReadyToImport;
    }

    /// <summary>
    /// The staged rows became permanent order requests. The batch is finished: its rows stay exactly as they
    /// are, as the audit trail behind the orders, and no further review decision is accepted.
    /// </summary>
    public void MarkImported(DateTime importedAtUtc)
    {
        if (Status != ImportStatus.ReadyToImport)
        {
            throw new DomainException($"An import in status {Status} cannot be confirmed; it must be {ImportStatus.ReadyToImport}.");
        }

        CompletedAtUtc = Guard.Utc(importedAtUtc, nameof(importedAtUtc));
        Status = ImportStatus.Imported;
    }

    /// <summary>
    /// Marks an import that could not be processed. The reason is internal diagnostic text, never a stack trace.
    /// A failed import may be retried by uploading the same file again.
    /// </summary>
    public void MarkFailed(string reason, DateTime failedAtUtc)
    {
        if (Status is not (ImportStatus.Uploaded or ImportStatus.Parsing or ImportStatus.Validating))
        {
            throw new DomainException($"An import in status {Status} cannot be marked as failed.");
        }

        var trimmed = Guard.RequiredText(reason, int.MaxValue, nameof(reason));
        FailureReason = trimmed.Length <= FailureReasonMaxLength ? trimmed : trimmed[..FailureReasonMaxLength];
        CompletedAtUtc = Guard.Utc(failedAtUtc, nameof(failedAtUtc));
        Status = ImportStatus.Failed;
    }

    private void Transition(ImportStatus from, ImportStatus to)
    {
        EnsureStatus(from, $"move to {to}");
        Status = to;
    }

    private void EnsureStatus(ImportStatus required, string action)
    {
        if (Status != required)
        {
            throw new DomainException($"Cannot {action} an import in status {Status}; it must be {required}.");
        }
    }

    [GeneratedRegex("^[0-9a-fA-F]{64}$")]
    private static partial Regex Sha256Hex();
}
