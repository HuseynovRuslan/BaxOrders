using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Orders.Workflow;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// Reading permanent order requests. Everything here is read-only: Task 5 browses orders, it never changes
/// them, and a request keeps the status it has.
/// </summary>
[ApiController]
[Route(ApiRoutes.V1 + "/orders")]
[Produces("application/json")]
public sealed class OrdersController(OrderRequestQueries queries, OrderWorkflowService workflow) : ControllerBase
{
    /// <summary>One request with its header, its totals and a page of its lines.</summary>
    /// <response code="404">No such order request.</response>
    [HttpGet("{orderRequestId:long}")]
    [ProducesResponseType<OrderRequestDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderRequestDetailDto>> Get(
        long orderRequestId, [FromQuery] OrderItemQuery query, CancellationToken cancellationToken) =>
        await queries.GetAsync(orderRequestId, query, cancellationToken) is { } detail
            ? detail
            : throw new NotFoundException($"Order request #{orderRequestId} was not found.");

    /// <summary>Where one request stands in approval, what its state allows, and everything done to it.</summary>
    /// <response code="404">No such order request.</response>
    [HttpGet("{orderRequestId:long}/workflow")]
    [ProducesResponseType<OrderWorkflowDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderWorkflowDto>> GetWorkflow(long orderRequestId, CancellationToken cancellationToken) =>
        await workflow.GetAsync(orderRequestId, cancellationToken) is { } state
            ? state
            : throw new NotFoundException($"Order request #{orderRequestId} was not found.");

    /// <summary>Hands a draft or returned request to whoever approves it.</summary>
    /// <response code="404">No such order request.</response>
    /// <response code="409">Someone else changed the request first.</response>
    /// <response code="422">The request is in a status this action is not allowed from.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanSubmitOrders)]
    [HttpPost("{orderRequestId:long}/workflow/submit")]
    [ProducesResponseType<OrderWorkflowDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public Task<OrderWorkflowDto> Submit(
        long orderRequestId, [FromBody] SubmitForApprovalCommand command, CancellationToken cancellationToken) =>
        workflow.SubmitAsync(orderRequestId, command, cancellationToken);

    /// <summary>
    /// Approves a request that is waiting. A request with unpriced lines needs those acknowledged first: the
    /// missing price does not make the order wrong, but it does mean the approved amount is not the whole one.
    /// </summary>
    /// <response code="404">No such order request.</response>
    /// <response code="409">Someone else changed the request first.</response>
    /// <response code="422">Not allowed from this status, or the unpriced lines were not acknowledged.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanDecideOrders)]
    [HttpPost("{orderRequestId:long}/workflow/approve")]
    [ProducesResponseType<OrderWorkflowDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public Task<OrderWorkflowDto> Approve(
        long orderRequestId, [FromBody] ApproveOrderCommand command, CancellationToken cancellationToken) =>
        workflow.ApproveAsync(orderRequestId, command, cancellationToken);

    /// <summary>Hands a waiting request back to be put right. The reason is required.</summary>
    /// <response code="404">No such order request.</response>
    /// <response code="409">Someone else changed the request first.</response>
    /// <response code="422">Not allowed from this status, or no reason was given.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanDecideOrders)]
    [HttpPost("{orderRequestId:long}/workflow/return")]
    [ProducesResponseType<OrderWorkflowDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public Task<OrderWorkflowDto> Return(
        long orderRequestId, [FromBody] ReturnForCorrectionCommand command, CancellationToken cancellationToken) =>
        workflow.ReturnAsync(orderRequestId, command, cancellationToken);

    /// <summary>
    /// The audit trail of one line: the workbook row it came from, the corrections recorded on it and the
    /// canonical records its values were resolved to.
    /// </summary>
    /// <response code="404">No such item, or the item was not created by an import.</response>
    [HttpGet("items/{orderRequestItemId:long}/source")]
    [ProducesResponseType<OrderItemSourceDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderItemSourceDto>> GetSource(long orderRequestItemId, CancellationToken cancellationToken) =>
        await queries.GetItemSourceAsync(orderRequestItemId, cancellationToken) is { } source
            ? source
            : throw new NotFoundException($"Order item #{orderRequestItemId} has no import source.");
}
