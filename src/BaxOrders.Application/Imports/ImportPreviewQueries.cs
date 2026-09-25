using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Pricing;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Imports;

/// <summary>
/// Read-side of the import preview. Counts are aggregated in SQL, except the price counts, which are read row by
/// row through <see cref="ImportLinePricing"/> so they cannot drift from Task 2's rule; rows are paged on the server.
/// </summary>
public sealed class ImportPreviewQueries(IBaxOrdersDbContext db)
{
    public const int MaxPageSize = 200;

    public async Task<ImportPreview?> GetPreviewAsync(long importBatchId, CancellationToken cancellationToken)
    {
        var batch = await db.ImportBatches.AsNoTracking()
            .Where(b => b.Id == importBatchId)
            .Select(b => new ImportBatchSummary(
                b.Id, b.OriginalFileName, b.Status, b.TotalRows, b.ValidRows, b.WarningRows, b.InvalidRows,
                b.UploadedAtUtc, b.CompletedAtUtc, b.FailureReason))
            .SingleOrDefaultAsync(cancellationToken);

        if (batch is null)
        {
            return null;
        }

        var issueSummary = (await db.ImportRowIssues.AsNoTracking()
                .Where(i => i.ImportRow.ImportBatchId == importBatchId)
                .GroupBy(i => new { i.IssueType, i.Severity })
                .Select(g => new { g.Key.IssueType, g.Key.Severity, Count = g.Count() })
                .ToListAsync(cancellationToken))
            .Select(g => new ImportIssueCount(g.IssueType, g.Severity, g.Count))
            .OrderByDescending(g => g.Severity)
            .ThenByDescending(g => g.Count)
            .ToList();

        // Groups are location + request period; the order workbook has no separate request date.
        var rowGroups = await db.ImportRows.AsNoTracking()
            .Where(r => r.ImportBatchId == importBatchId && r.MatchedLocationId != null && r.ParsedRequestPeriod != null)
            .GroupBy(r => new { LocationId = r.MatchedLocationId!.Value, Period = r.ParsedRequestPeriod!.Value })
            .Select(g => new
            {
                g.Key.LocationId,
                g.Key.Period,
                RowCount = g.Count(),
                PricedRows = g.Count(r => r.ParsedUnitPrice != null),
            })
            .ToListAsync(cancellationToken);

        // Task 2's price counts per group, through the one rule: each included row is read for its effective
        // price and what the review said about it, and nothing else — never its supplier (brief 16).
        var pricingRows = await db.ImportRows.AsNoTracking()
            .Where(r => r.ImportBatchId == importBatchId && !r.IsExcluded && r.MatchedLocationId != null && r.ParsedRequestPeriod != null)
            .Select(r => new
            {
                LocationId = r.MatchedLocationId!.Value,
                Period = r.ParsedRequestPeriod!.Value,
                r.ParsedUnitPrice,
                r.PricingClassification,
            })
            .ToListAsync(cancellationToken);

        var pricing = pricingRows
            .GroupBy(r => (r.LocationId, r.Period))
            .ToDictionary(g => g.Key, g => ImportPricingCounts.Of(g.Select(r => (r.ParsedUnitPrice, r.PricingClassification))));

        var issueGroups = await db.ImportRowIssues.AsNoTracking()
            .Where(i => i.ImportRow.ImportBatchId == importBatchId
                        && i.ImportRow.MatchedLocationId != null
                        && i.ImportRow.ParsedRequestPeriod != null
                        && i.Severity != IssueSeverity.Info)
            .GroupBy(i => new
            {
                LocationId = i.ImportRow.MatchedLocationId!.Value,
                Period = i.ImportRow.ParsedRequestPeriod!.Value,
                i.Severity,
            })
            .Select(g => new { g.Key.LocationId, g.Key.Period, g.Key.Severity, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var locationIds = rowGroups.Select(g => g.LocationId).Distinct().ToList();
        var locationNames = await db.Locations.AsNoTracking()
            .Where(l => locationIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => l.Name, cancellationToken);

        // Existing logical requests are identified by LocationId + RequestPeriod.
        var existing = new Dictionary<(int LocationId, DateOnly Period), int>();
        if (rowGroups.Count > 0)
        {
            var firstPeriod = rowGroups.Min(g => g.Period);
            var lastPeriod = rowGroups.Max(g => g.Period);

            foreach (var request in await db.OrderRequests.AsNoTracking()
                         .Where(r => locationIds.Contains(r.LocationId) && r.RequestPeriod >= firstPeriod && r.RequestPeriod <= lastPeriod)
                         .GroupBy(r => new { r.LocationId, r.RequestPeriod })
                         .Select(g => new { g.Key.LocationId, g.Key.RequestPeriod, LatestVersion = g.Max(r => r.Version) })
                         .ToListAsync(cancellationToken))
            {
                existing[(request.LocationId, request.RequestPeriod)] = request.LatestVersion;
            }
        }

        var groups = rowGroups
            .Select(g =>
            {
                int CountIssues(IssueSeverity severity) => issueGroups
                    .Where(i => i.LocationId == g.LocationId && i.Period == g.Period && i.Severity == severity)
                    .Sum(i => i.Count);
                int? latestVersion = existing.TryGetValue((g.LocationId, g.Period), out var version) ? version : null;
                var groupPricing = pricing.GetValueOrDefault((g.LocationId, g.Period), ImportPricingCounts.Empty);

                return new ImportGroupPreview(
                    g.LocationId,
                    locationNames.GetValueOrDefault(g.LocationId, $"#{g.LocationId}"),
                    g.Period,
                    g.RowCount,
                    g.PricedRows,
                    g.RowCount - g.PricedRows,
                    CountIssues(IssueSeverity.Warning),
                    CountIssues(IssueSeverity.Error),
                    latestVersion is not null,
                    latestVersion,
                    latestVersion is null ? GroupSuggestedAction.CreateNewRequest : GroupSuggestedAction.RequiresOperatorDecision,
                    groupPricing.MissingPrice,
                    groupPricing.InternalSupply);
            })
            .OrderBy(g => g.Period)
            .ThenBy(g => g.LocationName, AzerbaijaniCollation.Comparer)
            .ToList();

        return new ImportPreview(batch, issueSummary, groups, batch.TotalRows - groups.Sum(g => g.RowCount));
    }

    public async Task<PagedResult<ImportRowDto>?> GetRowsAsync(long importBatchId, ImportRowQuery query, CancellationToken cancellationToken)
    {
        if (!await db.ImportBatches.AnyAsync(b => b.Id == importBatchId, cancellationToken))
        {
            return null;
        }

        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var rows = db.ImportRows.AsNoTracking().Where(r => r.ImportBatchId == importBatchId);

        if (query.Status is { } status)
        {
            rows = rows.Where(r => r.ValidationStatus == status);
        }

        if (query.IssueType is { } issueType)
        {
            rows = rows.Where(r => r.Issues.Any(i => i.IssueType == issueType));
        }

        if (query.LocationId is { } locationId)
        {
            rows = rows.Where(r => r.MatchedLocationId == locationId);
        }

        if (query.Period is { } period)
        {
            var requestPeriod = OrderRequest.PeriodOf(period);
            rows = rows.Where(r => r.ParsedRequestPeriod == requestPeriod);
        }

        var search = TextNormalizer.Normalize(query.Search);
        if (search.Length > 0)
        {
            rows = rows.Where(r => r.NormalizedProductName != null && r.NormalizedProductName.Contains(search));
        }

        var totalCount = await rows.CountAsync(cancellationToken);

        var items = await rows
            .OrderBy(r => r.SheetName)
            .ThenBy(r => r.RowNumber)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new ImportRowDto(
                r.Id,
                r.SheetName,
                r.RowNumber,
                r.OriginalProductName,
                r.OriginalSpecificationValue,
                r.OriginalSpecificationUnit,
                r.OriginalModelCode,
                r.OriginalQuantity,
                r.ParsedQuantity,
                r.OriginalOrderUnit,
                r.OriginalUnitPrice,
                r.ParsedUnitPrice,
                r.OriginalLineTotal,
                r.OriginalSupplierName,
                r.OriginalLocationName,
                r.OriginalRequestDate,
                r.ParsedRequestPeriod,
                r.OriginalResponsiblePersonName,
                r.ValidationStatus,
                r.Issues.OrderBy(i => i.Id)
                    .Select(i => new ImportRowIssueDto(i.IssueType, i.Severity, i.FieldName, i.Message))
                    .ToList()))
            .ToListAsync(cancellationToken);

        return new PagedResult<ImportRowDto>(items, page, pageSize, totalCount);
    }
}
