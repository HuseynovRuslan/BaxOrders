using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Orders.Pricing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// The unpriced lines nobody has classified, and the decision that classifies one.
/// </summary>
/// <remarks>
/// Reading is open to everybody signed in: a manager should be able to see exactly how much of the missing
/// money is a real gap and how much is only unclassified, because that is what the dashboard's warnings rest
/// on. Deciding is not — it belongs with the people who put the catalogue together, the same ones who set a
/// supplier's price requirement.
/// </remarks>
[ApiController]
[Route(ApiRoutes.V1 + "/pricing-mode-review")]
[Produces("application/json")]
public sealed class PricingModeReviewController(PricingModeReviewService service) : ControllerBase
{
    /// <summary>The unpriced lines, filtered by what has been said about them, with their provenance.</summary>
    [HttpGet]
    [ProducesResponseType<PricingModeReviewDto>(StatusCodes.Status200OK)]
    public Task<PricingModeReviewDto> Get(
        [FromQuery] PricingModeReviewQuery query, CancellationToken cancellationToken) =>
        service.GetAsync(query, cancellationToken);

    /// <summary>
    /// Records how the named lines were supplied.
    /// </summary>
    /// <remarks>
    /// The lines are named one by one, and that is the whole safeguard: there is no "all lines of this
    /// supplier" here, because one supplier can be both, and that is the mistake this endpoint exists to undo.
    /// Nothing about the order changes — not the money, not the quantity, not the status.
    /// </remarks>
    /// <response code="400">No lines were named, or the mode is not one this API accepts.</response>
    /// <response code="403">This person may read the queue but not decide on it.</response>
    /// <response code="404">One of the named lines no longer exists.</response>
    /// <response code="422">A named line already carries a price, so its supply is not in question.</response>
    [HttpPost]
    [Authorize(Policy = BaxOrdersPolicies.CanManageCatalog)]
    [ProducesResponseType<SetPricingModeResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public Task<SetPricingModeResultDto> Set(
        [FromBody] SetPricingModeCommand command, CancellationToken cancellationToken) =>
        service.SetAsync(command, cancellationToken);
}
