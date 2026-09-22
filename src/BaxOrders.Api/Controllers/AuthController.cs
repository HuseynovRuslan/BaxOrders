using System.Security.Claims;
using BaxOrders.Api.Security;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Users;
using BaxOrders.Infrastructure.Identity;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>Signing in, signing out, and finding out who is signed in.</summary>
[ApiController]
[Route(ApiRoutes.V1 + "/auth")]
[Produces("application/json")]
public sealed class AuthController(
    SignInManager<ApplicationUser> signIn,
    UserManager<ApplicationUser> users,
    IUserDirectory directory,
    ICurrentUserContext currentUser,
    IAntiforgery antiforgery,
    ILogger<AuthController> logger) : ControllerBase
{
    /// <summary>
    /// Issues the antiforgery pair the browser needs before it may change anything.
    /// </summary>
    /// <remarks>
    /// Authentication is by cookie, so a request from another site would otherwise arrive already signed in.
    /// The token proves the request came from this application's own pages.
    /// </remarks>
    [HttpGet("csrf")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Csrf()
    {
        IssueAntiforgeryPair();
        return NoContent();
    }

    /// <summary>
    /// Puts a fresh antiforgery pair on the response.
    /// </summary>
    /// <remarks>
    /// A token is bound to the identity it was issued to, so the one a page holds stops validating the
    /// moment that identity changes. Signing in and signing out therefore re-issue it here — otherwise the
    /// first write after signing in would be refused with a 400 that nothing on the screen could explain.
    /// </remarks>
    private void IssueAntiforgeryPair()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        Response.Cookies.Append(AntiforgerySetup.RequestTokenCookieName, tokens.RequestToken!, new CookieOptions
        {
            // Readable by the page's own script, which has to put it back in a header. It is not a credential:
            // it is worthless without the paired HttpOnly cookie the framework keeps.
            HttpOnly = false,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Path = "/",
        });
    }

    /// <response code="401">The user name or the password is wrong, or the account is not usable.</response>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType<CurrentUserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CurrentUserDto>> Login([FromBody] LoginRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var user = await users.FindByNameAsync(request.UserName ?? string.Empty);

        // A disabled account is refused exactly like a wrong password: which of the two it was is not a
        // stranger's business.
        if (user is null || !user.IsActive)
        {
            logger.LogInformation("Sign-in refused for {UserName}: no such account, or it is disabled.", request.UserName);
            return Unauthorized(BadCredentials());
        }

        var result = await signIn.PasswordSignInAsync(user, request.Password ?? string.Empty, isPersistent: false, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            logger.LogInformation(
                "Sign-in refused for user {UserId}: {Reason}.",
                user.Id,
                result.IsLockedOut ? "locked out" : result.IsNotAllowed ? "not allowed" : "wrong password");
            return Unauthorized(BadCredentials());
        }

        logger.LogInformation("User {UserId} signed in.", user.Id);

        // The session is now somebody else's, so the token the page was holding is not valid for it.
        IssueAntiforgeryPair();
        return await MeAsync();
    }

    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout()
    {
        var userId = currentUser.UserId;
        await signIn.SignOutAsync();
        logger.LogInformation("User {UserId} signed out.", userId);

        // Signing out drops the cookie but leaves this request's principal as it was, and a token is issued
        // for whoever the principal says we are. The sign-in form the person lands on is anonymous, so the
        // token has to be too — otherwise they could not sign back in without reloading the page.
        HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());
        IssueAntiforgeryPair();
        return NoContent();
    }

    /// <summary>Who is signed in, and what they may do. Anonymous callers get an unauthenticated answer.</summary>
    [HttpGet("me")]
    [AllowAnonymous]
    [ProducesResponseType<CurrentUserDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CurrentUserDto>> Me() => await MeAsync();

    /// <response code="422">The current password is wrong, or the new one does not meet the rules.</response>
    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangeOwnPasswordCommand command)
    {
        var userId = currentUser.UserId
            ?? throw new ForbiddenException("You must be signed in to change your password.");

        var failure = await directory.ChangeOwnPasswordAsync(userId, command, HttpContext.RequestAborted);
        if (failure is not null)
        {
            throw new ValidationException(failure.Message);
        }

        // Changing a password moves the security stamp, which would otherwise end this session at the next
        // validation. Refreshing it keeps the person signed in on the device they just used.
        var user = await users.FindByIdAsync(userId.ToString()!);
        if (user is not null)
        {
            await signIn.RefreshSignInAsync(user);
        }

        logger.LogInformation("User {UserId} changed their password.", userId);
        return NoContent();
    }

    private async Task<CurrentUserDto> MeAsync()
    {
        if (!currentUser.IsAuthenticated || currentUser.UserId is not { } userId)
        {
            return new CurrentUserDto(false, null, null, null, null, false, false, false, false);
        }

        var stored = await directory.FindAsync(userId, HttpContext.RequestAborted);
        var role = stored?.Role ?? currentUser.Role;

        return new CurrentUserDto(
            true,
            userId,
            stored?.UserName ?? currentUser.UserName,
            stored?.DisplayName ?? currentUser.DisplayName,
            role,
            CanManageImports: role is BaxOrdersRoles.Coordinator or BaxOrdersRoles.Admin,
            CanSubmitOrders: role is BaxOrdersRoles.Coordinator or BaxOrdersRoles.Admin,
            CanDecideOrders: role is BaxOrdersRoles.Manager or BaxOrdersRoles.Admin,
            CanManageUsers: role is BaxOrdersRoles.Admin);
    }

    /// <summary>One answer for every bad sign-in, so it never says whether the name exists.</summary>
    private static ProblemDetails BadCredentials() => new()
    {
        Status = StatusCodes.Status401Unauthorized,
        Title = "Sign-in failed",
        Detail = "İstifadəçi adı və ya şifrə yanlışdır.",
    };
}

public sealed record LoginRequest(string UserName, string Password);
