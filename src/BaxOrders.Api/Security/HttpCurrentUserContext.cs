using System.Security.Claims;
using BaxOrders.Application.Abstractions;

namespace BaxOrders.Api.Security;

/// <summary>
/// Who is signed in, read from the authenticated principal of the request being handled.
/// </summary>
/// <remarks>
/// This is the only place the HTTP request is consulted about identity. Application services depend on
/// <see cref="ICurrentUserContext"/>, so an actor can only ever come from the session — never from something
/// a browser put in a request body.
/// </remarks>
internal sealed class HttpCurrentUserContext(IHttpContextAccessor accessor) : ICurrentUserContext
{
    /// <summary>The claim carrying the name shown on screen and written into audit trails.</summary>
    public const string DisplayNameClaim = "display_name";

    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public Guid? UserId =>
        IsAuthenticated && Guid.TryParse(Principal!.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? id
            : null;

    public string? UserName => IsAuthenticated ? Principal!.FindFirstValue(ClaimTypes.Name) : null;

    public string? DisplayName => Principal is { } principal && IsAuthenticated
        // Falls back to the sign-in name, so an audit entry is never left without anybody's name on it.
        ? principal.FindFirstValue(DisplayNameClaim) ?? principal.FindFirstValue(ClaimTypes.Name)
        : null;

    public string? Role => IsAuthenticated
        ? BaxOrdersRoles.All.FirstOrDefault(role => Principal!.IsInRole(role))
        : null;
}
