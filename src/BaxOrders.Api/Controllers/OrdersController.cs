using BaxOrders.Application.Common;
using BaxOrders.Application.Orders;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// Reading permanent order requests. Everything here is read-only: Task 5 browses orders, it never changes
/// them, and a request keeps the status it has.
/// </summary>
[ApiController]
[Route(ApiRoutes.V1 + "/orders")]
[Produces("application/json")]
public sealed class OrdersController(OrderRequestQueries queries) : ControllerBase
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
