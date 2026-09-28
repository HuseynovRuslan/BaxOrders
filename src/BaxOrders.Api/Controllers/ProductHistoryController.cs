using BaxOrders.Application.Catalog;
using BaxOrders.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// What one product has cost the company over time.
/// </summary>
/// <remarks>
/// Reading is open to everybody signed in: a manager looking at a month that moved has every reason to ask
/// whether the product behind it is one the company orders every month or one it bought once.
/// </remarks>
[ApiController]
[Route(ApiRoutes.V1 + "/products")]
[Produces("application/json")]
[Authorize]
public sealed class ProductHistoryController(ProductHistoryQueries queries) : ControllerBase
{
    /// <summary>Every month this product appears in, and the lines behind those months.</summary>
    /// <response code="404">No such product.</response>
    [HttpGet("{productId:long}/history")]
    [ProducesResponseType<ProductHistoryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductHistoryDto>> GetHistory(
        long productId, [FromQuery] ProductHistoryQuery query, CancellationToken cancellationToken) =>
        await queries.GetAsync(productId, query, cancellationToken) is { } history
            ? history
            : throw new NotFoundException($"Product #{productId} was not found.");
}
