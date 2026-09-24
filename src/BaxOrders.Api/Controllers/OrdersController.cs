using BaxOrders.Application.Analytics;
﻿using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Decisions;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Orders.Revisions;
using BaxOrders.Application.Orders.Workflow;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// Permanent order requests: reading them, moving them through approval, and correcting a returned one.
/// </summary>
/// <remarks>
/// Only two kinds of write exist, and each has a typed endpoint per action — there is no generic status or
/// item setter. A reviewed version is never edited: correcting a returned request makes a new version, and
/// only that draft's lines can change.
/// </remarks>
[ApiController]
[Route(ApiRoutes.V1 + "/orders")]
[Produces("application/json")]
public sealed class OrdersController(
    OrderRequestQueries queries,
    OrderWorkflowService workflow,
    OrderRevisionService revisions,
    OrderDecisionContextQueries decisions) : ControllerBase
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

    /// <summary>
    /// What this order costs, how it differs from the months behind it, and why.
    /// </summary>
    /// <remarks>
    /// Answers about the version asked for, not about the newest one: the figures shown beside a decision have
    /// to be the figures being decided. The comparison is whichever basis the caller asks for — the same one
    /// the dashboard card was showing — and defaults to the previous month. Reads only.
    /// </remarks>
    /// <response code="400">The basis, or one of its months, is not a value this API accepts.</response>
    /// <response code="404">No such order request.</response>
    [HttpGet("{orderRequestId:long}/decision-context")]
    [ProducesResponseType<OrderDecisionContextDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDecisionContextDto>> GetDecisionContext(
        long orderRequestId, [FromQuery] DecisionContextQuery query, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(query.Basis))
        {
            throw new ValidationException(
                $"'basis' must be one of: {string.Join(", ", Enum.GetNames<AnalyticsComparisonBasis>())}.");
        }

        return await decisions.GetAsync(orderRequestId, query, cancellationToken) is { } context
            ? context
            : throw new NotFoundException($"Order request #{orderRequestId} was not found.");
    }

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
    /// Where one request stands as a correction: the version it corrects, the correction made from it, whether
    /// this person may correct or edit it now, the row version an edit must send back, and every change made.
    /// </summary>
    /// <response code="404">No such order request.</response>
    [HttpGet("{orderRequestId:long}/revision")]
    [ProducesResponseType<OrderRevisionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderRevisionDto>> GetRevision(long orderRequestId, CancellationToken cancellationToken) =>
        await revisions.GetAsync(orderRequestId, cancellationToken) is { } state
            ? state
            : throw new NotFoundException($"Order request #{orderRequestId} was not found.");

    /// <summary>
    /// Makes the correction version of a returned request: the next version, as a draft, with every line
    /// copied exactly. The returned version itself is not touched. Nothing is sent: the server decides the
    /// location, the month, the version, the lines and the actor.
    /// </summary>
    /// <response code="201">The correction was made.</response>
    /// <response code="200">It had already been made — a second click, or somebody else first. That one is returned.</response>
    /// <response code="404">No such order request.</response>
    /// <response code="409">A newer version of the month exists, or one was created at the same moment.</response>
    /// <response code="422">The request is not returned for correction.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanReviseOrders)]
    [HttpPost("{orderRequestId:long}/revision")]
    [ProducesResponseType<CreateRevisionResultDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<CreateRevisionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CreateRevisionResultDto>> CreateRevision(long orderRequestId, CancellationToken cancellationToken)
    {
        var result = await revisions.CreateAsync(orderRequestId, cancellationToken);

        return result.AlreadyExisted
            ? Ok(result)
            : CreatedAtAction(nameof(GetRevision), new { orderRequestId = result.OrderRequestId }, result);
    }

    /// <summary>
    /// Changes the quantity, the price or the supplier of one line of a correction draft. A field left out is
    /// not changed; <c>{"value": null}</c> clears the price or the supplier. The variant of a line cannot change.
    /// </summary>
    /// <response code="400">Nothing to change, no row version, an unknown field, or a supplier that does not exist.</response>
    /// <response code="404">No such request, or the line is not one of its lines.</response>
    /// <response code="409">The request changed since the row version sent was read.</response>
    /// <response code="422">Not an editable correction draft, or a value the line cannot take.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanReviseOrders)]
    [HttpPatch("{orderRequestId:long}/items/{orderRequestItemId:long}")]
    [ProducesResponseType<RevisionEditResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public Task<RevisionEditResultDto> EditItem(
        long orderRequestId, long orderRequestItemId, [FromBody] EditOrderItemCommand command, CancellationToken cancellationToken) =>
        revisions.EditItemAsync(orderRequestId, orderRequestItemId, command, cancellationToken);

    /// <summary>Adds a catalog variant to a correction draft as a new line.</summary>
    /// <response code="201">The line was added.</response>
    /// <response code="400">No row version, an unknown field, or a variant or supplier that does not exist.</response>
    /// <response code="404">No such order request.</response>
    /// <response code="409">The request changed since the row version sent was read.</response>
    /// <response code="422">Not an editable correction draft, or a value a line cannot take.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanReviseOrders)]
    [HttpPost("{orderRequestId:long}/items")]
    [ProducesResponseType<RevisionEditResultDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<RevisionEditResultDto>> AddItem(
        long orderRequestId, [FromBody] AddOrderItemCommand command, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await revisions.AddItemAsync(orderRequestId, command, cancellationToken));

    /// <summary>
    /// Takes a line out of a correction draft. Only this draft loses it; the history keeps what was removed.
    /// </summary>
    /// <param name="rowVersion">The row version the request was read at, as the revision endpoint gave it.</param>
    /// <response code="400">No row version.</response>
    /// <response code="404">No such request, or the line is not one of its lines.</response>
    /// <response code="409">The request changed since the row version sent was read.</response>
    /// <response code="422">Not an editable correction draft.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanReviseOrders)]
    [HttpDelete("{orderRequestId:long}/items/{orderRequestItemId:long}")]
    [ProducesResponseType<RevisionEditResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public Task<RevisionEditResultDto> RemoveItem(
        long orderRequestId, long orderRequestItemId, [FromQuery] string? rowVersion, CancellationToken cancellationToken) =>
        revisions.RemoveItemAsync(orderRequestId, orderRequestItemId, rowVersion, cancellationToken);

    /// <summary>
    /// Where one line came from: the versions it was copied through, and — for a line that descends from an
    /// import — the workbook row behind it, the corrections recorded on it and the canonical records its
    /// values were resolved to. A line somebody added by hand while correcting an order is reported as such
    /// rather than as missing.
    /// </summary>
    /// <response code="404">No such item.</response>
    [HttpGet("items/{orderRequestItemId:long}/source")]
    [ProducesResponseType<OrderItemProvenanceDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderItemProvenanceDto>> GetSource(long orderRequestItemId, CancellationToken cancellationToken) =>
        await queries.GetItemProvenanceAsync(orderRequestItemId, cancellationToken) is { } provenance
            ? provenance
            : throw new NotFoundException($"Order item #{orderRequestItemId} was not found.");
}
