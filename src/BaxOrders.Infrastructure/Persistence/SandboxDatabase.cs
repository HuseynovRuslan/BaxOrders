using Npgsql;

namespace BaxOrders.Infrastructure.Persistence;

/// <summary>
/// The test environment of Task 4: a database of synthetic orders, kept apart from the real one by its name.
/// </summary>
/// <remarks>
/// The approval flow is tried there — sent, returned, corrected, approved — and none of it may ever reach the
/// company's data, nor may the company's data ever be served as if it were the test environment. Both halves
/// rest on one fact that needs no connection to check: the name of the database. A sandbox database is named
/// <c>baxorders_sandbox…</c>, and nothing else is.
/// <para>
/// So the API refuses to start when its environment and its database disagree, in both directions: the
/// <c>Sandbox</c> environment only against a sandbox database, and every other environment never against one.
/// The screens mark the test environment with a banner, but they are not what keeps the two apart — this is.
/// </para>
/// </remarks>
public static class SandboxDatabase
{
    /// <summary>The ASP.NET Core environment the API runs in against the sandbox database.</summary>
    public const string EnvironmentName = "Sandbox";

    /// <summary>What every sandbox database's name starts with, and no other database's.</summary>
    public const string NamePrefix = "baxorders_sandbox";

    /// <summary>Whether the API runs as the test environment. Environment names compare as ASP.NET Core compares them.</summary>
    public static bool IsSandboxEnvironment(string? environmentName) =>
        string.Equals(environmentName, EnvironmentName, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Whether a database name belongs to the test environment. Case is ignored on purpose: a name that only
    /// looks like a sandbox is still kept away from the normal screens.
    /// </summary>
    public static bool IsSandboxName(string? databaseName) =>
        !string.IsNullOrWhiteSpace(databaseName)
        && databaseName.Trim().StartsWith(NamePrefix, StringComparison.OrdinalIgnoreCase);

    /// <summary>The database a connection string names, or null when it names none. Reads the text; connects to nothing.</summary>
    public static string? DatabaseNameOf(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return null;
        }

        try
        {
            return new NpgsqlConnectionStringBuilder(connectionString).Database;
        }
        catch (ArgumentException)
        {
            // Not a connection string at all. Starting would fail on it anyway; it is not a sandbox either way.
            return null;
        }
    }

    /// <summary>Why the API may not start with this environment and this database, or null when it may.</summary>
    /// <param name="environmentName">The ASP.NET Core environment, as the host reports it.</param>
    /// <param name="connectionString">The <c>ConnectionStrings:BaxOrders</c> the API would use.</param>
    public static string? RefusalFor(string? environmentName, string? connectionString)
    {
        var databaseName = DatabaseNameOf(connectionString);

        if (IsSandboxEnvironment(environmentName))
        {
            return IsSandboxName(databaseName)
                ? null
                : $"The {EnvironmentName} environment runs only against a database named {NamePrefix}…, and "
                  + $"ConnectionStrings:BaxOrders names '{databaseName ?? "no database"}'. The test environment never "
                  + "reaches the real data; start it with tools/BaxOrders.ApprovalSandbox/sandbox.ps1 -Run.";
        }

        return IsSandboxName(databaseName)
            ? $"ConnectionStrings:BaxOrders names the test database '{databaseName}', and the environment is "
              + $"'{environmentName}'. Test data is served only in the {EnvironmentName} environment, where every "
              + "page says so; start it with tools/BaxOrders.ApprovalSandbox/sandbox.ps1 -Run."
            : null;
    }

    /// <summary>Refuses, before anything reaches a database, to start with an environment and a database that disagree.</summary>
    /// <exception cref="InvalidOperationException">They disagree. The message says which way, and names no password.</exception>
    public static void EnsureFits(string? environmentName, string? connectionString)
    {
        if (RefusalFor(environmentName, connectionString) is { } refusal)
        {
            throw new InvalidOperationException(refusal);
        }
    }
}
