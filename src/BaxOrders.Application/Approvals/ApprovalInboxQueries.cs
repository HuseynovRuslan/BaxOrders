using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Common;
using BaxOrders.Application.Imports;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Approvals;

/// <summary>
/// Every permanent request waiting for a decision, for the person who may make one.
/// </summary>
/// <remarks>
/// This is not the workflow endpoint called once per row: every request pending approval is fetched together,
/// in one query, with exactly the facts <see cref="AllowedWorkflowActionsDto.For"/> needs to decide what each
/// one may do — the very same rule the workflow endpoint uses, read here rather than re-implemented. Nothing
/// here writes, and nothing here decides anything on its own: it is a queue to look at, not an action.
/// <para>
/// A request pending approval can never itself be the source of a correction — only a returned one can be
/// corrected — so it is never superseded, and that fact does not have to be queried for here.
/// </para>
/// </remarks>
public sealed class ApprovalInboxQueries(IBaxOrdersDbContext db, ICurrentUserContext currentUser)
{
    public const int DefaultPageSize = 25;
    public const int MaxPageSize = 100;

    public async Task<ApprovalInboxDto> GetAsync(ApprovalInboxQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        // The endpoint's policy already guarantees this; the service checks again, the same way every other
        // service in this application does, rather than trusting that nothing upstream ever changes.
        if (!currentUser.IsAuthenticated)
        {
            throw new ForbiddenException("You must be signed in to see the approval inbox.");
        }

        var period = ParsePeriod(query.Period);
        var userId = currentUser.UserId;

        // One query for the whole queue. A request pending approval is rare by the nature of the business —
        // a work queue, not a report over history — so building each row's allowed actions afterwards is one
        // pass over a short, already-materialized list, never a round trip per row.
        var rows = await db.OrderRequests.AsNoTracking()
            .Where(request => request.Status == OrderRequestStatus.PendingApproval)
            .Select(request => new
            {
                request.Id,
                request.LocationId,
                LocationCode = request.Location.Code,
                LocationName = request.Location.Name,
                request.RequestPeriod,
                request.Version,
                request.SubmittedAtUtc,
                request.SubmittedByUserId,
                ItemCount = request.Items.Count,
                // Only the prices somebody owes. Material the company supplies itself carries none, and an
                // approver has nothing to acknowledge for it.
                MissingPriceItemCount = request.Items.Count(item => item.UnitPrice == null
                    && item.PricingMode != PricingMode.InternalFreeSupply),
                KnownPriceItemCount = request.Items.Count(item => item.UnitPrice != null),
                KnownAmount = request.Items.Sum(item => (decimal?)(item.Quantity * item.UnitPrice)),
                // The display name is the snapshot on the current cycle's own submit event, not a live lookup:
                // a request may have been returned and resubmitted, so the latest SubmittedForApproval event is
                // the one that matches SubmittedByUserId, and its name is what the workflow history would show.
                SubmittedByDisplayName = db.OrderRequestWorkflowEvents
                    .Where(workflowEvent => workflowEvent.OrderRequestId == request.Id
                        && workflowEvent.Action == OrderWorkflowAction.SubmittedForApproval)
                    .OrderByDescending(workflowEvent => workflowEvent.OccurredAtUtc)
                    .ThenByDescending(workflowEvent => workflowEvent.Id)
                    .Select(workflowEvent => workflowEvent.ActorDisplayName)
                    .FirstOrDefault(),
                RevisedFrom = db.OrderRequestRevisions
                    .Where(revision => revision.RevisionOrderRequestId == request.Id)
                    .Select(revision => new { revision.SourceOrderRequestId, revision.SourceOrderRequest.Version })
                    .FirstOrDefault(),
                ContributedByCurrentUser = userId != null && db.OrderRequestEditEvents
                    .Any(editEvent => editEvent.OrderRequestId == request.Id && editEvent.ActorUserId == userId),
            })
            .ToListAsync(cancellationToken);

        var described = rows.Select(row =>
        {
            var allowed = AllowedWorkflowActionsDto.For(
                OrderRequestStatus.PendingApproval,
                row.SubmittedByUserId,
                currentUser,
                superseded: false,
                contributedEdits: row.ContributedByCurrentUser);

            return new ApprovalInboxRowDto(
                row.Id,
                row.LocationId,
                row.LocationCode,
                row.LocationName,
                row.RequestPeriod,
                row.Version,
                // Set unconditionally by the domain the moment a request becomes PendingApproval.
                row.SubmittedAtUtc!.Value,
                row.SubmittedByUserId,
                row.SubmittedByDisplayName ?? "Sistem",
                row.ItemCount,
                row.KnownPriceItemCount == 0 ? null : row.KnownAmount,
                row.MissingPriceItemCount,
                row.MissingPriceItemCount == 0,
                row.RevisedFrom is not null,
                row.RevisedFrom?.Version,
                row.RevisedFrom?.SourceOrderRequestId,
                allowed.CanApprove,
                allowed.CanReturn,
                allowed.BlockedBySelfApproval,
                allowed.BlockedByOwnContribution);
        }).ToList();

        // The summary describes the complete queue, before search or filters narrow it — the same convention
        // the management dashboard's summary follows, and for the same reason.
        var summary = Summarize(described);

        var filtered = Sort(Filter(described, query, period), query);
        var (page, pageSize) = PageOf(query.Page, query.PageSize);
        var pageRows = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return new ApprovalInboxDto(
            summary,
            filtered.Count,
            new PagedResult<ApprovalInboxRowDto>(pageRows, page, pageSize, filtered.Count));
    }

