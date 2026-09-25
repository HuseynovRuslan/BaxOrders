using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Catalog.ProductMatches;
using BaxOrders.Application.Imports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// Which products look like the same item written differently, or a variant of another; and an administrator's
/// decisions about them.
/// </summary>
/// <remarks>
/// Reading is open to everybody signed in, like the rest of the catalogue; which screens show it is the menu's
/// question. Deciding is not: approving, rejecting and undoing need <see cref="ProductMatchAuthority"/> (13.2), and
/// the server checks it whatever the screen offered. Nothing here ever changes a product, a variant, an alias or an
/// order line — a decision is one row of its own.
/// </remarks>
[ApiController]
[Route(ApiRoutes.V1 + "/catalog/product-matches")]
[Produces("application/json")]
public sealed class ProductMatchesController(ProductMatchQueries queries, ProductMatchService service) : ControllerBase
{
    /// <summary>The pairs the rules suggest right now, of one kind, and how many there are of each kind.</summary>
    /// <response code="400">The kind is not a value this API accepts.</response>
    [HttpGet("suggestions")]
    [ProducesResponseType<ProductMatchSuggestionListDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<ProductMatchSuggestionListDto> GetSuggestions(
        [FromQuery] ProductMatchSuggestionQuery query, CancellationToken cancellationToken) =>
        queries.GetSuggestionsAsync(query, cancellationToken);

    /// <summary>Decisions, newest first, with both sides named and the undo if there is one.</summary>
    /// <response code="400">The kind or the outcome is not a value this API accepts.</response>
    [HttpGet("decisions")]
    [ProducesResponseType<PagedResult<ProductMatchDecisionDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<PagedResult<ProductMatchDecisionDto>> GetDecisions(
        [FromQuery] ProductMatchDecisionQuery query, CancellationToken cancellationToken) =>
        queries.GetDecisionsAsync(query, cancellationToken);

    /// <summary>
    /// Each base product with the products approved as its variants. A view of the live variant links: every product
    /// in it is still a product of its own.
    /// </summary>
    [HttpGet("families")]
    [ProducesResponseType<PagedResult<ProductFamilyDto>>(StatusCodes.Status200OK)]
    public Task<PagedResult<ProductFamilyDto>> GetFamilies(
        [FromQuery] ProductFamilyQuery query, CancellationToken cancellationToken) =>
        queries.GetFamiliesAsync(query, cancellationToken);

    /// <summary>Approves a suggested pair. The two stay two products or variants; only the decision is recorded.</summary>
    /// <response code="403">Only an administrator decides on product matches.</response>
    /// <response code="404">No such product or variant.</response>
    /// <response code="409">Somebody decided the same pair at the same moment.</response>
    /// <response code="422">Not a current suggestion, a chain, a second base, or different order units.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanDecideProductMatches)]
    [HttpPost("approve")]
    [ProducesResponseType<ProductMatchDecisionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public Task<ProductMatchDecisionDto> Approve(
        [FromBody] ApproveProductMatchCommand command, CancellationToken cancellationToken) =>
        service.ApproveAsync(command, cancellationToken);

    /// <summary>Rejects a suggested pair: it is not suggested again unless the rejection is undone.</summary>
    /// <response code="403">Only an administrator decides on product matches.</response>
    /// <response code="404">No such product or variant.</response>
    /// <response code="409">Somebody decided the same pair at the same moment.</response>
    /// <response code="422">Not a current suggestion.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanDecideProductMatches)]
    [HttpPost("reject")]
    [ProducesResponseType<ProductMatchDecisionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public Task<ProductMatchDecisionDto> Reject(
        [FromBody] RejectProductMatchCommand command, CancellationToken cancellationToken) =>
        service.RejectAsync(command, cancellationToken);

    /// <summary>Takes a decision back. The record stays, with who undid it and when.</summary>
    /// <response code="403">Only an administrator decides on product matches.</response>
    /// <response code="404">No such decision.</response>
    /// <response code="409">The decision has already been undone.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanDecideProductMatches)]
    [HttpPost("decisions/{decisionId:long}/undo")]
    [ProducesResponseType<ProductMatchDecisionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<ProductMatchDecisionDto> Undo(
        long decisionId, [FromBody] UndoProductMatchCommand command, CancellationToken cancellationToken) =>
        service.UndoAsync(decisionId, command, cancellationToken);
}
