using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Matching;
using BaxOrders.Domain.Imports;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Imports.Review;

/// <summary>
/// Re-runs identity matching for staged rows after a review decision, and refreshes the batch summary.
/// </summary>
/// <remarks>
/// Only issues with origin <see cref="ImportIssueOrigin.Matching"/> are rebuilt. Parsing, validation and duplicate
/// issues (missing price, total mismatch, invalid quantity, possible duplicate) survive untouched, and the Excel
/// file is never read again: matching works from the staged original text plus the batch's decisions.
/// </remarks>
public sealed class ImportRevalidator(IBaxOrdersDbContext db, ImportCatalogLoader catalogLoader)
{
    /// <summary>Re-matches the given rows, saves them and refreshes the batch summary.</summary>
    public async Task RevalidateAsync(ImportBatch batch, IReadOnlyCollection<ImportRow> rows, CancellationToken cancellationToken)
    {
        if (rows.Count > 0)
        {
            var resolutions = await LoadResolutionsAsync(batch.Id, cancellationToken);
            var productNames = rows.Select(row => row.NormalizedProductName).OfType<string>().Distinct(StringComparer.Ordinal).ToList();

            // Products chosen in review may no longer share a name with any staged row; their variants are needed too.
            var catalog = await catalogLoader.LoadAsync(
                productNames, resolutions.TargetsOf(ImportResolutionKind.Product), cancellationToken);

            foreach (var row in rows)
            {
                var matching = ImportRowMatcher.Match(MatchingInput.From(row), catalog, resolutions);

                row.RemoveIssues(ImportIssueOrigin.Matching);
                row.ApplyMatches(matching.Matches);
                foreach (var issue in matching.Issues)
                {
                    row.AddIssue(issue.IssueType, issue.Severity, issue.Origin, issue.Message, issue.FieldName, issue.SuggestedEntityId);
                }

                row.RefreshValidationStatus();
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        await RefreshSummaryAsync(batch, cancellationToken);
    }

    /// <summary>
    /// Re-evaluates rows whose text changed, which is what a correction does: parsing, validation and matching
    /// issues are rebuilt from the effective values, typed values are parsed again, and the possible-duplicate
    /// groups the change touches are refreshed. Staging issues survive: they describe the workbook itself and
    /// cannot be produced again from staged text.
    /// </summary>
    public async Task ReevaluateAsync(ImportBatch batch, IReadOnlyCollection<ImportRow> rows, CancellationToken cancellationToken)
    {
        if (rows.Count > 0)
        {
            var resolutions = await LoadResolutionsAsync(batch.Id, cancellationToken);
            var productNames = rows.Select(row => row.NormalizedProductName).OfType<string>().Distinct(StringComparer.Ordinal).ToList();
            var catalog = await catalogLoader.LoadAsync(
                productNames, resolutions.TargetsOf(ImportResolutionKind.Product), cancellationToken);

            var moved = new List<(long RowId, string? From, string? To)>(rows.Count);

            foreach (var row in rows)
            {
                var values = EffectiveRowValues.Of(row);
                var evaluation = ImportRowEvaluator.Evaluate(values, catalog, resolutions);

                row.RemoveIssues(ImportIssueOrigin.Parsing);
                row.RemoveIssues(ImportIssueOrigin.Validation);
                row.RemoveIssues(ImportIssueOrigin.Matching);

                row.SetParsedValues(evaluation.Quantity, evaluation.UnitPrice, evaluation.LineTotal, evaluation.RequestPeriod);
                row.ApplyMatches(evaluation.Matches);
                foreach (var issue in evaluation.Issues)
                {
                    row.AddIssue(issue.IssueType, issue.Severity, issue.Origin, issue.Message, issue.FieldName, issue.SuggestedEntityId);
                }

                var before = row.DuplicateFingerprint;
                var after = Fingerprint(values, evaluation);
                row.SetDuplicateFingerprint(after);
                moved.Add((row.Id, before, after));

                row.RefreshValidationStatus();
            }

            await db.SaveChangesAsync(cancellationToken);
            await RefreshDuplicatesAsync(batch.Id, moved, cancellationToken);
        }

        await RefreshSummaryAsync(batch, cancellationToken);
    }

    /// <summary>
    /// Computes the possible-duplicate fingerprints of a batch staged before they were stored, so a correction
    /// can refresh single groups instead of the whole batch. Runs once per batch and changes no issue.
    /// </summary>
    public async Task EnsureFingerprintsAsync(long importBatchId, CancellationToken cancellationToken)
    {
        if (await db.ImportRows.AsNoTracking().AnyAsync(row => row.ImportBatchId == importBatchId && row.DuplicateFingerprint != null, cancellationToken))
        {
            return;
        }

        var rows = await db.ImportRows
            .Include(row => row.Corrections)
            .Where(row => row.ImportBatchId == importBatchId)
            .ToListAsync(cancellationToken);

        foreach (var row in rows)
        {
            // The stored parsed values are what the fingerprint needs; nothing is re-matched here.
            var evaluation = new RowEvaluation(
                row.ParsedQuantity, row.ParsedUnitPrice, row.ParsedLineTotal, row.ParsedRequestPeriod, EmptyMatches, []);
            row.SetDuplicateFingerprint(Fingerprint(EffectiveRowValues.Of(row), evaluation));
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Rebuilds the possible-duplicate issues of the fingerprint groups a change touched: the group a row left
    /// and the group it joined. Duplicates stay informational and are never merged or removed.
    /// </summary>
    private async Task RefreshDuplicatesAsync(
        long importBatchId, IReadOnlyList<(long RowId, string? From, string? To)> moved, CancellationToken cancellationToken)
    {
        var fingerprints = moved
            .SelectMany(change => new[] { change.From, change.To })
            .OfType<string>()
            .Distinct(StringComparer.Ordinal)
            .ToList();
        var rowIds = moved.Select(change => change.RowId).ToList();

        var affected = await db.ImportRows
            .Include(row => row.Issues)
            .Where(row => row.ImportBatchId == importBatchId
                          && (rowIds.Contains(row.Id)
                              || (row.DuplicateFingerprint != null && fingerprints.Contains(row.DuplicateFingerprint))))
            .ToListAsync(cancellationToken);

        foreach (var row in affected)
        {
            row.RemoveIssues(ImportIssueOrigin.DuplicateDetection);
        }

        foreach (var group in affected
                     .Where(row => row.DuplicateFingerprint is not null)
                     .GroupBy(row => row.DuplicateFingerprint!, StringComparer.Ordinal))
        {
            var members = group.ToList();
            if (members.Count < 2)
            {
                continue;
            }

            foreach (var row in members)
            {
                var others = members
                    .Where(other => other.Id != row.Id)
                    .Select(other => other.SheetName == row.SheetName ? $"{other.RowNumber}" : $"{other.SheetName}!{other.RowNumber}");

                // Informational only: identical lines can be legitimate, so this never changes the row status.
                row.AddIssue(ImportIssueType.DuplicateRow, IssueSeverity.Info, ImportIssueOrigin.DuplicateDetection,
                    $"Possible duplicate: same business values as row(s) {string.Join(", ", others)}. Review only; nothing was changed.");
            }
        }

        foreach (var row in affected)
        {
            row.RefreshValidationStatus();
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static string? Fingerprint(IRowValues values, RowEvaluation evaluation) =>
        DuplicateRowDetector.Fingerprint(values, evaluation) is { } fingerprint ? ImportSourceKeys.Hash(fingerprint) : null;

    private static readonly ImportRowMatches EmptyMatches = new(null, null, null, null, null, null, null, null);

    public async Task<ImportResolutionSet> LoadResolutionsAsync(long importBatchId, CancellationToken cancellationToken)
    {
        var resolutions = await db.ImportResolutions.AsNoTracking()
            .Where(resolution => resolution.ImportBatchId == importBatchId)
            .ToListAsync(cancellationToken);

        return new ImportResolutionSet(
            resolutions.Where(resolution => !resolution.IsNotAUnit)
                .Select(resolution => (resolution.Kind, resolution.SourceKey, resolution.TargetId)),
            resolutions.Where(resolution => resolution.IsNotAUnit)
                .Select(resolution => (resolution.Kind, resolution.SourceKey)));
    }

    /// <summary>Recounts row statuses and decides whether the batch still needs review.</summary>
    public async Task RefreshSummaryAsync(ImportBatch batch, CancellationToken cancellationToken)
    {
        // An excluded row stays staged and keeps its issues, but it is counted on its own and never blocks.
        var statusCounts = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batch.Id && !row.IsExcluded)
            .GroupBy(row => row.ValidationStatus)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        var excludedRows = await db.ImportRows.AsNoTracking()
            .CountAsync(row => row.ImportBatchId == batch.Id && row.IsExcluded, cancellationToken);

        // Distinct (type, severity) pairs are few, so the blocking rule stays in one place.
        var issueKinds = await db.ImportRowIssues.AsNoTracking()
            .Where(issue => issue.ImportRow.ImportBatchId == batch.Id && !issue.ImportRow.IsExcluded)
            .Select(issue => new { issue.IssueType, issue.Severity })
            .Distinct()
            .ToListAsync(cancellationToken);

        int CountOf(ImportRowValidationStatus status) =>
            statusCounts.FirstOrDefault(count => count.Status == status)?.Count ?? 0;

        batch.RefreshValidationSummary(
            CountOf(ImportRowValidationStatus.Valid),
            CountOf(ImportRowValidationStatus.NeedsReview),
            CountOf(ImportRowValidationStatus.Invalid),
            excludedRows,
            issueKinds.Any(kind => ImportIssueRules.IsBlocking(kind.IssueType, kind.Severity)));

        await db.SaveChangesAsync(cancellationToken);
    }
}
