using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports.Pricing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// Pricing classification during import review: the unpriced rows of one import, and the decision that says
/// whether each is bought or supplied free (brief 16.1).
/// </summary>
/// <remarks>
/// Reads and writes alike belong to the people who run imports, as every import endpoint does since brief 14: a
/// Rəhbər is refused both. What is decided here is written onto the lines at confirmation, and can be corrected
/// afterwards on Qiymət təsnifatı like any other line.
/// </remarks>
[ApiController]
[Route(ApiRoutes.V1 + "/imports/{id:long}")]
[Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
[Produces("application/json")]
public sealed class ImportPricingController(ImportPricingService service) : ControllerBase
{
    /// <summary>The import's unpriced rows still part of it, filtered by what the review has said about them.</summary>
    /// <remarks>
    /// <c>?mode=Unresolved</c> lists the rows nobody classified; <c>PriceRequired</c> and <c>InternalFreeSupply</c>
    /// the classified ones; no mode lists all. The three totals ignore the filter and the search.
    /// </remarks>
    /// <response code="404">The import does not exist.</response>
    [HttpGet("pricing")]
    [ProducesResponseType<ImportPricingReviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ImportPricingReviewDto>> Get(
        long id, [FromQuery] ImportPricingQuery query, CancellationToken cancellationToken) =>
        await service.GetAsync(id, query, cancellationToken) is { } review ? Ok(review) : NotFound();

    /// <summary>
    /// Classifies the named rows as bought or supplied free; <c>Unresolved</c> takes the classification away.
    /// </summary>
    /// <remarks>
    /// Rows are named one by one: there is no "every row of this supplier" or "of this source", because one source
    /// can be both. Only the rows' classification changes — nothing about their values, the batch or its status.
    /// </remarks>
    /// <response code="400">No rows were named, or the mode is not one this API accepts.</response>
    /// <response code="404">The import, or one of the named rows in it, does not exist.</response>
    /// <response code="422">A named row is excluded or already carries a price, or the import is no longer under review.</response>
    [HttpPost("pricing")]
    [ProducesResponseType<ImportPricingResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public Task<ImportPricingResult> Set(
        long id, [FromBody] SetImportPricingCommand command, CancellationToken cancellationToken) =>
        service.SetAsync(id, command, cancellationToken);
}
