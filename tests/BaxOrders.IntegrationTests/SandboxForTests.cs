using BaxOrders.ApprovalSandbox;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// A throw-away approval sandbox of one test's own, made and dropped by the tool's own logic.
/// </summary>
/// <remarks>
/// It lives on the test server, named <c>baxorders_sandbox_t_…</c>, and is created and dropped through that
/// server's maintenance database exactly as the tool does it. The database the rest of the suite shares is
/// given as the "real" one, which the sandbox may never be.
/// </remarks>
internal static class SandboxForTests
{
    public static SandboxTarget NewTarget() => new(
        PostgresDatabaseFixture.ConnectionString,
        $"baxorders_sandbox_t_{Guid.NewGuid():N}",
        PostgresDatabaseFixture.ConnectionString is { } shared ? new NpgsqlConnectionStringBuilder(shared).Database : null);

    public static string ConnectionString(SandboxTarget target) => SandboxLifecycle.Server(target).SandboxConnectionString;

    public static BaxOrdersDbContext Context(SandboxTarget target) =>
        new(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(ConnectionString(target))
            .AddInterceptors(new AuditingSaveChangesInterceptor(TimeProvider.System))
            .Options);

    /// <summary>The real API, in the Sandbox environment, against this sandbox — as <c>sandbox.ps1 -Run</c> starts it.</summary>
    public static WebApplicationFactory<Program> Api(SandboxTarget target) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(SandboxDatabase.EnvironmentName);
            builder.UseSetting("ConnectionStrings:BaxOrders", ConnectionString(target));
        });

    /// <summary>Drops it if a test left it behind; dropping one that is gone already is not an error.</summary>
    public static async Task DropAsync(SandboxTarget target)
    {
        if (PostgresDatabaseFixture.IsConfigured)
        {
            await SandboxLifecycle.DropAsync(target, CancellationToken.None);
        }
    }
}
