using BaxOrders.ApprovalSandbox;
using Npgsql;

namespace BaxOrders.UnitTests.ApprovalSandbox;

/// <summary>
/// Task 4b: the guards that keep the approval sandbox and the real database apart, without a database.
/// </summary>
/// <remarks>
/// Every one of them decides from text alone. The last group proves that is also the order things happen in:
/// pointed at a server that does not exist, a refused command fails with the guard's refusal, never with a
/// connection error — because it never tried to connect.
/// </remarks>
public sealed class SandboxGuardTests
{
    private const string Password = "Sinaq-Sifre-2026";

    /// <summary>The shape of the API's development connection string, with a made-up password.</summary>
    private const string DevelopmentConnection =
        "Host=localhost;Port=55434;Database=baxorders_dev;Username=baxorders;Password=not-a-real-secret";

    /// <summary>A host that cannot resolve, so any attempt to connect would fail loudly and differently.</summary>
    private const string Nowhere =
        "Host=sandbox-guard-test.invalid;Port=1;Database=postgres;Username=nobody;Password=x;Timeout=1";

    // ---- guard 1: the name is a sandbox name -------------------------------------------------------------

    [Theory]
    [InlineData("baxorders_sandbox")]
    [InlineData("baxorders_sandbox_t_x")]
    [InlineData("baxorders_sandbox_t_0f3a9c2e41b84d6aa1c3e5f7a9b1c3d5")]
    public void A_sandbox_name_is_accepted(string name) =>
        Assert.Equal(name, SandboxDatabaseName.Require(name, "baxorders_dev"));