    private static ApprovalInboxSummaryDto Summarize(IReadOnlyList<ApprovalInboxRowDto> rows) => new(
        PendingCount: rows.Count,
        ActionableByCurrentUserCount: rows.Count(row => row.CanApprove),
        BlockedForCurrentUserCount: rows.Count(row => !row.CanApprove),
        MissingPriceRequestCount: rows.Count(row => row.MissingPriceItemCount > 0),
        MissingPriceItemCount: rows.Sum(row => row.MissingPriceItemCount),
        RevisionCount: rows.Count(row => row.IsRevision));

    private static List<ApprovalInboxRowDto> Filter(
        List<ApprovalInboxRowDto> rows, ApprovalInboxQuery query, DateOnly? period)
    {
        IEnumerable<ApprovalInboxRowDto> filtered = rows;

        if (Search.Of(query.Search) is { } needle)
        {
            filtered = filtered.Where(row =>
                TextNormalizer.Normalize(row.LocationName).Contains(needle, StringComparison.Ordinal)
                || TextNormalizer.Normalize(row.LocationCode).Contains(needle, StringComparison.Ordinal));
        }

        if (period is { } selected)
        {
            filtered = filtered.Where(row => row.RequestPeriod == selected);
        }

        filtered = query.Actionability switch
        {
            ApprovalActionability.CanDecide => filtered.Where(row => row.CanApprove),
            ApprovalActionability.BlockedForMe => filtered.Where(row => !row.CanApprove),
            _ => filtered,
        };

        if (query.PriceCoverage is { } priceCoverage)
        {
            filtered = priceCoverage == ApprovalPriceCoverage.Complete
                ? filtered.Where(row => row.AmountIsComplete)
                : filtered.Where(row => !row.AmountIsComplete);
        }

        filtered = query.Revision switch
        {
            ApprovalRevisionFilter.Original => filtered.Where(row => !row.IsRevision),
            ApprovalRevisionFilter.Revision => filtered.Where(row => row.IsRevision),
            _ => filtered,
        };

        return [.. filtered];
    }

    /// <summary>
    /// Rows are ordered by a plain fact, oldest submission first by default because this is a queue to work
    /// through, not a ranking. A row with no figure to sort by goes last whichever direction is asked for — a
    /// missing amount is not a small one.
    /// </summary>
    private static List<ApprovalInboxRowDto> Sort(List<ApprovalInboxRowDto> rows, ApprovalInboxQuery query)
    {
        if (query.Sort == ApprovalInboxSort.LocationName)
        {
            return [.. query.Descending
                ? rows.OrderByDescending(row => row.LocationName, StringComparer.OrdinalIgnoreCase)
                : rows.OrderBy(row => row.LocationName, StringComparer.OrdinalIgnoreCase)];
        }

        if (query.Sort == ApprovalInboxSort.RequestPeriod)
        {
            var byPeriod = query.Descending
                ? rows.OrderByDescending(row => row.RequestPeriod)
                : rows.OrderBy(row => row.RequestPeriod);
            return [.. byPeriod.ThenBy(row => row.LocationName, StringComparer.OrdinalIgnoreCase)];
        }

        if (query.Sort == ApprovalInboxSort.SubmittedAtUtc)
        {
            var bySubmitted = query.Descending
                ? rows.OrderByDescending(row => row.SubmittedAtUtc)
                : rows.OrderBy(row => row.SubmittedAtUtc);
            return [.. bySubmitted.ThenBy(row => row.LocationName, StringComparer.OrdinalIgnoreCase)];
        }

        if (query.Sort == ApprovalInboxSort.MissingPriceItemCount)
        {
            var byMissing = query.Descending
                ? rows.OrderByDescending(row => row.MissingPriceItemCount)
                : rows.OrderBy(row => row.MissingPriceItemCount);
            return [.. byMissing.ThenBy(row => row.LocationName, StringComparer.OrdinalIgnoreCase)];
        }

        // KnownAmount: the one nullable key, so a row with nothing priced goes last regardless of direction.
        var withValue = rows.Where(row => row.KnownAmount is not null);
        var withoutValue = rows.Where(row => row.KnownAmount is null)
            .OrderBy(row => row.LocationName, StringComparer.OrdinalIgnoreCase);

        var ordered = query.Descending
            ? withValue.OrderByDescending(row => row.KnownAmount).ThenBy(row => row.LocationName, StringComparer.OrdinalIgnoreCase)
            : withValue.OrderBy(row => row.KnownAmount).ThenBy(row => row.LocationName, StringComparer.OrdinalIgnoreCase);

        return [.. ordered, .. withoutValue];
    }

    private static (int Page, int PageSize) PageOf(int page, int pageSize) =>
        (Math.Max(1, page), pageSize <= 0 ? DefaultPageSize : Math.Min(pageSize, MaxPageSize));

    private static DateOnly? ParsePeriod(string? period)
    {
        if (string.IsNullOrWhiteSpace(period))
        {
            return null;
        }

        return AnalyticsPeriod.TryParse(period, out var parsed)
            ? parsed
            : throw new ValidationException($"'period' must be a month in the form yyyy-MM (got '{period}').");
    }
}
