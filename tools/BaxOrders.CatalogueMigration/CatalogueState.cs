using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;

namespace BaxOrders.CatalogueMigration;

public sealed record CatalogueLocation(int Id, string Code, string Name, string NormalizedName, bool IsActive);

public sealed record CatalogueAlias(int Id, int LocationId, string Alias, string NormalizedAlias);

/// <param name="SequenceLastValue">The last number <c>LocationCodeNumbers</c> has handed out, or will hand out first.</param>
/// <param name="SequenceIsCalled">
/// False on a sequence nobody has drawn from yet: its next value is then <paramref name="SequenceLastValue"/>
/// itself rather than one past it.
/// </param>
public sealed record CatalogueState(
    IReadOnlyList<CatalogueLocation> Locations,
    IReadOnlyList<CatalogueAlias> Aliases,
    long SequenceLastValue,
    bool SequenceIsCalled)
{
    /// <summary>The number the application's code generator would issue next.</summary>
    public long NextSequenceNumber => SequenceIsCalled ? SequenceLastValue + 1 : SequenceLastValue;

    public CatalogueLocation? ByCode(string code) =>
        Locations.FirstOrDefault(location => string.Equals(location.Code, code, StringComparison.Ordinal));

    public CatalogueLocation? ById(int id) => Locations.FirstOrDefault(location => location.Id == id);

    /// <summary>The highest number among the system-issued <c>LOC-nnnnnn</c> codes; seeded codes are not numbered.</summary>
    public long HighestIssuedCodeNumber => Locations
        .Select(location => CodeNumber(location.Code))
        .Where(number => number is not null)
        .Select(number => number!.Value)
        .DefaultIfEmpty(0)
        .Max();

    public static long? CodeNumber(string code) =>
        code.StartsWith(Domain.Locations.LocationCode.Prefix, StringComparison.Ordinal)
        && long.TryParse(code.AsSpan(Domain.Locations.LocationCode.Prefix.Length), out var number)
            ? number
            : null;

    public static async Task<CatalogueState> ReadAsync(BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        var locations = await db.Locations.AsNoTracking()
            .OrderBy(location => location.Id)
            .Select(location => new CatalogueLocation(
                location.Id, location.Code, location.Name, location.NormalizedName, location.IsActive))
            .ToListAsync(cancellationToken);

        var aliases = await db.LocationAliases.AsNoTracking()
            .OrderBy(alias => alias.Id)
            .Select(alias => new CatalogueAlias(alias.Id, alias.LocationId, alias.Alias, alias.NormalizedAlias))
            .ToListAsync(cancellationToken);

        var connection = await Database.OpenAsync(db, cancellationToken);
        await using var command = new NpgsqlCommand(
            """SELECT last_value, is_called FROM "LocationCodeNumbers" """, connection, Database.CurrentTransaction(db));
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        var lastValue = reader.GetInt64(0);
        var isCalled = reader.GetBoolean(1);

        return new CatalogueState(locations, aliases, lastValue, isCalled);
    }
}

/// <summary>The raw connection under the context, for what LINQ cannot say: the catalogue of the database itself.</summary>
internal static class Database
{
    public static async Task<NpgsqlConnection> OpenAsync(BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        await db.Database.OpenConnectionAsync(cancellationToken);
        return (NpgsqlConnection)db.Database.GetDbConnection();
    }

    public static NpgsqlTransaction? CurrentTransaction(BaxOrdersDbContext db) =>
        db.Database.CurrentTransaction?.GetDbTransaction() as NpgsqlTransaction;

    /// <summary>A table or column name read from pg_catalog, quoted so it can be put back into a statement.</summary>
    public static string Quote(string identifier) => "\"" + identifier.Replace("\"", "\"\"", StringComparison.Ordinal) + "\"";
}
