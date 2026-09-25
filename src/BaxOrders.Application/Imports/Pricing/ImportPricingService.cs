using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Orders;
using BaxOrders.Domain;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BaxOrders.Application.Imports.Pricing;

/// <summary>
/// Pricing classification during import review: which unpriced rows are bought and which the company supplies
/// itself, said before the import rather than after it (brief 16.1).
/// </summary>
/// <remarks>
/// <para>
/// The answer is stored on the staged row and written onto the line when the import is confirmed, as a decision
/// by the person who gave it. A row nobody classified is imported as «Təsnif edilməyib», never as whatever its
/// supplier suggests: one source can be both, which is the reason Qiymət təsnifatı exists at all.
/// </para>
/// <para>
/// Rows are named one by one, always. There is deliberately no "every row of this supplier" and no "every row
/// from Qala baza": that is the one-click rule this whole feature exists to keep out, exactly as
/// <see cref="Orders.Pricing.PricingModeReviewService.SetAsync"/> refuses it for lines.
/// </para>
/// </remarks>
public sealed class ImportPricingService(
    IBaxOrdersDbContext db,
    ImportPreviewQueries previewQueries,
    IImportBatchLock batchLock,
    ICurrentUserContext currentUser,
    TimeProvider timeProvider,
    ILogger<ImportPricingService> logger)
{
    public const int DefaultPageSize = 50;
    public const int MaxPageSize = 200;

    /// <summary>
    /// The batch's unpriced rows that are still part of the import, with what the review said about each.
    /// </summary>
    /// <remarks>
    /// Three queries after the batch is found, as on Qiymət təsnifatı: the totals over every such row, how many
    /// the filter and the search leave, then one page of them. The totals are Task 2's, counted through
    /// <see cref="ImportLinePricing"/>, and do not move with the filter or the search.
    /// </remarks>
    /// <returns>Null when the import does not exist.</returns>
    public async Task<ImportPricingReviewDto?> GetAsync(
        long importBatchId, ImportPricingQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        if (query.Mode is { } requested && !Enum.IsDefined(requested))
        {
            throw new ValidationException(
                $"'{nameof(query.Mode)}' must be one of: {string.Join(", ", Enum.GetNames<PricingMode>())}.");
        }

        if (!await db.ImportBatches.AnyAsync(batch => batch.Id == importBatchId, cancellationToken))
        {
            return null;
        }

        // An excluded row never becomes a line, so nothing about its price is in question.
        var included = db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == importBatchId && !row.IsExcluded);

        var totals = ImportPricingCounts.Of((await included
                .Select(row => new { row.ParsedUnitPrice, row.PricingClassification })
                .ToListAsync(cancellationToken))
            .Select(row => (row.ParsedUnitPrice, row.PricingClassification)));

        // A row with a price has answered the question by having one (ImportLinePricing.ModeOf).
        var unpriced = included.Where(row => row.ParsedUnitPrice == null);
        var filtered = query.Mode switch
        {
            null => unpriced,
            PricingMode.Unresolved => unpriced.Where(row => row.PricingClassification == null),
            { } mode => unpriced.Where(row => row.PricingClassification == mode),
        };

        if (Search.Of(query.Search) is { } needle)
        {
            filtered = filtered.Where(row =>
                (row.NormalizedProductName != null && row.NormalizedProductName.Contains(needle))
                || (row.NormalizedLocationName != null && row.NormalizedLocationName.Contains(needle))
                || (row.NormalizedSupplierName != null && row.NormalizedSupplierName.Contains(needle))
                || db.Products.Any(product => product.Id == row.MatchedProductId && product.NormalizedName.Contains(needle))
                || db.Locations.Any(location => location.Id == row.MatchedLocationId && location.NormalizedName.Contains(needle))
                || db.Suppliers.Any(supplier => supplier.Id == row.MatchedSupplierId && supplier.NormalizedName.Contains(needle)));
        }

        var totalCount = await filtered.CountAsync(cancellationToken);

        var page = Math.Max(1, query.Page);
        var pageSize = query.PageSize <= 0 ? DefaultPageSize : Math.Min(query.PageSize, MaxPageSize);

        // Effective text is the correction when there is one — even one that says "empty on purpose" — and the
        // workbook cell otherwise: ImportRow.Effective, written so the database can evaluate it.
        var rows = await filtered
            .Select(row => new
            {
                row.Id,
                row.SheetName,
                row.RowNumber,
                row.ParsedRequestPeriod,
                row.ParsedQuantity,
                MatchedLocation = db.Locations.Where(location => location.Id == row.MatchedLocationId).Select(location => location.Name).FirstOrDefault(),
                WorkbookLocation = row.Corrections.Any(correction => correction.Field == ImportCorrectionField.Location)
                    ? row.Corrections.Where(correction => correction.Field == ImportCorrectionField.Location).Select(correction => correction.CorrectedValue).FirstOrDefault()
                    : row.OriginalLocationName,
                MatchedProduct = db.Products.Where(product => product.Id == row.MatchedProductId).Select(product => product.Name).FirstOrDefault(),
                WorkbookProduct = row.Corrections.Any(correction => correction.Field == ImportCorrectionField.ProductName)
                    ? row.Corrections.Where(correction => correction.Field == ImportCorrectionField.ProductName).Select(correction => correction.CorrectedValue).FirstOrDefault()
                    : row.OriginalProductName,
                SpecificationValue = row.Corrections.Any(correction => correction.Field == ImportCorrectionField.SpecificationValue)
                    ? row.Corrections.Where(correction => correction.Field == ImportCorrectionField.SpecificationValue).Select(correction => correction.CorrectedValue).FirstOrDefault()
                    : row.OriginalSpecificationValue,
                OrderUnit = row.Corrections.Any(correction => correction.Field == ImportCorrectionField.OrderUnit)
                    ? row.Corrections.Where(correction => correction.Field == ImportCorrectionField.OrderUnit).Select(correction => correction.CorrectedValue).FirstOrDefault()
                    : row.OriginalOrderUnit,
                MatchedSupplier = db.Suppliers.Where(supplier => supplier.Id == row.MatchedSupplierId).Select(supplier => supplier.Name).FirstOrDefault(),
                WorkbookSupplier = row.Corrections.Any(correction => correction.Field == ImportCorrectionField.Supplier)
                    ? row.Corrections.Where(correction => correction.Field == ImportCorrectionField.Supplier).Select(correction => correction.CorrectedValue).FirstOrDefault()
                    : row.OriginalSupplierName,
                row.PricingClassification,
                row.PricingClassifiedByDisplayName,
                row.PricingClassifiedAtUtc,
            })
            // Month first (a row with no readable month last), then object, then product; the row itself breaks
            // every tie, so a page never shows a row twice or skips one.
            .OrderBy(row => row.ParsedRequestPeriod == null)
            .ThenBy(row => row.ParsedRequestPeriod)
            .ThenBy(row => row.MatchedLocation ?? row.WorkbookLocation)
            .ThenBy(row => row.MatchedProduct ?? row.WorkbookProduct)
            .ThenBy(row => row.RowNumber)
            .ThenBy(row => row.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new ImportPricingReviewDto(
            [
                .. rows.Select(row => new ImportPricingRowDto(
                    row.Id,
                    row.SheetName,
                    row.RowNumber,
                    row.MatchedLocation ?? row.WorkbookLocation,
                    row.ParsedRequestPeriod,
                    row.MatchedProduct ?? row.WorkbookProduct,
                    row.SpecificationValue,
                    row.OrderUnit,
                    row.ParsedQuantity,
                    row.MatchedSupplier,
                    row.WorkbookSupplier,
                    row.PricingClassification,
                    row.PricingClassifiedByDisplayName,
                    row.PricingClassifiedAtUtc)),
            ],
            totalCount,
            totals.Unclassified,
            totals.PriceRequired,
            totals.InternalSupply);
    }

    /// <summary>
    /// Records, for the named rows, whether each is bought or supplied free — or, with
    /// <see cref="PricingMode.Unresolved"/>, takes that back.
    /// </summary>
    /// <remarks>
    /// Nothing else about the rows or the batch changes: no value, issue, correction, resolution, counter or
    /// status. A classification is never a blocker, so the batch's readiness is not evaluated again. Everything
    /// is checked before anything is written, and it is written in one save, under the batch lock.
    /// </remarks>
    public async Task<ImportPricingResult> SetAsync(
        long importBatchId, SetImportPricingCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        if (command.ImportRowIds is not { Count: > 0 })
        {
            throw new ValidationException("Choose at least one row to classify.");
        }

        if (!Enum.IsDefined(command.PricingMode))
        {
            throw new ValidationException(
                $"'{nameof(command.PricingMode)}' must be one of: {string.Join(", ", Enum.GetNames<PricingMode>())}.");
        }

        // From the session and from nowhere else: nothing in the body can name who decided.
        var actor = CurrentActor.Of(currentUser, "You must be signed in to classify a row.");

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await batchLock.AcquireAsync(importBatchId, cancellationToken);

        var batch = await db.ImportBatches.FirstOrDefaultAsync(item => item.Id == importBatchId, cancellationToken)
                    ?? throw new NotFoundException($"Import #{importBatchId} was not found.");
        batch.EnsureReviewable();

        var ids = command.ImportRowIds.Distinct().ToArray();
        var rows = await db.ImportRows
            .Where(row => row.ImportBatchId == importBatchId && ids.Contains(row.Id))
            .ToListAsync(cancellationToken);

        if (rows.Count != ids.Length)
        {
            throw new NotFoundException($"One of the chosen rows is not part of import #{importBatchId}.");
        }

        var excluded = rows.Count(row => row.IsExcluded);
        if (excluded > 0)
        {
            throw new DomainException(
                $"{excluded} of the chosen rows are kept out of the import; nothing about their price is in question.");
        }

        var priced = rows.Count(row => row.ParsedUnitPrice is not null);
        if (priced > 0)
        {
            // A row that carries a price has already answered this.
            throw new DomainException(
                $"{priced} of the chosen rows already carry a price; their supply is not in question.");
        }

        var utcNow = timeProvider.GetUtcNow().UtcDateTime;
        var changed = 0;
        foreach (var row in rows)
        {
            var didChange = command.PricingMode is PricingMode.Unresolved
                ? row.ClearPricingClassification()
                : row.ClassifyPricing(command.PricingMode, actor, utcNow);

            if (didChange)
            {
                changed++;
            }
        }

        if (changed > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        logger.LogInformation(
            "Import {ImportBatchId}: {Changed} row(s) classified as {PricingMode} in review, {Unchanged} already were",
            importBatchId, changed, command.PricingMode, rows.Count - changed);

        var preview = await previewQueries.GetPreviewAsync(importBatchId, cancellationToken)
                      ?? throw new NotFoundException($"Import #{importBatchId} was not found.");

        return new ImportPricingResult(changed, rows.Count - changed, command.PricingMode, preview);
    }
}
