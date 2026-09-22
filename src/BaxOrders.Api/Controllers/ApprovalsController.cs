using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Approvals;
using BaxOrders.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// Every permanent request waiting for a decision. Read-only — the actions themselves are the existing
/// workflow endpoints, and this page only says which of them apply to which request.
/// </summary>
[ApiController]
[Route(ApiRoutes.V1 + "/approvals")]
[Produces("application/json")]
[Authorize(Policy = BaxOrdersPolicies.CanDecideOrders)]
public sealed class ApprovalsController(ApprovalInboxQueries queries) : ControllerBase
{
    /// <summary>The queue of requests pending approval, searched, filtered, sorted and paged.</summary>
    /// <response code="400">A filter or the sort is not a value this API accepts, or the period is malformed.</response>
    [HttpGet("inbox")]
    [ProducesResponseType<ApprovalInboxDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public Task<ApprovalInboxDto> GetInbox([FromQuery] ApprovalInboxQuery query, CancellationToken cancellationToken)
    {
        Require(query.Actionability, nameof(ApprovalInboxQuery.Actionability));
        Require(query.Revision, nameof(ApprovalInboxQuery.Revision));
        Require(query.Sort, nameof(ApprovalInboxQuery.Sort));
        if (query.PriceCoverage is { } priceCoverage)
        {
            Require(priceCoverage, nameof(ApprovalInboxQuery.PriceCoverage));
        }

        return queries.GetAsync(query, cancellationToken);
    }

    /// <summary>An enum binds any number by default, so a value outside the contract is rejected explicitly.</summary>
    private static void Require<TEnum>(TEnum value, string name) where TEnum : struct, Enum
    {
        if (!Enum.IsDefined(value))
        {
            throw new ValidationException(
                $"'{name}' must be one of: {string.Join(", ", Enum.GetNames<TEnum>())} (got '{value}').");
        }
    }
}
