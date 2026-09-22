using BaxOrders.Application.Imports.Review;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// Canonical records to choose from during import review. Results are choices for a person: nothing is
/// preselected and no fuzzy scoring is applied.
/// </summary>
[ApiController]
[Route(ApiRoutes.V1 + "/reference")]
public sealed class ReferenceDataController(ReferenceSearchQueries queries) : ControllerBase
{
    [HttpGet("locations")]
    [ProducesResponseType<IReadOnlyList<ReferenceOption>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<ReferenceOption>> Locations([FromQuery] string? search, CancellationToken cancellationToken) =>
        queries.SearchLocationsAsync(search, cancellationToken);

    [HttpGet("suppliers")]
    [ProducesResponseType<IReadOnlyList<ReferenceOption>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<ReferenceOption>> Suppliers([FromQuery] string? search, CancellationToken cancellationToken) =>
        queries.SearchSuppliersAsync(search, cancellationToken);

    [HttpGet("responsible-people")]
    [ProducesResponseType<IReadOnlyList<ReferenceOption>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<ReferenceOption>> ResponsiblePeople([FromQuery] string? search, CancellationToken cancellationToken) =>
        queries.SearchResponsiblePeopleAsync(search, cancellationToken);

    [HttpGet("units")]
    [ProducesResponseType<IReadOnlyList<ReferenceOption>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<ReferenceOption>> Units([FromQuery] string? search, CancellationToken cancellationToken) =>
        queries.SearchUnitsAsync(search, cancellationToken);

    [HttpGet("categories")]
    [ProducesResponseType<IReadOnlyList<ReferenceOption>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<ReferenceOption>> Categories([FromQuery] string? search, CancellationToken cancellationToken) =>
        queries.SearchCategoriesAsync(search, cancellationToken);

    [HttpGet("products")]
    [ProducesResponseType<IReadOnlyList<ReferenceOption>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<ReferenceOption>> Products([FromQuery] string? search, CancellationToken cancellationToken) =>
        queries.SearchProductsAsync(search, cancellationToken);

    /// <summary>Variants of one product; a variant of another product is never a candidate.</summary>
    [HttpGet("products/{productId:long}/variants")]
    [ProducesResponseType<IReadOnlyList<ReferenceOption>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<ReferenceOption>> ProductVariants(long productId, [FromQuery] string? search, CancellationToken cancellationToken) =>
        queries.SearchProductVariantsAsync(productId, search, cancellationToken);
}
