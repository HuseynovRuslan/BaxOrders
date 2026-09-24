using BaxOrders.Infrastructure.Persistence;

namespace BaxOrders.UnitTests.Persistence;

/// <summary>
/// Task 4b: the API's startup guard, both ways. The Sandbox environment runs only against a sandbox database,
/// and no other environment ever runs against one — decided from the connection string, before any connection.
/// </summary>
public sealed class SandboxDatabaseTests
{
    private const string Development = "Host=localhost;Port=55434;Database=baxorders_dev;Username=baxorders;Password=not-a-real-secret";
    private const string Sandbox = "Host=localhost;Port=55434;Database=baxorders_sandbox;Username=baxorders;Password=not-a-real-secret";
    private const string SandboxForATest = "Host=localhost;Database=baxorders_sandbox_t_0f3a9c2e;Username=u;Password=p";
    private const string TestDatabase = "Host=localhost;Database=baxorders_test_0f3a9c2e41b84d;Username=u;Password=p";

    [Theory]
    [InlineData("Sandbox", Sandbox)]
    [InlineData("Sandbox", SandboxForATest)]
    [InlineData("sandbox", Sandbox)]
    [InlineData("Development", Development)]
    [InlineData("Testing", TestDatabase)]
    [InlineData("Production", Development)]
    public void An_environment_and_a_database_that_agree_may_start(string environment, string connectionString)
    {
        Assert.Null(SandboxDatabase.RefusalFor(environment, connectionString));
        SandboxDatabase.EnsureFits(environment, connectionString);
    }

    [Theory]
    [InlineData(Development)]
    [InlineData(TestDatabase)]
    [InlineData("Host=localhost;Database=postgres;Username=u;Password=p")]
    [InlineData("Host=localhost;Username=u;Password=p")]
    [InlineData("")]
    [InlineData(null)]
    public void The_sandbox_environment_refuses_every_database_that_is_not_a_sandbox(string? connectionString)
    {
        var refused = Assert.Throws<InvalidOperationException>(() => SandboxDatabase.EnsureFits("Sandbox", connectionString));

        Assert.Contains("baxorders_sandbox", refused.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("not-a-real-secret", refused.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Development", Sandbox)]
    [InlineData("Development", SandboxForATest)]
    [InlineData("Testing", SandboxForATest)]
    [InlineData("Production", Sandbox)]
    [InlineData("Staging", "Host=localhost;Database=BAXORDERS_SANDBOX;Username=u;Password=p")]
    public void Every_other_environment_refuses_a_sandbox_database(string environment, string connectionString)
    {
        var refused = Assert.Throws<InvalidOperationException>(() => SandboxDatabase.EnsureFits(environment, connectionString));

        Assert.Contains("Sandbox", refused.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("not-a-real-secret", refused.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Outside_the_sandbox_a_missing_connection_string_is_left_to_the_ordinary_startup_error() =>
        Assert.Null(SandboxDatabase.RefusalFor("Development", null));

    [Theory]
    [InlineData("Sandbox", true)]
    [InlineData("SANDBOX", true)]
    [InlineData("Development", false)]
    [InlineData("Testing", false)]
    [InlineData(null, false)]
    public void Only_the_sandbox_environment_is_the_sandbox(string? environment, bool expected) =>
        Assert.Equal(expected, SandboxDatabase.IsSandboxEnvironment(environment));
}