    [Theory]
    [InlineData("baxorders_dev")]
    [InlineData("postgres")]
    [InlineData("baxorders_test_0f3a9c2e41b84d6aa1")]
    [InlineData("baxorders_approvers_0f3a9c2e41b84")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    [InlineData("BAXORDERS_SANDBOX")]
    [InlineData("baxorders_sandbox-x")]
    [InlineData("xbaxorders_sandbox")]
    [InlineData("baxorders_sandbox\"; DROP DATABASE baxorders_dev; --")]
    public void Any_other_name_is_refused(string? name) =>
        Assert.Throws<SandboxRefusedException>(() => SandboxDatabaseName.Require(name, "baxorders_dev"));

    [Fact]
    public void A_name_longer_than_postgres_keeps_is_refused_rather_than_cut_into_another_name() =>
        Assert.Throws<SandboxRefusedException>(() =>
            SandboxDatabaseName.Require("baxorders_sandbox_" + new string('a', 46), "baxorders_dev"));

    // ---- guard 2: never the API's own database ------------------------------------------------------------

    [Theory]
    [InlineData("baxorders_sandbox")]
    [InlineData("BAXORDERS_SANDBOX")]
    [InlineData(" baxorders_sandbox ")]
    public void The_name_the_API_itself_uses_is_refused_even_when_it_looks_like_a_sandbox(string realDatabase)
    {
        var refused = Assert.Throws<SandboxRefusedException>(() => SandboxDatabaseName.Require("baxorders_sandbox", realDatabase));
        Assert.Contains("ConnectionStrings:BaxOrders", refused.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void With_no_API_connection_configured_only_guard_one_applies() =>
        Assert.Equal("baxorders_sandbox", SandboxDatabaseName.Require("baxorders_sandbox", null));

    // ---- guard 3: the maintenance database, for CREATE and DROP of the sandbox name only -------------------

    [Fact]
    public void The_database_the_server_string_named_is_replaced_never_used()
    {
        var server = SandboxServer.For(DevelopmentConnection, "baxorders_sandbox", "baxorders_dev");

        Assert.Equal("postgres", new NpgsqlConnectionStringBuilder(server.MaintenanceConnectionString).Database);
        Assert.Equal("baxorders_sandbox", new NpgsqlConnectionStringBuilder(server.SandboxConnectionString).Database);
        Assert.DoesNotContain("baxorders_dev", server.MaintenanceConnectionString, StringComparison.Ordinal);
        Assert.DoesNotContain("baxorders_dev", server.SandboxConnectionString, StringComparison.Ordinal);

        // Same server and account: only the database differs.
        var sandbox = new NpgsqlConnectionStringBuilder(server.SandboxConnectionString);
        Assert.Equal(("localhost", 55434, "baxorders"), (sandbox.Host, sandbox.Port, sandbox.Username));
    }

    [Fact]
    public void The_only_statements_are_create_and_drop_of_the_sandbox_name()
    {
        var server = SandboxServer.For(DevelopmentConnection, "baxorders_sandbox_t_x", "baxorders_dev");

        Assert.Equal("""CREATE DATABASE "baxorders_sandbox_t_x" ENCODING 'UTF8' TEMPLATE template0""", server.CreateStatement);
        Assert.Equal("""DROP DATABASE IF EXISTS "baxorders_sandbox_t_x" WITH (FORCE)""", server.DropStatement);
    }

    [Fact]
    public void No_server_exists_for_a_refused_name() =>
        Assert.Throws<SandboxRefusedException>(() => SandboxServer.For(DevelopmentConnection, "baxorders_dev", "baxorders_dev"));

    [Fact]
    public void What_is_printed_about_the_server_carries_no_password()
    {
        var described = SandboxServer.For(DevelopmentConnection, "baxorders_sandbox", "baxorders_dev").Describe();

        Assert.Equal("baxorders_sandbox @ localhost:55434 (user baxorders)", described);
        Assert.DoesNotContain("not-a-real-secret", described, StringComparison.Ordinal);
    }

    [Fact]
    public void A_missing_server_is_refused_and_says_where_to_set_one()
    {
        var refused = Assert.Throws<SandboxRefusedException>(() => SandboxServer.For(null, "baxorders_sandbox", null));
        Assert.Contains(SandboxSettings.ServerVariable, refused.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void An_unreadable_server_string_is_refused_without_repeating_it()
    {
        const string unreadable = "Hosst=localhost;Pasword=not-a-real-secret";

        var refused = Assert.Throws<SandboxRefusedException>(() => SandboxServer.For(unreadable, "baxorders_sandbox", null));
        Assert.DoesNotContain("not-a-real-secret", refused.Message, StringComparison.Ordinal);
    }

    // ---- the password requirement ----------------------------------------------------------------------

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Without_a_password_the_accounts_are_not_made_and_the_variable_is_named(string? password)
    {
        var refused = Assert.Throws<SandboxRefusedException>(() => SandboxPassword.Require(password));
        Assert.Contains("BAXORDERS_SANDBOX_PASSWORD", refused.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void A_given_password_is_used_as_it_is() => Assert.Equal(Password, SandboxPassword.Require(Password));

    // ---- every guard refuses before a connection is opened --------------------------------------------

    [Theory]
    [InlineData("baxorders_dev")]
    [InlineData("postgres")]
    [InlineData("baxorders_test_0f3a9c2e41b84d6aa1")]
    public async Task Create_reset_and_drop_refuse_another_database_without_trying_to_connect(string name)
    {
        var target = new SandboxTarget(Nowhere, name, "baxorders_dev");

        await Assert.ThrowsAsync<SandboxRefusedException>(() => SandboxLifecycle.CreateAsync(target, Password, CancellationToken.None));
        await Assert.ThrowsAsync<SandboxRefusedException>(() => SandboxLifecycle.ResetAsync(target, Password, CancellationToken.None));
        await Assert.ThrowsAsync<SandboxRefusedException>(() => SandboxLifecycle.DropAsync(target, CancellationToken.None));
    }

    [Fact]
    public async Task The_real_database_is_refused_without_trying_to_connect_even_when_named_like_a_sandbox()
    {
        var target = new SandboxTarget(Nowhere, "baxorders_sandbox", RealDatabaseName: "baxorders_sandbox");

        await Assert.ThrowsAsync<SandboxRefusedException>(() => SandboxLifecycle.CreateAsync(target, Password, CancellationToken.None));
        await Assert.ThrowsAsync<SandboxRefusedException>(() => SandboxLifecycle.DropAsync(target, CancellationToken.None));
    }

    [Fact]
    public async Task Create_and_reset_refuse_without_a_password_before_anything_is_created_or_dropped()
    {
        var target = new SandboxTarget(Nowhere, "baxorders_sandbox", "baxorders_dev");

        await Assert.ThrowsAsync<SandboxRefusedException>(() => SandboxLifecycle.CreateAsync(target, null, CancellationToken.None));
        await Assert.ThrowsAsync<SandboxRefusedException>(() => SandboxLifecycle.ResetAsync(target, " ", CancellationToken.None));
    }

    // ---- the command line and where the settings come from ----------------------------------------------

    [Theory]
    [InlineData(new[] { "--create" }, SandboxCommand.Create)]
    [InlineData(new[] { "--reset" }, SandboxCommand.Reset)]
    [InlineData(new[] { "--drop" }, SandboxCommand.Drop)]
    public void The_three_commands_are_understood(string[] args, SandboxCommand expected) =>
        Assert.Equal(expected, SandboxCommands.Parse(args));

    /// <param name="commandLine">The arguments, separated by spaces.</param>
    [Theory]
    [InlineData("")]
    [InlineData("--create baxorders_dev")]
    [InlineData("--drop --database baxorders_dev")]
    [InlineData("--create --reset")]
    [InlineData("--sql")]
    [InlineData("--apply")]
    [InlineData("create")]
    public void Nothing_else_is_a_command(string commandLine) =>
        Assert.Null(SandboxCommands.Parse(commandLine.Split(' ', StringSplitOptions.RemoveEmptyEntries)));

    [Fact]
    public void The_server_variable_wins_and_the_real_database_is_still_the_API_one()
    {
        var settings = SandboxSettings.Resolve("Host=elsewhere;Database=anything", DevelopmentConnection, Password);

        Assert.Equal("Host=elsewhere;Database=anything", settings.ServerConnectionString);
        Assert.Equal("baxorders_dev", settings.RealDatabaseName);
        Assert.Equal(Password, settings.AccountPassword);
    }

    [Fact]
    public void Without_the_server_variable_the_API_development_server_is_used_and_its_database_replaced()
    {
        var settings = SandboxSettings.Resolve(null, DevelopmentConnection, null);
        var server = SandboxServer.For(settings.ServerConnectionString, SandboxDatabaseName.Default, settings.RealDatabaseName);

        Assert.Equal("baxorders_dev", settings.RealDatabaseName);
        Assert.Equal("baxorders_sandbox", new NpgsqlConnectionStringBuilder(server.SandboxConnectionString).Database);
        Assert.Null(settings.AccountPassword);
    }
}
