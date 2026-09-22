using System.Diagnostics;
using System.Security.Cryptography;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Matching;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Application.Imports.Reading;
using BaxOrders.Domain.Imports;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BaxOrders.Application.Imports;

public sealed record ExcelUpload(string FileName, long Length, Stream Content);

public enum ImportOutcome
{
    /// <summary>Rows were staged and validated; the preview is available.</summary>
    Staged,

    /// <summary>The same file is already staged or imported; nothing was processed.</summary>
    Duplicate,

    /// <summary>The upload was refused before an import batch was created (extension, size, content type).</summary>
    Rejected,

    /// <summary>An import batch was created but the workbook could not be processed.</summary>
    Failed,
}

public sealed record ImportResult(
    ImportOutcome Outcome,
    long? ImportBatchId,
    string? Message,
    ImportPreview? Preview,
    IReadOnlyList<SheetDetection> Sheets);

/// <summary>
/// Stages an uploaded workbook: validate file → hash → duplicate check → parse → normalize → match →
/// validate → issues → summary. Creates no order requests and no catalog records.
/// </summary>
/// <remarks>
/// Independent of HTTP so it can later run in a background job. Status flow:
/// Uploaded → Parsing → Validating → NeedsReview | ReadyToImport, or Failed.
/// </remarks>
public sealed class ExcelImportService(
    IBaxOrdersDbContext db,
    IExcelWorkbookReader workbookReader,
    ImportCatalogLoader catalogLoader,
    ImportPreviewQueries previewQueries,
    IOptions<ImportOptions> options,
    TimeProvider timeProvider,
    ILogger<ExcelImportService> logger)
{
    public async Task<ImportResult> ImportAsync(ExcelUpload upload, CancellationToken cancellationToken)
    {
        var settings = options.Value;

        // Only the name part: browsers or clients may send a full client-side path.
        var fileName = Path.GetFileName(upload.FileName ?? string.Empty).Trim();
        if (fileName.Length is 0 or > ImportBatch.OriginalFileNameMaxLength)
        {
            return Rejected("A valid file name is required.");
        }

        if (!ExcelFileFormats.TryFromFileName(fileName, out var format))
        {
            return Rejected("Only .xlsx and .xls workbooks are supported.");
        }

        if (upload.Length <= 0)
        {
            return Rejected("The file is empty.");
        }

        if (upload.Length > settings.MaxUploadBytes)
        {
            return Rejected($"The file exceeds the maximum upload size of {settings.MaxUploadBytes / (1024 * 1024)} MB.");
        }

        using var content = new MemoryStream();
        await upload.Content.CopyToAsync(content, cancellationToken);

        if (content.Length == 0)
        {
            return Rejected("The file is empty.");
        }

        if (content.Length > settings.MaxUploadBytes)
        {
            return Rejected($"The file exceeds the maximum upload size of {settings.MaxUploadBytes / (1024 * 1024)} MB.");
        }

        if (!HasSignature(content, format))
        {
            return Rejected($"The file content is not a valid .{format.ToString().ToLowerInvariant()} workbook.");
        }

        var fileHash = ComputeSha256(content);

        if (await FindActiveBatchAsync(fileHash, cancellationToken) is { } existing)
        {
            return await DuplicateAsync(existing.Id, existing.Status, cancellationToken);
        }

        var batch = new ImportBatch(fileName, fileHash, timeProvider.GetUtcNow().UtcDateTime);
        db.ImportBatches.Add(batch);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // A concurrent upload of the same file won the unique index on active file hashes.
            db.ChangeTracker.Clear();
            if (await FindActiveBatchAsync(fileHash, cancellationToken) is { } concurrent)
            {
                return await DuplicateAsync(concurrent.Id, concurrent.Status, cancellationToken);
            }

            throw;
        }

        var sheets = new List<SheetDetection>();
        var stopwatch = Stopwatch.StartNew();

        try
        {
            batch.StartParsing();
            await db.SaveChangesAsync(cancellationToken);

            content.Position = 0;
            var workbook = workbookReader.Read(content, format, cancellationToken);
            var sourceRows = FindDataRows(workbook, settings.HeaderSearchRowLimit, sheets);

            if (sheets.All(sheet => sheet.HeaderRowNumber is null))
            {
                return await FailAsync(batch, DescribeMissingHeader(sheets), sheets);
            }

            if (sourceRows.Count == 0)
            {
                return await FailAsync(batch, "The workbook has a header row but no data rows.", sheets);
            }

            var staged = sourceRows
                .Select(source =>
                {
                    var stagingIssues = new List<ImportIssueDraft>();
                    var row = batch.AddRow(source.SheetName, source.RowNumber, source.ToOriginalValues(stagingIssues));
                    return (Source: source, Row: row, StagingIssues: stagingIssues);
                })
                .ToList();

            batch.StartValidating();

            var catalog = await catalogLoader.LoadAsync(
                staged.Select(s => s.Row.NormalizedProductName).OfType<string>().ToList(),
                [],
                cancellationToken);

            var fingerprints = new List<(int Index, string? Fingerprint)>(staged.Count);
            for (var index = 0; index < staged.Count; index++)
            {
                var (source, row, stagingIssues) = staged[index];
                var evaluation = ImportRowEvaluator.Evaluate(source, catalog);

                row.SetParsedValues(evaluation.Quantity, evaluation.UnitPrice, evaluation.LineTotal, evaluation.RequestPeriod);
                row.ApplyMatches(evaluation.Matches);
                foreach (var issue in stagingIssues.Concat(evaluation.Issues))
                {
                    row.AddIssue(issue.IssueType, issue.Severity, issue.Origin, issue.Message, issue.FieldName, issue.SuggestedEntityId);
                }

                // Stored so one later correction only has to refresh the fingerprint groups it touches.
                var fingerprint = DuplicateRowDetector.Fingerprint(source, evaluation);
                row.SetDuplicateFingerprint(fingerprint is null ? null : ImportSourceKeys.Hash(fingerprint));
                fingerprints.Add((index, fingerprint));
            }

            foreach (var (index, others) in DuplicateRowDetector.FindDuplicates(fingerprints))
            {
                var row = staged[index].Row;
                var otherRows = string.Join(", ", others.Select(other => staged[other].Row)
                    .Select(other => other.SheetName == row.SheetName ? $"{other.RowNumber}" : $"{other.SheetName}!{other.RowNumber}"));
                // Informational only: identical lines can be legitimate, so this never changes the row status.
                row.AddIssue(ImportIssueType.DuplicateRow, IssueSeverity.Info, ImportIssueOrigin.DuplicateDetection,
                    $"Possible duplicate: same business values as row(s) {otherRows}. Review only; nothing was changed.");
            }

            var requiresReview = false;
            int validRows = 0, warningRows = 0, invalidRows = 0;
            foreach (var (_, row, _) in staged)
            {
                switch (row.RefreshValidationStatus())
                {
                    case ImportRowValidationStatus.Invalid: invalidRows++; break;
                    case ImportRowValidationStatus.NeedsReview: warningRows++; break;
                    default: validRows++; break;
                }

                requiresReview |= row.Issues.Any(issue => ImportIssueRules.IsBlocking(issue.IssueType, issue.Severity));
            }

            batch.CompleteValidation(validRows, warningRows, invalidRows, requiresReview, timeProvider.GetUtcNow().UtcDateTime);
            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation(
                "Import {ImportBatchId} ({FileName}, hash {HashPrefix}) staged {TotalRows} rows in {ElapsedMs} ms: " +
                "{ValidRows} valid, {WarningRows} with warnings, {InvalidRows} invalid; status {Status}",
                batch.Id, fileName, fileHash[..12], batch.TotalRows, stopwatch.ElapsedMilliseconds,
                validRows, warningRows, invalidRows, batch.Status);

            var preview = await previewQueries.GetPreviewAsync(batch.Id, cancellationToken);
            return new ImportResult(ImportOutcome.Staged, batch.Id, null, preview, sheets);
        }
        catch (WorkbookReadException exception)
        {
            return await FailAsync(batch, exception.Message, sheets);
        }
        catch (OperationCanceledException)
        {
            // Leave no batch stuck in Parsing/Validating: it would block retrying the same file.
            return await FailAsync(batch, "Processing was cancelled before it completed.", sheets);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Import {ImportBatchId} failed unexpectedly", batch.Id);
            return await FailAsync(batch, "An unexpected error occurred while processing the workbook.", sheets);
        }
    }

    private static List<SourceRow> FindDataRows(ExcelWorkbook workbook, int headerSearchRowLimit, List<SheetDetection> sheets)
    {
        var rows = new List<SourceRow>();

        foreach (var sheet in workbook.Sheets)
        {
            if (sheet.IsHidden)
            {
                sheets.Add(new SheetDetection(sheet.Name, null, 0, [], "Hidden sheets are not imported."));
                continue;
            }

            var header = ImportHeaders.Detect(sheet, headerSearchRowLimit);
            if (header.Layout is not { } layout)
            {
                sheets.Add(new SheetDetection(sheet.Name, null, 0, header.MissingRequiredFields, header.Problem));
                continue;
            }

            var dataRows = sheet.Rows
                .Where(row => row.RowNumber > layout.HeaderRowNumber)
                .Select(row => new SourceRow(sheet.Name, row, layout))
                .Where(row => !row.IsBlank)
                .ToList();

            sheets.Add(new SheetDetection(sheet.Name, layout.HeaderRowNumber, dataRows.Count, [], null));
            rows.AddRange(dataRows);
        }

        return rows;
    }

    private static string DescribeMissingHeader(IReadOnlyList<SheetDetection> sheets)
    {
        var details = sheets.Select(sheet => sheet.MissingRequiredColumns.Count > 0
            ? $"'{sheet.SheetName}': missing {string.Join(", ", sheet.MissingRequiredColumns.Select(field => ImportHeaders.ExpectedHeaders[field]))}"
            : $"'{sheet.SheetName}': {sheet.Problem}");

        return "No sheet has the required columns (" +
               string.Join(", ", ImportHeaders.RequiredFields.Select(field => ImportHeaders.ExpectedHeaders[field])) +
               "). " + string.Join("; ", details);
    }

    private static bool HasSignature(MemoryStream content, ExcelFileFormat format)
    {
        var length = (int)Math.Min(content.Length, ExcelFileFormats.SignatureLength);
        return ExcelFileFormats.MatchesSignature(content.GetBuffer().AsSpan(0, length), format);
    }

    private static string ComputeSha256(MemoryStream content) =>
        Convert.ToHexStringLower(SHA256.HashData(content.GetBuffer().AsSpan(0, (int)content.Length)));

    private Task<ActiveBatch?> FindActiveBatchAsync(string fileHash, CancellationToken cancellationToken) =>
        db.ImportBatches.AsNoTracking()
            .Where(b => b.FileHash == fileHash && b.Status != ImportStatus.Failed)
            .OrderBy(b => b.Id)
            .Select(b => new ActiveBatch(b.Id, b.Status))
            .FirstOrDefaultAsync(cancellationToken);

    private async Task<ImportResult> DuplicateAsync(long existingBatchId, ImportStatus status, CancellationToken cancellationToken)
    {
        var preview = await previewQueries.GetPreviewAsync(existingBatchId, cancellationToken);
        return new ImportResult(
            ImportOutcome.Duplicate,
            existingBatchId,
            $"This workbook was already uploaded as import #{existingBatchId} (status {status}). It was not processed again.",
            preview,
            []);
    }

    private async Task<ImportResult> FailAsync(ImportBatch batch, string reason, IReadOnlyList<SheetDetection> sheets)
    {
        db.ChangeTracker.Clear();
        var tracked = await db.ImportBatches.SingleAsync(b => b.Id == batch.Id, CancellationToken.None);
        tracked.MarkFailed(reason, timeProvider.GetUtcNow().UtcDateTime);
        await db.SaveChangesAsync(CancellationToken.None);

        logger.LogWarning("Import {ImportBatchId} failed: {Reason}", batch.Id, tracked.FailureReason);

        var preview = await previewQueries.GetPreviewAsync(batch.Id, CancellationToken.None);
        return new ImportResult(ImportOutcome.Failed, batch.Id, tracked.FailureReason, preview, sheets);
    }

    private static ImportResult Rejected(string message) => new(ImportOutcome.Rejected, null, message, null, []);

    private sealed record ActiveBatch(long Id, ImportStatus Status);
}
