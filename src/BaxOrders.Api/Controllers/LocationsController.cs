using BaxOrders.Application.Common;
using BaxOrders.Application.Locations;
using BaxOrders.Application.Orders;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

[ApiController]
[Route(ApiRoutes.V1 + "/locations")]
public sealed class LocationsController(LocationQueries queries, LocationOrderQueries orderQueries) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<LocationSummary>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<LocationSummary>> List([FromQuery] bool includeInactive, CancellationToken cancellationToken) =>
        queries.ListAsync(includeInactive, cancellationToken);

    /// <summary>
    /// Locations as the order browser lists them: how many requests each has, which months they cover and the
    /// money of the lines whose price is known.
    /// </summary>
    [HttpGet("orders")]
    [ProducesResponseType<LocationOrderListDto>(StatusCodes.Status200OK)]
    public Task<LocationOrderListDto> ListWithOrders([FromQuery] LocationOrderListQuery query, CancellationToken cancellationToken) =>
        orderQueries.ListAsync(query, cancellationToken);

    /// <summary>One location with its request history, newest period first.</summary>
    /// <response code="404">No such location.</response>
    [HttpGet("{locationId:int}/orders")]
    [ProducesResponseType<LocationOrderHistoryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LocationOrderHistoryDto>> History(
        int locationId, [FromQuery] LocationHistoryQuery query, CancellationToken cancellationToken) =>
        await orderQueries.GetHistoryAsync(locationId, query, cancellationToken) is { } history
            ? history
            : throw new NotFoundException($"Location #{locationId} was not found.");
}
