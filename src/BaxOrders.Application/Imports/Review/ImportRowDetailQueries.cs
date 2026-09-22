using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Imports.Review;

/// <summary>
/// One staged row in full: what the workbook said, what the operator corrected, what the importer works with,
/// which canonical records it matches, and what still stands in its way.
/// </summary>
public sealed class ImportRowDetailQueries(IBaxOrdersDbContext db)
{
    public const int MaxPageSize = 100;

    /// <summary>Fields in the order an operator reads the sheet.</summary>
    private static readonly ImportCorrectionField[] Fields = Enum.GetValues<ImportCorrectionField>();

    public async Task<ImportRowDetail?> GetRowAsync(long importBatchId, long importRowId, CancellationToken cancellationToken)
    {
        var row = await db.ImportRows.AsNoTracking()
            .Include(item => item.Issues)
            .Include(item => item.Corrections)
            .FirstOrDefaultAsync(item => item.Id == importRowId && item.ImportBatchId == importBatchId, cancellationToken);

        return row is null ? null : await DetailAsync(row, cancellationToken);
    }

    /// <summary>Builds the detail of an already loaded row, for the answer of a correction command.</summary>
    public async Task<ImportRowDetail> DetailAsync(ImportRow row, CancellationToken cancellationToken)
    {
        var values = EffectiveRowValues.Of(row);

        var fields = Fields.Select(field =>
        {
            var column = EffectiveRowValues.ColumnOf(field);
            var correction = row.CorrectionOf(field);

            return new RowFieldDetail(
                field,
                ImportHeaders.ExpectedHeaders[column],
                row.Source(field),
                correction?.CorrectedValue,
                row.Effective(field),
                correction is not null,
                values.StoredAsDate(column),
                correction is { IsIntentionallyEmpty: true });
        }).ToList();

        return new ImportRowDetail(
            row.Id,
            row.ImportBatchId,
            row.SheetName,
            row.RowNumber,
            row.OriginalSequenceNumber,
            row.ValidationStatus,
            row.IsExcluded,
            row.ExclusionReason,
            row.ExcludedAtUtc,
            row.ParsedQuantity,
            row.ParsedUnitPrice,
            row.ParsedRequestPeriod,
            row.CalculatedLineTotal,
            row.OriginalLineTotal,
            row.Corrections.Count,
            fields,
            await MatchesAsync(row, cancellationToken),
            [.. row.Issues
                .OrderByDescending(issue => issue.Severity)
                .Select(issue => new RowIssueDetail(issue.IssueType, issue.Severity, issue.Origin, issue.FieldName, issue.Message))]);
    }

    /// <summary>
    /// Rows that may need a row-specific decision: the ones carrying issues no distinct-value mapping can settle,
    /// plus anything the operator filters for. Deterministic — there is no scoring and no suggestion.
    /// </summary>
    public async Task<PagedResult<CorrectionCandidate>?> GetCandidatesAsync(
        long importBatchId, CorrectionCandidateQuery query, CancellationToken cancellationToken)
    {
        if (!await db.ImportBatches.AnyAsync(batch => batch.Id == importBatchId, cancellationToken))
        {
            return null;
        }

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var rows = db.ImportRows.AsNoTracking().Where(row => row.ImportBatchId == importBatchId);

        if (query.Excluded is { } excluded)
        {
            rows = rows.Where(row => row.IsExcluded == excluded);
        }

        if (query.Status is { } status)
        {
            rows = rows.Where(row => row.ValidationStatus == status);
        }

        // Without a filter: every row that carries an error, a row-specific problem, a correction, or an exclusion.
        rows = query.IssueType is { } issueType
            ? rows.Where(row => row.Issues.Any(issue => issue.IssueType == issueType))
            : rows.Where(row => row.Issues.Any(issue => issue.Severity == IssueSeverity.Error || RowLevelIssues.Contains(issue.IssueType))
                                || row.Corrections.Any()
                                || row.IsExcluded);

        var search = TextNormalizer.Normalize(query.Search);
        if (search.Length > 0)
        {
            rows = rows.Where(row =>
                (row.NormalizedProductName != null && row.NormalizedProductName.Contains(search))
                || (row.NormalizedLocationName != null && row.NormalizedLocationName.Contains(search))
                || (row.NormalizedSupplierName != null && row.NormalizedSupplierName.Contains(search)));
        }

        var totalCount = await rows.CountAsync(cancellationToken);
        var items = await rows
            .OrderBy(row => row.SheetName)
            .ThenBy(row => row.RowNumber)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(row => new CorrectionCandidate(
                row.Id,
                row.SheetName,
                row.RowNumber,
                row.OriginalProductName,
                row.OriginalLocationName,
                row.ParsedRequestPeriod,
                row.ValidationStatus,
                row.IsExcluded,
                row.Corrections.Count,
                row.Issues
                    .OrderByDescending(issue => issue.Severity)
                    .Select(issue => new RowIssueDetail(issue.IssueType, issue.Severity, issue.Origin, issue.FieldName, issue.Message))
                    .ToList()))
            .ToListAsync(cancellationToken);

        return new PagedResult<CorrectionCandidate>(items, page, pageSize, totalCount);
    }

