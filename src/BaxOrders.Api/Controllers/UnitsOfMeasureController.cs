using BaxOrders.Application.UnitsOfMeasure;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

[ApiController]
[Route(ApiRoutes.V1 + "/units-of-measure")]
public sealed class UnitsOfMeasureController(UnitOfMeasureQueries queries) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<UnitOfMeasureSummary>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<UnitOfMeasureSummary>> List(CancellationToken cancellationToken) =>
        queries.ListAsync(cancellationToken);
}
