using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// Managing the people who use the system.
/// </summary>
/// <remarks>
/// There is deliberately no delete. A workflow event names the person who caused it, for as long as the
/// record is kept; an account that should stop working is deactivated, which ends its sessions without
/// touching what it did.
/// </remarks>
[ApiController]
[Route(ApiRoutes.V1 + "/admin/users")]
[Authorize(Policy = BaxOrdersPolicies.CanManageUsers)]
[Produces("application/json")]
public sealed class AdminUsersController(IUserDirectory directory, ILogger<AdminUsersController> logger) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<UserDto>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyList<UserDto>> List(CancellationToken cancellationToken) =>
        directory.ListAsync(cancellationToken);

    /// <summary>Whether anybody can approve an order right now. Read-only.</summary>
    [HttpGet("approval-authority")]
    [ProducesResponseType<ApprovalAuthorityStatusDto>(StatusCodes.Status200OK)]
    public async Task<ApprovalAuthorityStatusDto> ApprovalAuthorityStatus(CancellationToken cancellationToken) =>
        new(await directory.CountActiveApproversAsync(cancellationToken));

    /// <response code="422">The name is taken, the role is unknown, or the password fails the rules.</response>
    [HttpPost]
    [ProducesResponseType<UserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<UserDto>> Create(
        [FromBody] CreateUserCommand command, CancellationToken cancellationToken)
    {
        var (user, failure) = await directory.CreateAsync(command, cancellationToken);
        if (failure is not null)
        {
            throw new ValidationException(failure.Message);
        }

        // The password is not echoed back and is not logged.
        logger.LogInformation("Created user {UserId} with role {Role}.", user!.Id, user.Role);
        return user;
    }

    /// <summary>Changes the display name, the role or whether the account is active. Not the password.</summary>
    /// <remarks>
    /// Refused, changing nothing, when it would disable the last active approver or move them to a role
    /// without approval authority.
    /// </remarks>
    /// <response code="404">No such user.</response>
    /// <response code="422">The role is unknown, or the change was refused.</response>
    [HttpPatch("{userId:guid}")]
    [ProducesResponseType<UserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<UserDto>> Update(
        Guid userId, [FromBody] UpdateUserCommand command, CancellationToken cancellationToken)
    {
        var (user, failure) = await directory.UpdateAsync(userId, command, cancellationToken);
        if (failure is not null)
        {
            throw new ValidationException(failure.Message);
        }

        if (user is null)
        {
            throw new NotFoundException($"User {userId} was not found.");
        }

        logger.LogInformation("Updated user {UserId}.", userId);
        return user;
    }

    /// <response code="422">The new password does not meet the rules.</response>
    [HttpPost("{userId:guid}/reset-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> ResetPassword(
        Guid userId, [FromBody] ResetPasswordCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        var failure = await directory.ResetPasswordAsync(userId, command.NewPassword, cancellationToken);
        if (failure is not null)
        {
            throw new ValidationException(failure.Message);
        }

        logger.LogInformation("Reset the password of user {UserId}.", userId);
        return NoContent();
    }
}
