using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Imports;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Imports.Review;

/// <param name="Area">Where the decision is taken, so the screen can link straight to it.</param>
/// <param name="RowCount">Included rows held back by this problem.</param>
public sealed record ReadinessBlocker(string Area, ImportIssueType IssueType, int RowCount, string Message);

public sealed record UnresolvedReferences(
    int Locations,
    int Suppliers,
    int ResponsiblePeople,
    int OrderUnits,
    int SpecificationUnits,
    int CategoryPaths);

/// <param name="DependencyBlockedRows">Rows whose variant cannot even be reviewed until product and units are decided.</param>
public sealed record ProductReadiness(int UnresolvedProducts, int UnresolvedVariants, int DependencyBlockedRows);

/// <summary>Row-specific problems: they live in one cell of one row, so no distinct-value decision settles them.</summary>
public sealed record RowBlockers(
    int InvalidQuantity,
    int InvalidPeriod,
    int MissingRequiredValue,
    int AmbiguousMatch,
    int OtherErrors);

/// <summary>Problems that are worth seeing but never keep an import back.</summary>
public sealed record ReadinessWarnings(int MissingPrice, int InvalidPrice, int LineTotalMismatch, int CellsStoredAsDates);

/// <param name="LatestVersion">Highest version already stored for this location and period.</param>
public sealed record ExistingRequestGroup(int LocationId, string LocationName, DateOnly Period, int RowCount, int LatestVersion);

/// <summary>Why this batch can or cannot become order requests yet.</summary>
public sealed record ImportReadiness(
    long ImportBatchId,
    ImportStatus BatchStatus,
    int TotalRows,
    int IncludedRows,
    int ExcludedRows,
    int ValidRows,
    int WarningRows,
    int InvalidRows,
    UnresolvedReferences UnresolvedReferences,
    ProductReadiness Products,
    RowBlockers RowIssues,
    ReadinessWarnings Warnings,
    int PossibleDuplicateRows,
    IReadOnlyList<ExistingRequestGroup> ExistingRequestGroups,
    bool CanImport,
    IReadOnlyList<ReadinessBlocker> Blockers);

/// <summary>
/// Answers one question: what still keeps this import from becoming order requests? Everything is counted over
/// the rows that are still part of the import — an excluded row keeps its problems but never holds the batch back.
/// </summary>
public sealed class ImportReadinessQueries(IBaxOrdersDbContext db, ImportReviewQueries reviewQueries)
{
    public async Task<ImportReadiness?> GetReadinessAsync(long importBatchId, CancellationToken cancellationToken)
    {
        var batch = await db.ImportBatches.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == importBatchId, cancellationToken);
        if (batch is null)
        {
            return null;
        }

        var summary = await reviewQueries.GetSummaryAsync(importBatchId, cancellationToken) ?? [];
        int Unresolved(ImportResolutionKind kind) => summary.FirstOrDefault(item => item.Kind == kind)?.DistinctValues ?? 0;

        // One pass over the issues of the rows that are still part of the import.
        var issueRows = await db.ImportRowIssues.AsNoTracking()
            .Where(issue => issue.ImportRow.ImportBatchId == importBatchId && !issue.ImportRow.IsExcluded)
            .GroupBy(issue => new { issue.IssueType, issue.Severity, issue.FieldName })
            .Select(group => new
            {
                group.Key.IssueType,
                group.Key.Severity,
                group.Key.FieldName,
                Rows = group.Select(issue => issue.ImportRowId).Distinct().Count(),
            })
            .ToListAsync(cancellationToken);

        int RowsWith(ImportIssueType type, IssueSeverity? severity = null) =>
            issueRows.Where(item => item.IssueType == type && (severity is null || item.Severity == severity)).Sum(item => item.Rows);

        var blockers = issueRows
            .Where(item => ImportIssueRules.IsBlocking(item.IssueType, item.Severity))
            .GroupBy(item => (Area: AreaOf(item.IssueType, item.FieldName), item.IssueType))
            .Select(group => new ReadinessBlocker(
                group.Key.Area,
                group.Key.IssueType,
                group.Sum(item => item.Rows),
                Describe(group.Key.IssueType, group.Sum(item => item.Rows))))
            .OrderByDescending(blocker => blocker.RowCount)
            .ToList();

        var variants = summary.FirstOrDefault(item => item.Kind == ImportResolutionKind.ProductVariant);

