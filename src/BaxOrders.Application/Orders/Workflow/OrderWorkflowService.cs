using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Domain;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Orders.Workflow;

/// <summary>
/// Moving a permanent order through approval, and reading where it stands.
/// </summary>
/// <remarks>
/// Every write goes through here, and the transition itself is the domain's: this service loads the request
/// with its items, hands the decision to <see cref="OrderRequest"/> and saves. It never sets a status.
/// <para>
/// Three facts are taken from the server rather than from the caller: who is acting, how many lines have no
/// price, and what the request's money actually is. A client that claims to be somebody else, or that a
/// request is fully priced, does not make either true.
/// </para>
/// <para>
/// A version that has been corrected takes no further workflow action: its correction version is the live one
/// now. Every transition locks the request's row for its transaction, the same lock a correction takes, so a
/// returned request cannot be sent back unchanged at the very moment somebody corrects it.
/// </para>
/// </remarks>
public sealed class OrderWorkflowService(IBaxOrdersDbContext db, ICurrentUserContext currentUser, IOrderRequestLock requestLock)
{
    /// <returns>Null when the request does not exist.</returns>
    public async Task<OrderWorkflowDto?> GetAsync(long orderRequestId, CancellationToken cancellationToken)
    {
        var request = await db.OrderRequests.AsNoTracking()
            .Include(order => order.Location)
            .FirstOrDefaultAsync(order => order.Id == orderRequestId, cancellationToken);

        if (request is null)
        {
            return null;
        }

        var totals = await TotalsAsync(orderRequestId, cancellationToken);
        var history = await HistoryAsync(orderRequestId, cancellationToken);
        var correction = await CorrectionOfAsync(orderRequestId, cancellationToken);
        var contributed = await ContributedAsync(orderRequestId, cancellationToken);

        return Describe(request, totals, history, superseded: correction is not null, contributedEdits: contributed);
    }

    public Task<OrderWorkflowDto> SubmitAsync(
        long orderRequestId, SubmitForApprovalCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        return TransitionAsync(
            orderRequestId,
            request => request.SubmitForApproval(Actor(), command.Comment, DateTime.UtcNow),
            cancellationToken);
    }

    public Task<OrderWorkflowDto> ApproveAsync(
        long orderRequestId, ApproveOrderCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        return TransitionAsync(
            orderRequestId,
            request => request.Approve(
                Actor(), command.Comment, command.AcknowledgeMissingPrices, DateTime.UtcNow),
            cancellationToken);
    }

    public Task<OrderWorkflowDto> ReturnAsync(
        long orderRequestId, ReturnForCorrectionCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        return TransitionAsync(
            orderRequestId,
            request => request.ReturnForCorrection(Actor(), command.Reason, DateTime.UtcNow),
            cancellationToken);
    }

    /// <summary>The person acting, from the session and from nowhere else.</summary>
    private WorkflowActor Actor() => CurrentActor.Of(currentUser, "You must be signed in to act on an order.");

    private async Task<OrderWorkflowDto> TransitionAsync(
        long orderRequestId, Action<OrderRequest> transition, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await requestLock.AcquireAsync(orderRequestId, cancellationToken);

        // Tracked and with its items, because the domain needs them: a request with no line cannot be
        // submitted, and the unpriced lines are what an approver has to acknowledge.
        // The edit history and the correction link come too: the domain refuses a decision by anybody who
        // worked on the correction, and it can only see that if they are loaded.
        var request = await db.OrderRequests
            .Include(order => order.Location)
            .Include(order => order.Items)
                // Without the suppliers the domain cannot tell a price somebody owes from material issued
                // internally, and it refuses to guess rather than demand an acknowledgement nobody owes.
                .ThenInclude(item => item.Supplier)
            .Include(order => order.RevisedFrom)
            .Include(order => order.EditEvents)
            .FirstOrDefaultAsync(order => order.Id == orderRequestId, cancellationToken)
            ?? throw new NotFoundException($"Order request #{orderRequestId} was not found.");

        // Corrected means superseded. Sending the returned version back unchanged now would put two versions
        // of one month in front of the approver; the correction is the one to act on.
        if (await CorrectionOfAsync(orderRequestId, cancellationToken) is { } correction)
        {
            throw new DomainException(
                $"Version {request.Version} has been corrected as version {correction.Version}; act on that version instead.");
        }

        transition(request);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Somebody else acted on this request between the read and the write. Nothing was written, and
            // the caller is told rather than having their command applied on top of a state they never saw.
            throw new ConflictException(
                "This request was changed by someone else while you were working on it. Reload it and try again.");
        }

        var totals = await TotalsAsync(orderRequestId, cancellationToken);
        var history = await HistoryAsync(orderRequestId, cancellationToken);
        var contributed = await ContributedAsync(orderRequestId, cancellationToken);

