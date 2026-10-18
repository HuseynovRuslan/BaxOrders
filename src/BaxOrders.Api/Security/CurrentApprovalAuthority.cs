using System.Security.Claims;
using BaxOrders.Application.Abstractions;
using BaxOrders.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace BaxOrders.Api.Security;

/// <summary>
/// Approving or returning an order is decided on the account as it is now, not as the sign-in cookie last saw it.
/// </summary>
/// <remarks>
/// The security stamp validator re-reads every session's account once per <c>ValidationInterval</c> (five minutes).
/// For reading pages that window is acceptable; for a decision it is not — a Rəhbər who has been disabled, moved to
/// another role or had their password reset must not approve on the session they still hold. Only the two decision
/// endpoints pay for this read: one look-up of the account and one of its roles.
/// </remarks>
internal sealed class CurrentApprovalAuthorityRequirement : IAuthorizationRequirement
{
}

/// <summary>
/// Succeeds only for an active account whose security stamp is the one this session was issued with and whose
/// current role holds approval authority (<see cref="ApprovalAuthority"/> — the one definition of who decides).
/// </summary>
internal sealed class CurrentApprovalAuthorityHandler(
    UserManager<ApplicationUser> users,
    IOptions<IdentityOptions> identityOptions)
    : AuthorizationHandler<CurrentApprovalAuthorityRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, CurrentApprovalAuthorityRequirement requirement)
    {
        var user = await users.GetUserAsync(context.User);
        if (user is null || !user.IsActive)
        {
            return;
        }

        // A stamp that moved since sign-in means the account changed under this session: disabled, given another
        // role, or its password set anew.
        var sessionStamp = context.User.FindFirstValue(identityOptions.Value.ClaimsIdentity.SecurityStampClaimType);
        if (users.SupportsUserSecurityStamp
            && !string.Equals(sessionStamp, await users.GetSecurityStampAsync(user), StringComparison.Ordinal))
        {
            return;
        }

        var roles = await users.GetRolesAsync(user);
        if (roles.Any(ApprovalAuthority.IsHeldBy))
        {
            context.Succeed(requirement);
        }
    }
}