    /// <summary>
    /// Problems that usually live in one cell of one row rather than in a value the catalog knows: a quantity
    /// that is not a number, a missing period, a blank required cell, a value matching two records, a price
    /// that cannot be read, and a cell Excel turned into something else.
    /// </summary>
    public static readonly IReadOnlyList<ImportIssueType> RowLevelIssues =
    [
        ImportIssueType.InvalidQuantity,
        ImportIssueType.InvalidDate,
        ImportIssueType.MissingRequiredValue,
        ImportIssueType.AmbiguousMatch,
        ImportIssueType.InvalidPrice,
        ImportIssueType.InvalidLineTotal,
        ImportIssueType.LineTotalMismatch,
        ImportIssueType.Other,
    ];

    private async Task<RowMatchDetail> MatchesAsync(ImportRow row, CancellationToken cancellationToken)
    {
        var location = row.MatchedLocationId is { } locationId
            ? await db.Locations.AsNoTracking().Where(item => item.Id == locationId)
                .Select(item => item.Name + " (" + item.Code + ")").FirstOrDefaultAsync(cancellationToken)
            : null;

        var supplier = row.MatchedSupplierId is { } supplierId
            ? await db.Suppliers.AsNoTracking().Where(item => item.Id == supplierId).Select(item => item.Name).FirstOrDefaultAsync(cancellationToken)
            : null;

        var person = row.MatchedResponsiblePersonId is { } personId
            ? await db.ResponsiblePeople.AsNoTracking().Where(item => item.Id == personId).Select(item => item.Name).FirstOrDefaultAsync(cancellationToken)
            : null;

        var category = row.MatchedCategoryId is { } categoryId
            ? await db.Categories.AsNoTracking().Where(item => item.Id == categoryId).Select(item => item.Name).FirstOrDefaultAsync(cancellationToken)
            : null;

        var product = row.MatchedProductId is { } productId
            ? await db.Products.AsNoTracking().Where(item => item.Id == productId)
                .Select(item => item.Name + " (" + item.Code + ")").FirstOrDefaultAsync(cancellationToken)
            : null;

        string? variant = null;
        if (row.MatchedProductVariantId is { } variantId)
        {
            var parts = await db.ProductVariants.AsNoTracking()
                .Where(item => item.Id == variantId)
                .Select(item => new
                {
                    item.SpecificationValue,
                    SpecificationUnitCode = item.SpecificationUnit != null ? item.SpecificationUnit.Code : null,
                    item.SpecificationDescriptor,
                    item.ModelCode,
                    OrderUnitCode = item.OrderUnit != null ? item.OrderUnit.Code : null,
                })
                .FirstOrDefaultAsync(cancellationToken);

            // A line with no order unit and no specification would otherwise describe itself with an empty
            // string; it says what it is instead.
            variant = parts is null
                ? null
                : VariantDescription.Of(
                    parts.SpecificationValue,
                    parts.SpecificationUnitCode ?? parts.SpecificationDescriptor,
                    parts.ModelCode,
                    parts.OrderUnitCode ?? VariantDescription.Unitless);
        }

        var orderUnit = row.MatchedOrderUnitId is { } orderUnitId
            ? await UnitLabelAsync(orderUnitId, cancellationToken)
            : null;

        var specificationUnit = row.MatchedSpecificationUnitId is { } specificationUnitId
            ? await UnitLabelAsync(specificationUnitId, cancellationToken)
            : null;

        return new RowMatchDetail(location, supplier, person, category, product, variant, orderUnit, specificationUnit);
    }

    private Task<string?> UnitLabelAsync(int unitId, CancellationToken cancellationToken) =>
        db.UnitsOfMeasure.AsNoTracking().Where(unit => unit.Id == unitId)
            .Select(unit => unit.Code + " — " + unit.Name)
            .FirstOrDefaultAsync(cancellationToken)!;
}