        return Describe(request, totals, history, superseded: false, contributedEdits: contributed);
    }

    /// <summary>Whether the signed-in person appears in this request's edit history.</summary>
    private Task<bool> ContributedAsync(long orderRequestId, CancellationToken cancellationToken) =>
        currentUser.UserId is { } userId
            ? db.OrderRequestEditEvents.AsNoTracking()
                .AnyAsync(editEvent => editEvent.OrderRequestId == orderRequestId && editEvent.ActorUserId == userId, cancellationToken)
            : Task.FromResult(false);

    /// <summary>The correction version made from this request, if one has been.</summary>
    private Task<CorrectionRef?> CorrectionOfAsync(long orderRequestId, CancellationToken cancellationToken) =>
        db.OrderRequestRevisions.AsNoTracking()
            .Where(revision => revision.SourceOrderRequestId == orderRequestId)
            .Select(revision => new CorrectionRef(revision.RevisionOrderRequestId, revision.RevisionOrderRequest.Version))
            .FirstOrDefaultAsync(cancellationToken);

    private async Task<WorkflowTotals> TotalsAsync(long orderRequestId, CancellationToken cancellationToken)
    {
        var totals = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.OrderRequestId == orderRequestId)
            .GroupBy(item => 1)
            .Select(group => new
            {
                ItemCount = group.Count(),
                // A price is only missing when somebody owed it. See SupplierPriceRequirement; a line with no
                // supplier is read as bought, because nothing has said otherwise.
                MissingRequiredPriceItemCount = group.Count(item => item.UnitPrice == null
                    && (item.Supplier == null || item.Supplier.PriceRequirement == SupplierPriceRequirement.Required)),
                PriceNotRequiredItemCount = group.Count(item => item.UnitPrice == null
                    && item.Supplier != null && item.Supplier.PriceRequirement == SupplierPriceRequirement.NotRequired),
                KnownPriceItemCount = group.Count(item => item.UnitPrice != null),
                PricedAmount = group.Sum(item => item.Quantity * (item.UnitPrice ?? 0m)),
            })
            .FirstOrDefaultAsync(cancellationToken);

        return totals is null
            ? new WorkflowTotals(0, 0, 0, 0, 0m)
            : new WorkflowTotals(
                totals.ItemCount,
                totals.MissingRequiredPriceItemCount,
                totals.PriceNotRequiredItemCount,
                totals.KnownPriceItemCount,
                totals.PricedAmount);
    }

    private async Task<List<WorkflowEventDto>> HistoryAsync(long orderRequestId, CancellationToken cancellationToken) =>
        await db.OrderRequestWorkflowEvents.AsNoTracking()
            .Where(workflowEvent => workflowEvent.OrderRequestId == orderRequestId)
            .OrderBy(workflowEvent => workflowEvent.OccurredAtUtc)
            .ThenBy(workflowEvent => workflowEvent.Id)
            .Select(workflowEvent => new WorkflowEventDto(
                workflowEvent.Id,
                workflowEvent.Action,
                workflowEvent.FromStatus,
                workflowEvent.ToStatus,
                workflowEvent.ActorUserId,
                workflowEvent.ActorDisplayName,
                workflowEvent.Comment,
                workflowEvent.MissingPriceItemCount,
                workflowEvent.MissingPricesAcknowledged,
                workflowEvent.OccurredAtUtc))
            .ToListAsync(cancellationToken);

    private OrderWorkflowDto Describe(
        OrderRequest request,
        WorkflowTotals totals,
        IReadOnlyList<WorkflowEventDto> history,
        bool superseded,
        bool contributedEdits) =>
        new(request.Id,
            request.LocationId,
            request.Location.Name,
            request.RequestPeriod,
            request.Version,
            request.Status,
            AllowedWorkflowActionsDto.For(request.Status, request.SubmittedByUserId, currentUser, superseded, contributedEdits),
            request.SubmittedByUserId,
            request.SubmittedAtUtc,
            request.ApprovedAtUtc,
            request.ReturnedAtUtc,
            totals.ItemCount,
            totals.MissingRequiredPriceItemCount,
            totals.PriceNotRequiredItemCount,
            // Unknown money is not zero money, so a request with nothing priced has no amount at all.
            totals.KnownPriceItemCount == 0 ? null : totals.PricedAmount,
            // Complete means nothing is owed, not that every line carries a price.
            totals.MissingRequiredPriceItemCount == 0,
            totals.MissingRequiredPriceItemCount > 0,
            history);

    /// <param name="MissingRequiredPriceItemCount">Lines somebody owes a price for — the approval question.</param>
    /// <param name="PriceNotRequiredItemCount">Lines issued from the company's own store, complete as they are.</param>
    private sealed record WorkflowTotals(
        int ItemCount,
        int MissingRequiredPriceItemCount,
        int PriceNotRequiredItemCount,
        int KnownPriceItemCount,
        decimal PricedAmount);

    private sealed record CorrectionRef(long OrderRequestId, int Version);
}
