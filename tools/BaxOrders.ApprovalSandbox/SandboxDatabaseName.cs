using System.Text.RegularExpressions;
using BaxOrders.Infrastructure.Persistence;

namespace BaxOrders.ApprovalSandbox;

/// <summary>
/// Guards 1 and 2: the only database this tool creates, seeds, resets or drops is a sandbox database — and
/// never the one the API itself uses, even if somebody named that one like a sandbox.
/// </summary>
/// <remarks>
/// Decided from the name alone, so it refuses before any connection is opened. The name also goes into
/// <c>CREATE DATABASE</c> and <c>DROP DATABASE</c> as an identifier, which is why it is held to lower-case
/// letters, digits and underscores: nothing that can close a quoted identifier ever reaches the server.
/// </remarks>
public static partial class SandboxDatabaseName
{
    /// <summary>The database the command-line tool always uses. Tests use <c>baxorders_sandbox_t_…</c>.</summary>
    public const string Default = SandboxDatabase.NamePrefix;

    /// <summary>PostgreSQL's limit for an identifier; a longer name would be cut and could name something else.</summary>
    private const int MaxLength = 63;

    /// <param name="name">The database to act on.</param>
    /// <param name="realDatabaseName">
    /// The database named in the API's own <c>ConnectionStrings:BaxOrders</c>, or null when none is configured.
    /// </param>
    /// <returns>The name, when this tool may act on it.</returns>
    /// <exception cref="SandboxRefusedException">It is not a sandbox database, or it is the API's own database.</exception>
    public static string Require(string? name, string? realDatabaseName)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new SandboxRefusedException("No database name was given. The sandbox database is " + Default + ".");
        }

        if (name.Length > MaxLength || !Pattern().IsMatch(name))
        {
            throw new SandboxRefusedException(
                $"'{name}' is not a sandbox database. This tool acts only on {Default}, or on a name that starts "
                + $"with {Default}_ and continues in lower-case letters, digits and underscores.");
        }

        if (!string.IsNullOrWhiteSpace(realDatabaseName)
            && string.Equals(name, realDatabaseName.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            throw new SandboxRefusedException(
                $"'{name}' is the database the API itself uses (ConnectionStrings:BaxOrders). The sandbox can never "
                + "be that database, whatever it is called.");
        }

        return name;
    }

    [GeneratedRegex("^baxorders_sandbox(_[a-z0-9]+)*$", RegexOptions.CultureInvariant)]
    private static partial Regex Pattern();
}
