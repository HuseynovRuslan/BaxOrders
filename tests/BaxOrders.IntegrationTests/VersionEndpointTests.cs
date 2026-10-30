using System.Net.Http.Json;
using BaxOrders.Api.Controllers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The API names the commit it runs, to anybody, and nothing else: the GitHub workflow waits on it to know a push
/// to main went live (the VPS pulls and deploys it).
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class VersionEndpointTests
{
    [PostgresFact]
    public async Task The_version_is_the_commit_deploy_sh_recorded_and_unknown_outside_a_deploy()
    {
        using (var deployed = Hosted("3376e02"))
        using (var anonymous = AuthenticatedApi.Anonymous(deployed))
        {
            var version = await anonymous.GetFromJsonAsync<VersionDto>("/api/v1/version", AuthenticatedApi.Json);
            Assert.Equal("3376e02", version!.Commit);
        }

        using var plain = Hosted(null);
        using var stranger = AuthenticatedApi.Anonymous(plain);
        Assert.Equal("unknown", (await stranger.GetFromJsonAsync<VersionDto>("/api/v1/version", AuthenticatedApi.Json))!.Commit);
    }

    private static WebApplicationFactory<Program> Hosted(string? commit) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:BaxOrders", PostgresDatabaseFixture.ConnectionString!);
            if (commit is not null) builder.UseSetting("BAXORDERS_COMMIT", commit);
        });
}
