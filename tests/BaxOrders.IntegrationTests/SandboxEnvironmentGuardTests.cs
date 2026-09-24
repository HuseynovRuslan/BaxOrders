using System.Net.Http.Json;
using BaxOrders.Api.Controllers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Task 4b: the real API refuses to start when its environment and its database disagree, in both directions,
/// and tells the screens which environment they are in.
/// </summary>
/// <remarks>
/// The refusals point at a host that does not exist: the guard decides from the connection string before
/// anything is registered, so no connection is attempted — and if one were, it could reach nothing.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class SandboxEnvironmentGuardTests
{
    private const string Nowhere = "Host=sandbox-guard-test.invalid;Port=1;Username=nobody;Password=x;Timeout=1";

    [Fact]
    public void The_sandbox_environment_refuses_to_start_against_a_database_that_is_not_a_sandbox()
    {
        using var factory = Hosted(SandboxDatabase.EnvironmentName, $"{Nowhere};Database=baxorders_dev");

        var refused = Assert.Throws<InvalidOperationException>(() => factory.CreateClient());
        Assert.Contains("runs only against a database named baxorders_sandbox", refused.Message, StringComparison.Ordinal);
    }

    /// <remarks>
    /// Development is covered by the unit tests of the same guard rather than here: hosted in Development, the
    /// API would also read the developer's user-secrets, and a test has no business near those.
    /// </remarks>
    [Theory]
    [InlineData("Testing")]
    [InlineData("Staging")]
    [InlineData("Production")]
    public void Any_other_environment_refuses_to_start_against_a_sandbox_database(string environment)
    {
        using var factory = Hosted(environment, $"{Nowhere};Database=baxorders_sandbox");

        var refused = Assert.Throws<InvalidOperationException>(() => factory.CreateClient());
        Assert.Contains("test database 'baxorders_sandbox'", refused.Message, StringComparison.Ordinal);
    }

    /// <summary>The normal API says it is not the sandbox, to anybody, so the normal screens show no banner.</summary>
    [PostgresFact]
    public async Task The_normal_api_tells_the_screens_it_is_not_the_sandbox()
    {
        using var factory = Hosted("Testing", PostgresDatabaseFixture.ConnectionString!);
        using var anonymous = AuthenticatedApi.Anonymous(factory);

        var environment = await anonymous.GetFromJsonAsync<EnvironmentDto>("/api/v1/environment", AuthenticatedApi.Json);

        Assert.False(environment!.IsSandbox);
    }

    private static WebApplicationFactory<Program> Hosted(string environment, string connectionString) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.UseSetting("ConnectionStrings:BaxOrders", connectionString);
        });
}
