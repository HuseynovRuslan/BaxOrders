using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api.Controllers;

/// <summary>Which environment the screens are talking to, so the test environment can say so on every page.</summary>
[ApiController]
[Route(ApiRoutes.V1 + "/environment")]
[Produces("application/json")]
public sealed class EnvironmentController(IWebHostEnvironment environment) : ControllerBase
{
    /// <summary>
    /// Whether this is the test environment of Task 4. Anonymous, because the sign-in page carries the banner
    /// too, and it says nothing else — no name, no database, no version.
    /// </summary>
    /// <remarks>
    /// The environment is the whole answer: the API refuses to start when its environment and its database
    /// disagree, so the Sandbox environment is always the sandbox database and nothing else ever is.
    /// </remarks>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<EnvironmentDto>(StatusCodes.Status200OK)]
    public EnvironmentDto Get() => new(SandboxDatabase.IsSandboxEnvironment(environment.EnvironmentName));
}

/// <param name="IsSandbox">True in the test environment, where no order is real.</param>
public sealed record EnvironmentDto(bool IsSandbox);
