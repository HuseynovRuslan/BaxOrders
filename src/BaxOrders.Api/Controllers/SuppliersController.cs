using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Suppliers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// The supplier catalogue, and the one property of it that changes what the rest of the system calls a
/// missing price.
/// </summary>
/// <remarks>
/// Reading is open to everybody signed in — a manager has every reason to see which suppliers are the
/// company's own stores. Changing it is not: that needs the catalogue policy, and the server checks whatever
/// the screen offered.
/// </remarks>
[ApiController]
[Route(ApiRoutes.V1 + "/suppliers")]
[Produces("application/json")]
public sealed class SuppliersController(SupplierPricingService service) : ControllerBase
{
    /// <summary>Every supplier, with whether its lines need a purchase price and how much history it covers.</summary>
    [HttpGet]
    [ProducesResponseType<SupplierListDto>(StatusCodes.Status200OK)]
    public Task<SupplierListDto> Get([FromQuery] SupplierListQuery query, CancellationToken cancellationToken) =>
        service.ListAsync(query, cancellationToken);

    /// <summary>What has been decided about one supplier's price requirement, newest first.</summary>
    [HttpGet("{supplierId:int}/pricing-decisions")]
    [ProducesResponseType<IReadOnlyList<SupplierPricingDecisionDto>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<SupplierPricingDecisionDto>> GetDecisions(
        int supplierId, CancellationToken cancellationToken) =>
        service.DecisionsAsync(supplierId, cancellationToken);

    /// <summary>
    /// Records that this supplier's lines do, or do not, need a purchase price.
    /// </summary>
    /// <remarks>
    /// No order line is touched. Prices already recorded stay; prices that are absent stay absent. What moves
    /// is whether the absent ones count as a gap anybody has to close.
    /// </remarks>
    /// <response code="400">The requirement is not a value this API accepts.</response>
    /// <response code="403">This person may not change the catalogue.</response>
    /// <response code="404">No such supplier.</response>
    [HttpPost("{supplierId:int}/price-requirement")]
    [Authorize(Policy = BaxOrdersPolicies.CanManageCatalog)]
    [ProducesResponseType<ChangeSupplierPriceRequirementResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public Task<ChangeSupplierPriceRequirementResultDto> ChangePriceRequirement(
        int supplierId,
        [FromBody] ChangeSupplierPriceRequirementCommand command,
        CancellationToken cancellationToken) =>
        service.ChangePriceRequirementAsync(supplierId, command, cancellationToken);
}
