using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BaxOrders.Application.Imports.Review;

/// <summary>
/// Row-specific decisions an operator takes on staged data: correcting a single cell, reverting that correction,
/// and keeping a row out of the import or putting it back.
/// </summary>
/// <remarks>
/// The workbook is never read again and never changed: every <c>Original*</c> value stays exactly as it was
/// staged. A correction only says what the cell should have said, and the row then goes through the normal
/// pipeline — parsing, validation, matching, resolutions, duplicates — with that value. Each command runs in one
/// transaction under the batch lock, so a saved correction can never be left with stale matching behind it.
/// </remarks>
public sealed class ImportRowCorrectionService(
    IBaxOrdersDbContext db,
    ImportRevalidator revalidator,
    ImportRowDetailQueries detailQueries,
    ImportPreviewQueries previewQueries,
    IImportBatchLock batchLock,
    TimeProvider timeProvider,
    ILogger<ImportRowCorrectionService> logger)
{
    /// <summary>Cells staged in the wide text columns; the rest share the short column limit.</summary>
    private static readonly HashSet<ImportCorrectionField> LongFields =
    [
        ImportCorrectionField.MainCategory,
        ImportCorrectionField.MiddleCategory,
        ImportCorrectionField.SubCategory,
        ImportCorrectionField.ProductName,
        ImportCorrectionField.Supplier,
        ImportCorrectionField.Location,
        ImportCorrectionField.ResponsiblePerson,
    ];

    /// <summary>
    /// Cells an operator may confirm as empty on purpose. Only the order unit qualifies today: a service line
    /// can legitimately have none. Everything else is either optional already, or genuinely required.
    /// </summary>
    private static readonly HashSet<ImportCorrectionField> Clearable =
    [
        ImportCorrectionField.OrderUnit,
    ];

    public Task<RowCorrectionResult> ApplyAsync(ApplyCorrectionCommand command, CancellationToken cancellationToken) =>
        ExecuteAsync(command.ImportBatchId, command.ImportRowId, reevaluate: true, (batch, row) =>
        {
            var value = Validate(command.Field, command.Value);
            row.SetCorrection(command.Field, value);

            logger.LogInformation(
                "Import {ImportBatchId}: row {RowNumber} {Field} corrected; the workbook value is kept",
                batch.Id, row.RowNumber, command.Field);
        }, cancellationToken);

    /// <summary>
    /// Records that a cell is empty on purpose. It is the opposite of a missing value: the operator looked at
    /// the row and confirmed that nothing belongs there — a service line with no order unit, for instance. The
    /// workbook value stays on the row, so what the sheet said remains auditable.
    /// </summary>
    public Task<RowCorrectionResult> ClearAsync(
        long importBatchId, long importRowId, ImportCorrectionField field, CancellationToken cancellationToken) =>
        ExecuteAsync(importBatchId, importRowId, reevaluate: true, (batch, row) =>
        {
            if (!Clearable.Contains(field))
            {
                throw new ValidationException($"The {field} cell cannot be left empty on purpose.");
            }

            row.SetCorrection(field, null);

            logger.LogInformation(
                "Import {ImportBatchId}: row {RowNumber} {Field} confirmed empty on purpose; the workbook value is kept",
                batch.Id, row.RowNumber, field);
        }, cancellationToken);

    /// <summary>Drops one correction, so the row falls back to what the workbook said.</summary>
    public Task<RowCorrectionResult> RevertAsync(
        long importBatchId, long importRowId, ImportCorrectionField field, CancellationToken cancellationToken) =>
        ExecuteAsync(importBatchId, importRowId, reevaluate: true, (batch, row) =>
        {
            if (row.RemoveCorrection(field) is null)
            {
                throw new NotFoundException($"Row #{row.Id} has no correction for {field}.");
            }

            logger.LogInformation("Import {ImportBatchId}: row {RowNumber} {Field} correction reverted", batch.Id, row.RowNumber, field);
        }, cancellationToken);

    /// <summary>
    /// Keeps the row out of the future order import. The row, its issues and its corrections are kept and stay
    /// visible; it simply stops counting towards readiness.
    /// </summary>
    public Task<RowCorrectionResult> ExcludeAsync(ExcludeRowCommand command, CancellationToken cancellationToken) =>
        ExecuteAsync(command.ImportBatchId, command.ImportRowId, reevaluate: false, (batch, row) =>
        {
            if (string.IsNullOrWhiteSpace(command.Reason))
            {
                throw new ValidationException("Excluding a row needs a reason.");
            }

            row.Exclude(command.Reason, timeProvider.GetUtcNow().UtcDateTime);

            logger.LogInformation(
                "Import {ImportBatchId}: row {RowNumber} excluded from the import ({Reason})", batch.Id, row.RowNumber, row.ExclusionReason);
        }, cancellationToken);

    /// <summary>Puts an excluded row back into the import and evaluates it again. Its corrections are kept.</summary>
    public Task<RowCorrectionResult> IncludeAsync(long importBatchId, long importRowId, CancellationToken cancellationToken) =>
        ExecuteAsync(importBatchId, importRowId, reevaluate: true, (batch, row) =>
        {
            row.Include();
            logger.LogInformation("Import {ImportBatchId}: row {RowNumber} is part of the import again", batch.Id, row.RowNumber);
        }, cancellationToken);

    /// <summary>
    /// A correction is held to the same rules as a workbook cell: it is parsed by the same parser, with the same
    /// limits. Nothing new is invented for corrections, and an unusable value is refused instead of stored.
    /// </summary>
    private static string Validate(ImportCorrectionField field, string? value)
    {
        var text = (value ?? string.Empty).Trim();
        if (text.Length == 0)
        {
            throw new ValidationException("A correction needs a value. Remove the correction to fall back to the Excel value.");
        }

        var maxLength = LongFields.Contains(field) ? ImportRow.SourceTextMaxLength : ImportRow.SourceValueMaxLength;
        if (text.Length > maxLength)
        {
            throw new ValidationException($"A {field} correction accepts at most {maxLength} characters.");
        }

        switch (field)
        {
            case ImportCorrectionField.Quantity:
            {
                var quantity = ImportCellParser.ParseDecimal(text, OrderRequestItem.QuantityPrecision, OrderRequestItem.QuantityScale);
                if (quantity.Outcome != ParseOutcome.Parsed)
                {
                    throw new ValidationException(quantity.Problem ?? "The quantity is not a number.");
                }

                if (quantity.Value <= 0)
                {
                    throw new ValidationException("Quantity must be greater than zero.");
                }

                break;
            }

            case ImportCorrectionField.UnitPrice:
            {
                var price = ImportCellParser.ParseDecimal(text, OrderRequestItem.UnitPricePrecision, OrderRequestItem.UnitPriceScale);
                if (price.Outcome != ParseOutcome.Parsed)
                {
                    throw new ValidationException(price.Problem ?? "The price is not a number.");
                }

                if (price.Value < 0)
                {
                    throw new ValidationException("A unit price must not be negative. Remove the correction to leave the price unknown.");
                }

                break;
            }

            case ImportCorrectionField.RequestPeriod:
            {
                var date = ImportCellParser.ParseDate(text);
                if (date.Outcome != ParseOutcome.Parsed)
                {
                    throw new ValidationException(date.Problem ?? "The period (Tarix) is not a date. Use a form such as 01.03.2026.");
                }

                break;
            }
        }

        return text;
    }

    private async Task<RowCorrectionResult> ExecuteAsync(
        long importBatchId,
        long importRowId,
        bool reevaluate,
        Action<ImportBatch, ImportRow> change,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        // Serialize the changes of this batch so row statuses and counters stay consistent.
        await batchLock.AcquireAsync(importBatchId, cancellationToken);

        var batch = await db.ImportBatches.FirstOrDefaultAsync(item => item.Id == importBatchId, cancellationToken)
                    ?? throw new NotFoundException($"Import #{importBatchId} was not found.");
        batch.EnsureReviewable();

        var row = await db.ImportRows
                      .Include(item => item.Issues)
                      .Include(item => item.Corrections)
                      .FirstOrDefaultAsync(item => item.Id == importRowId && item.ImportBatchId == importBatchId, cancellationToken)
                  ?? throw new NotFoundException($"Row #{importRowId} is not part of import #{importBatchId}.");

        // Batches staged before fingerprints were stored get them once, so a change refreshes only its own groups.
        await revalidator.EnsureFingerprintsAsync(importBatchId, cancellationToken);

        change(batch, row);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            logger.LogWarning(exception, "Import {ImportBatchId}: changing row {RowId} conflicted", importBatchId, importRowId);
            throw new ConflictException("This row was changed by someone else at the same time. Reload the row and try again.");
        }

        if (reevaluate)
        {
            await revalidator.ReevaluateAsync(batch, [row], cancellationToken);
        }
        else
        {
            await revalidator.RefreshSummaryAsync(batch, cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        var preview = await previewQueries.GetPreviewAsync(importBatchId, cancellationToken)
                      ?? throw new NotFoundException($"Import #{importBatchId} was not found.");

        return new RowCorrectionResult(await detailQueries.DetailAsync(row, cancellationToken), preview);
    }
}
