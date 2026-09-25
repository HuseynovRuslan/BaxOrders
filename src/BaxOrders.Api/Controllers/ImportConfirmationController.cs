using BaxOrders.Api.ErrorHandling;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Confirmation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// The last step of an import: turning reviewed staging rows into permanent order requests.
/// </summary>
/// <remarks>
/// The preview reads only. The confirmation writes once: it rebuilds the plan under the batch lock, so what
/// the operator saw is checked against what is actually staged, and either the whole approved plan becomes
/// orders or nothing does.
/// <para>
/// Both belong to the people who run imports. A Rəhbər who types the preview's address is refused, as on the
/// import screen itself (brief 14).
/// </para>
/// </remarks>
[ApiController]
[Route(ApiRoutes.V1 + "/imports/{id:long}/confirmation")]
[Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
[Produces("application/json")]
public sealed class ImportConfirmationController(
    ImportConfirmationPlanner planner,
    ImportConfirmationService confirmation) : ControllerBase
{
    /// <summary>What confirming this import would create, group by group. Writes nothing.</summary>
    /// <response code="404">No such import.</response>
    [HttpGet("preview")]
    [ProducesResponseType<ImportConfirmationPreview>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ImportConfirmationPreview>> GetPreview(long id, CancellationToken cancellationToken) =>
        await planner.PreviewAsync(id, cancellationToken) is { } preview
            ? preview
            : throw new NotFoundException($"Import #{id} was not found.");

    /// <summary>
    /// Creates the order requests. The body carries decisions only: every business value comes from the staged
    /// rows themselves.
    /// </summary>
    /// <response code="400">A decision is not usable, for example a skip without a reason.</response>
    /// <response code="409">The import is not ready, a group needs a decision, or the staged data changed since the preview.</response>
    [Authorize(Policy = BaxOrdersPolicies.CanManageImports)]
    [HttpPost]
    [ProducesResponseType<ImportConfirmationResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<ImportConfirmationResult> Confirm(long id, ImportConfirmationCommand command, CancellationToken cancellationToken) =>
        confirmation.ConfirmAsync(id, command, cancellationToken);
}
