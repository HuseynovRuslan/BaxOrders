using Npgsql;

namespace BaxOrders.ApprovalSandbox;

/// <summary>
/// Guard 3: the server the sandbox lives on, and the only two databases this tool ever connects to there.
/// </summary>
/// <remarks>
/// One is the sandbox itself. The other is the server's maintenance database, <c>postgres</c>, and only to
/// issue the two statements below — <c>CREATE DATABASE</c> and <c>DROP DATABASE … WITH (FORCE)</c> for the
/// sandbox name. Whatever database the given connection string named is replaced, never used: the API's
/// development connection string names the real database, and this is what keeps the tool out of it.
/// <para>
/// It is built only from a name <see cref="SandboxDatabaseName"/> accepted, so no statement can exist for
/// any other database.
/// </para>
/// </remarks>
public sealed class SandboxServer
{
    /// <summary>The server's own database, used for nothing but creating and dropping the sandbox.</summary>
    public const string MaintenanceDatabase = "postgres";

    private readonly NpgsqlConnectionStringBuilder server;

    private SandboxServer(NpgsqlConnectionStringBuilder server, string databaseName)
    {
        this.server = server;
        DatabaseName = databaseName;
    }

    public string DatabaseName { get; }

    /// <summary>The connection that creates and drops the sandbox, and does nothing else.</summary>
    public string MaintenanceConnectionString => WithDatabase(MaintenanceDatabase);

    /// <summary>The sandbox database itself: migrated, seeded and served from.</summary>
    public string SandboxConnectionString => WithDatabase(DatabaseName);

    /// <summary>The same way the integration tests make their throw-away databases.</summary>
    public string CreateStatement => $"""CREATE DATABASE "{DatabaseName}" ENCODING 'UTF8' TEMPLATE template0""";

    /// <summary>Forced, because a sandbox API may still be connected; it only ever names the sandbox.</summary>
    public string DropStatement => $"""DROP DATABASE IF EXISTS "{DatabaseName}" WITH (FORCE)""";

    /// <param name="serverConnectionString">Any connection string to the server. Its database is replaced.</param>
    /// <param name="databaseName">The sandbox database; refused unless it is one.</param>
    /// <param name="realDatabaseName">The API's own database, which the sandbox may never be.</param>
    /// <exception cref="SandboxRefusedException">The name is refused, or the connection string cannot be read.</exception>
    public static SandboxServer For(string? serverConnectionString, string? databaseName, string? realDatabaseName)
    {
        var name = SandboxDatabaseName.Require(databaseName, realDatabaseName);

        if (string.IsNullOrWhiteSpace(serverConnectionString))
        {
            throw new SandboxRefusedException(
                $"No server to create the sandbox on. Set {SandboxSettings.ServerVariable}, or run "
                + "scripts/dev-postgres.ps1 so the API's development connection string exists.");
        }

        NpgsqlConnectionStringBuilder builder;
        try
        {
            builder = new NpgsqlConnectionStringBuilder(serverConnectionString);
        }
        catch (ArgumentException)
        {
            // The text is not repeated: it may carry a password.
            throw new SandboxRefusedException("The server connection string cannot be read as a PostgreSQL connection string.");
        }

        return new SandboxServer(builder, name);
    }

    /// <summary>Where the sandbox is, without the password, so it can be printed.</summary>
    public string Describe() => $"{DatabaseName} @ {server.Host}:{server.Port} (user {server.Username})";

    private string WithDatabase(string database) =>
        new NpgsqlConnectionStringBuilder(server.ConnectionString) { Database = database }.ConnectionString;
}