        return new ImportReadiness(
            batch.Id,
            batch.Status,
            batch.TotalRows,
            batch.TotalRows - batch.ExcludedRows,
            batch.ExcludedRows,
            batch.ValidRows,
            batch.WarningRows,
            batch.InvalidRows,
            new UnresolvedReferences(
                Unresolved(ImportResolutionKind.Location),
                Unresolved(ImportResolutionKind.Supplier),
                Unresolved(ImportResolutionKind.ResponsiblePerson),
                Unresolved(ImportResolutionKind.OrderUnit),
                Unresolved(ImportResolutionKind.SpecificationUnit),
                Unresolved(ImportResolutionKind.CategoryPath)),
            new ProductReadiness(
                Unresolved(ImportResolutionKind.Product),
                Unresolved(ImportResolutionKind.ProductVariant),
                variants?.DependencyBlockedRows ?? 0),
            new RowBlockers(
                RowsWith(ImportIssueType.InvalidQuantity),
                RowsWith(ImportIssueType.InvalidDate),
                RowsWith(ImportIssueType.MissingRequiredValue),
                RowsWith(ImportIssueType.AmbiguousMatch, IssueSeverity.Error),
                RowsWith(ImportIssueType.Other, IssueSeverity.Error)),
            new ReadinessWarnings(
                RowsWith(ImportIssueType.MissingPrice),
                RowsWith(ImportIssueType.InvalidPrice),
                RowsWith(ImportIssueType.LineTotalMismatch),
                RowsWith(ImportIssueType.Other, IssueSeverity.Warning)),
            RowsWith(ImportIssueType.DuplicateRow),
            await ExistingRequestGroupsAsync(importBatchId, cancellationToken),
            blockers.Count == 0,
            blockers);
    }

    /// <summary>
    /// Location and period groups that already have an order request. Task 4 will ask the operator what to do with
    /// them; nothing is merged, versioned or overwritten here, and they do not keep the batch from being ready.
    /// </summary>
    private async Task<IReadOnlyList<ExistingRequestGroup>> ExistingRequestGroupsAsync(long importBatchId, CancellationToken cancellationToken)
    {
        var groups = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == importBatchId
                          && !row.IsExcluded
                          && row.MatchedLocationId != null
                          && row.ParsedRequestPeriod != null)
            .GroupBy(row => new { LocationId = row.MatchedLocationId!.Value, Period = row.ParsedRequestPeriod!.Value })
            .Select(group => new { group.Key.LocationId, group.Key.Period, RowCount = group.Count() })
            .ToListAsync(cancellationToken);

        if (groups.Count == 0)
        {
            return [];
        }

        var locationIds = groups.Select(group => group.LocationId).Distinct().ToList();
        var periods = groups.Select(group => group.Period).Distinct().ToList();

        var existing = await db.OrderRequests.AsNoTracking()
            .Where(request => locationIds.Contains(request.LocationId) && periods.Contains(request.RequestPeriod))
            .GroupBy(request => new { request.LocationId, request.RequestPeriod })
            .Select(group => new { group.Key.LocationId, group.Key.RequestPeriod, Latest = group.Max(request => request.Version) })
            .ToListAsync(cancellationToken);

        if (existing.Count == 0)
        {
            return [];
        }

        var names = await db.Locations.AsNoTracking()
            .Where(location => locationIds.Contains(location.Id))
            .ToDictionaryAsync(location => location.Id, location => location.Name, cancellationToken);

        return groups
            .Join(
                existing,
                group => (group.LocationId, group.Period),
                request => (request.LocationId, Period: request.RequestPeriod),
                (group, request) => new ExistingRequestGroup(
                    group.LocationId,
                    names.GetValueOrDefault(group.LocationId) ?? $"#{group.LocationId}",
                    group.Period,
                    group.RowCount,
                    request.Latest))
            .OrderBy(item => item.Period)
            .ThenBy(item => item.LocationName, StringComparer.Ordinal)
            .ToList();
    }

    /// <summary>Where a blocking problem is decided, so the readiness panel can link to that screen.</summary>
    private static string AreaOf(ImportIssueType issueType, string? fieldName) => issueType switch
    {
        ImportIssueType.UnknownLocation => nameof(ImportResolutionKind.Location),
        ImportIssueType.UnknownSupplier => nameof(ImportResolutionKind.Supplier),
        ImportIssueType.UnknownResponsiblePerson => nameof(ImportResolutionKind.ResponsiblePerson),
        ImportIssueType.UnknownCategory => nameof(ImportResolutionKind.CategoryPath),
        ImportIssueType.UnknownProduct => nameof(ImportResolutionKind.Product),
        ImportIssueType.UnknownProductVariant => nameof(ImportResolutionKind.ProductVariant),
        ImportIssueType.UnknownUnit or ImportIssueType.AmbiguousMatch => UnitArea(fieldName),
        _ => RowArea,
    };

    private static string UnitArea(string? fieldName) =>
        fieldName == ImportHeaders.ExpectedHeaders[ImportField.SpecificationUnit]
            ? nameof(ImportResolutionKind.SpecificationUnit)
            : fieldName == ImportHeaders.ExpectedHeaders[ImportField.OrderUnit]
                ? nameof(ImportResolutionKind.OrderUnit)
                : fieldName == ImportHeaders.ExpectedHeaders[ImportField.Location]
                    ? nameof(ImportResolutionKind.Location)
                    : fieldName == ImportHeaders.ExpectedHeaders[ImportField.Supplier]
                        ? nameof(ImportResolutionKind.Supplier)
                        : fieldName == ImportHeaders.ExpectedHeaders[ImportField.ProductName]
                            ? nameof(ImportResolutionKind.Product)
                            : RowArea;

    /// <summary>Problems that belong to one row, not to a distinct value.</summary>
    public const string RowArea = "Rows";

    private static string Describe(ImportIssueType issueType, int rows) => issueType switch
    {
        ImportIssueType.UnknownLocation => $"{rows} rows have a location that is not in the catalog.",
        ImportIssueType.UnknownUnit => $"{rows} rows have a unit that is not in the catalog.",
        ImportIssueType.UnknownProduct => $"{rows} rows have a product that is not in the catalog.",
        ImportIssueType.UnknownProductVariant => $"{rows} rows have no matching product variant.",
        ImportIssueType.AmbiguousMatch => $"{rows} rows have a value that matches more than one record.",
        ImportIssueType.InvalidQuantity => $"{rows} rows have an unusable quantity.",
        ImportIssueType.InvalidDate => $"{rows} rows have an unusable period (Tarix).",
        ImportIssueType.MissingRequiredValue => $"{rows} rows are missing a required value.",
        _ => $"{rows} rows have a blocking problem.",
    };
}
