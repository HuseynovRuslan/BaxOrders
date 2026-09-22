using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Orders.Workflow;

/// <summary>
/// Moving a permanent order through approval, and reading where it stands.
/// </summary>
/// <remarks>
/// Every write goes through here, and the transition itself is the domain's: this service loads the request
/// with its items, hands the decision to <see cref="OrderRequest"/> and saves. It never sets a status.
/// <para>
/// Two facts are recomputed here on every call rather than taken from the caller: how many lines have no
/// price, and what the request's money actually is. A client that claims a request is fully priced does not
/// make it so.
/// </para>
/// </remarks>
public sealed class OrderWorkflowService(IBaxOrdersDbContext db)
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

        return Describe(request, totals, history);
    }

    public Task<OrderWorkflowDto> SubmitAsync(
        long orderRequestId, SubmitForApprovalCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        return TransitionAsync(
            orderRequestId,
            request => request.SubmitForApproval(command.ActorDisplayName, command.Comment, DateTime.UtcNow),
            cancellationToken);
    }

    public Task<OrderWorkflowDto> ApproveAsync(
        long orderRequestId, ApproveOrderCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        return TransitionAsync(
            orderRequestId,
            request => request.Approve(
                command.ActorDisplayName, command.Comment, command.AcknowledgeMissingPrices, DateTime.UtcNow),
            cancellationToken);
    }

    public Task<OrderWorkflowDto> ReturnAsync(
        long orderRequestId, ReturnForCorrectionCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        return TransitionAsync(
            orderRequestId,
            request => request.ReturnForCorrection(command.ActorDisplayName, command.Reason, DateTime.UtcNow),
            cancellationToken);
    }

    private async Task<OrderWorkflowDto> TransitionAsync(
        long orderRequestId, Action<OrderRequest> transition, CancellationToken cancellationToken)
    {
        // Tracked and with its items, because the domain needs them: a request with no line cannot be
        // submitted, and the unpriced lines are what an approver has to acknowledge.
        var request = await db.OrderRequests
            .Include(order => order.Location)
            .Include(order => order.Items)
            .FirstOrDefaultAsync(order => order.Id == orderRequestId, cancellationToken)
            ?? throw new NotFoundException($"Order request #{orderRequestId} was not found.");

        transition(request);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
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

        return Describe(request, totals, history);
    }

    private async Task<(int ItemCount, int MissingPriceItemCount, decimal PricedAmount, int KnownPriceItemCount)> TotalsAsync(
        long orderRequestId, CancellationToken cancellationToken)
    {
        var totals = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.OrderRequestId == orderRequestId)
            .GroupBy(item => 1)
            .Select(group => new
            {
                ItemCount = group.Count(),
                MissingPriceItemCount = group.Count(item => item.UnitPrice == null),
                KnownPriceItemCount = group.Count(item => item.UnitPrice != null),
                PricedAmount = group.Sum(item => item.Quantity * (item.UnitPrice ?? 0m)),
            })
            .FirstOrDefaultAsync(cancellationToken);

        return totals is null
            ? (0, 0, 0m, 0)
            : (totals.ItemCount, totals.MissingPriceItemCount, totals.PricedAmount, totals.KnownPriceItemCount);
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
                workflowEvent.ActorDisplayName,
                workflowEvent.Comment,
                workflowEvent.MissingPriceItemCount,
                workflowEvent.MissingPricesAcknowledged,
                workflowEvent.OccurredAtUtc))
            .ToListAsync(cancellationToken);

    private static OrderWorkflowDto Describe(
        OrderRequest request,
        (int ItemCount, int MissingPriceItemCount, decimal PricedAmount, int KnownPriceItemCount) totals,
        IReadOnlyList<WorkflowEventDto> history) =>
        new(request.Id,
            request.LocationId,
            request.Location.Name,
            request.RequestPeriod,
            request.Version,
            request.Status,
            AllowedWorkflowActionsDto.For(request.Status),
            request.SubmittedAtUtc,
            request.ApprovedAtUtc,
            request.ReturnedAtUtc,
            totals.ItemCount,
            totals.MissingPriceItemCount,
            // Unknown money is not zero money, so a request with nothing priced has no amount at all.
            totals.KnownPriceItemCount == 0 ? null : totals.PricedAmount,
            totals.MissingPriceItemCount == 0,
            totals.MissingPriceItemCount > 0,
            history);
}
