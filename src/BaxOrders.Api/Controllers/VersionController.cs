using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>
/// Which commit the API runs. The GitHub workflow waits on it after a push to main: the VPS pulls and deploys the
/// commit itself (its SSH port is not reachable from GitHub), and this is how the workflow learns it went live.
/// </summary>
[ApiController]
[Route(ApiRoutes.V1 + "/version")]
[Produces("application/json")]
public sealed class VersionController(IConfiguration configuration) : ControllerBase
{
    /// <summary>The commit the release was packed from, "unknown" outside a deploy. Anonymous; it says nothing else.</summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<VersionDto>(StatusCodes.Status200OK)]
    public VersionDto Get() =>
        new(configuration["BAXORDERS_COMMIT"] is { Length: > 0 } commit ? commit : "unknown");
}

/// <param name="Commit">The commit (as deploy.sh recorded it), or "unknown".</param>
public sealed record VersionDto(string Commit);
