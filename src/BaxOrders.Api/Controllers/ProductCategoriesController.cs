using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Catalog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// What the catalog says each product's category is, what its import history says it should be, and the two
/// ways that gap gets closed.
/// </summary>
/// <remarks>
/// Reading is open to everybody signed in — a manager has every reason to see which products the catalog
/// cannot yet speak for. Changing what the catalog claims is not: that needs the catalog policy, and the
/// server checks it whatever the screen offered.
/// </remarks>
[ApiController]
[Route(ApiRoutes.V1 + "/catalog")]
[Produces("application/json")]
public sealed class ProductCategoriesController(
    ProductCategoryQueries queries, ProductCategoryService service) : ControllerBase
{
    /// <summary>
    /// How many products have a canonical category, how many could safely be given one, and how many cannot
    /// be without somebody deciding. Also the preview of what a safe application would do.
    /// </summary>
    [HttpGet("product-categories/summary")]
    [ProducesResponseType<ProductCategorySummaryDto>(StatusCodes.Status200OK)]
    public Task<ProductCategorySummaryDto> GetSummary(CancellationToken cancellationToken) =>
        queries.GetSummaryAsync(cancellationToken);

    /// <summary>Products with their current category and the categories their import history named.</summary>
    /// <response code="400">The filter is not a value this API accepts.</response>
    [HttpGet("product-categories")]
    [ProducesResponseType<ProductCategoryListDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<ProductCategoryListDto> Get(
        [FromQuery] ProductCategoryQuery query, CancellationToken cancellationToken) =>
        queries.GetAsync(query, cancellationToken);

    /// <summary>Every decision ever made about one product's category, newest first.</summary>
    [HttpGet("products/{productId:long}/category/decisions")]
    [ProducesResponseType<IReadOnlyList<ProductCategoryDecisionDto>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<ProductCategoryDecisionDto>> GetDecisions(
        long productId, CancellationToken cancellationToken) =>
        queries.GetDecisionsAsync(productId, cancellationToken);

    /// <summary>
    /// Gives a category to every product that has none and whose whole import history names exactly one.
    /// </summary>
    /// <remarks>
    /// The server works out which products those are when the request arrives; nothing the caller sends says
    /// what to write. Products whose history disagrees with itself, products with no history, and products
    /// that already have a category are left untouched, so running this twice changes nothing the second time.
    /// </remarks>
    [Authorize(Policy = BaxOrdersPolicies.CanManageCatalog)]
    [HttpPost("product-categories/apply-safe")]
    [ProducesResponseType<ApplySafeCategoriesResultDto>(StatusCodes.Status200OK)]
    public Task<ApplySafeCategoriesResultDto> ApplySafe(CancellationToken cancellationToken) =>
        service.ApplySafeAsync(cancellationToken);

    /// <summary>Records somebody's decision about one product's canonical category, and applies it.</summary>
    /// <response code="400">No such category, or one the catalog no longer offers.</response>
    /// <response code="404">No such product.</response>
    /// <response code="422">The product is already in that category.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanManageCatalog)]
    [HttpPost("products/{productId:long}/category")]
    [ProducesResponseType<ProductCategoryDecisionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public Task<ProductCategoryDecisionDto> Assign(
        long productId,
        [FromBody] AssignProductCategoryCommand command,
        CancellationToken cancellationToken) =>
        service.AssignAsync(productId, command, cancellationToken);
}
