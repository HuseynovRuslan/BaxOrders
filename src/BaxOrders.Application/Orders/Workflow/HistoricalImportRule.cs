using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Orders.Workflow;

/// <summary>
/// Whether a request was carried in from Excel as already approved, rather than approved in this application.
/// </summary>
/// <remarks>
/// Both kinds are <c>Approved</c>, so the status cannot tell them apart; only the recorded events can. The rule is
/// written here once, with the revision-chain walk it reads, and everything that says "historical" asks it: the
/// order page's decision facts one request at a time, and the lists a page at a time. So the two can never
/// disagree (owner decision 22.4). It only reads — it never changes a status, an event or anything else.
/// </remarks>
public static class HistoricalImportRule
{
    /// <summary>
    /// Carried in from Excel as already approved: nothing in the chain was ever sent for approval, and the
    /// request's own history holds the carried-over event.
    /// </summary>
    /// <param name="ownActions">The request's own recorded actions.</param>
    /// <param name="earlierActions">The actions of every version it corrects (see <see cref="EarlierVersions"/>).</param>
    public static bool Holds(IEnumerable<OrderWorkflowAction> ownActions, IEnumerable<OrderWorkflowAction> earlierActions)
    {
        ArgumentNullException.ThrowIfNull(ownActions);
        ArgumentNullException.ThrowIfNull(earlierActions);

        List<OrderWorkflowAction> own = [.. ownActions];

        var everSubmitted = earlierActions.Concat(own).Any(action => action == OrderWorkflowAction.SubmittedForApproval);
        return !everSubmitted && own.Contains(OrderWorkflowAction.ImportedAsApproved);
    }

    /// <summary>
    /// The versions this request corrects, nearest first, followed back through the revision links.
    /// </summary>
    /// <remarks>
    /// Only a revision link makes a version part of the chain — a new version made by a second import is not a
    /// correction, and starts its own. A link seen twice ends the walk, so bad data cannot loop it.
    /// </remarks>
    /// <param name="sourceByRevision">Each revision request's source request.</param>
    public static IReadOnlyList<long> EarlierVersions(long orderRequestId, IReadOnlyDictionary<long, long> sourceByRevision)
    {
        ArgumentNullException.ThrowIfNull(sourceByRevision);

        var earlier = new List<long>();
        for (var current = orderRequestId; sourceByRevision.TryGetValue(current, out var source) && !earlier.Contains(source); current = source)
        {
            earlier.Add(source);
        }

        return earlier;
    }

    /// <summary>
    /// Which of these requests are historical imports, by the same rule and the same chain as the order page.
    /// </summary>
    /// <remarks>
    /// Two queries whatever the number of requests and the length of their chains, and none for an empty page:
    /// the revision links of every given request's location and month, walked in memory, then the actions of the
    /// requests and of all their earlier versions together. Which actions matter is <see cref="Holds"/>'s
    /// business alone, so the events are not filtered by action here.
    /// </remarks>
    public static async Task<IReadOnlySet<long>> AmongAsync(
        IBaxOrdersDbContext db, IReadOnlyCollection<long> orderRequestIds, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        ArgumentNullException.ThrowIfNull(orderRequestIds);

        if (orderRequestIds.Count == 0)
        {
            return new HashSet<long>();
        }

        long[] ids = [.. orderRequestIds.Distinct()];

        // The scope the order page reads for one request — the revision links of its own location and month —
        // taken for every given request at once.
        var links = await db.OrderRequestRevisions.AsNoTracking()
            .Where(revision => db.OrderRequests.Any(request => ids.Contains(request.Id)
                && request.LocationId == revision.RevisionOrderRequest.LocationId
                && request.RequestPeriod == revision.RevisionOrderRequest.RequestPeriod))
            .Select(revision => new { revision.RevisionOrderRequestId, revision.SourceOrderRequestId })
            .ToDictionaryAsync(revision => revision.RevisionOrderRequestId, revision => revision.SourceOrderRequestId, cancellationToken);

        var earlierOf = ids.ToDictionary(id => id, id => EarlierVersions(id, links));
        long[] chainIds = [.. ids.Concat(earlierOf.Values.SelectMany(earlier => earlier)).Distinct()];

        var events = await db.OrderRequestWorkflowEvents.AsNoTracking()
            .Where(workflowEvent => chainIds.Contains(workflowEvent.OrderRequestId))
            .Select(workflowEvent => new { workflowEvent.OrderRequestId, workflowEvent.Action })
            .ToListAsync(cancellationToken);

        var actionsOf = events.ToLookup(workflowEvent => workflowEvent.OrderRequestId, workflowEvent => workflowEvent.Action);

        return ids
            .Where(id => Holds(actionsOf[id], earlierOf[id].SelectMany(earlier => actionsOf[earlier])))
            .ToHashSet();
    }
}
