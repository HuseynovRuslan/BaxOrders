using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BaxOrders.CatalogueMigration;

/// <summary>A column that holds a location id, with the foreign key that guards it when there is one.</summary>
/// <param name="OnDelete">What the database does to the referencing row when the location goes; null without a key.</param>
public sealed record LocationColumn(string Table, string Column, string? ForeignKey, string? OnDelete)
{
    public override string ToString() => $"{Table}.{Column}";
}

/// <summary>Rows that name a location by its text rather than by its id: staged import rows and review decisions.</summary>
public sealed record NameReference(string Source, string NormalizedName, int Rows);

/// <summary>What refers to which location, found from the database's own catalogue rather than from a list kept by hand.</summary>
/// <param name="ById">Per column, how many rows point at each location id.</param>
public sealed record LocationReferences(
    IReadOnlyList<LocationColumn> Columns,
    IReadOnlyDictionary<LocationColumn, IReadOnlyDictionary<int, long>> ById,
    IReadOnlyList<NameReference> ByName,
    IReadOnlyList<string> MaterializedViews,
    IReadOnlyList<string> Views)
{
    public long RowsReferencing(int locationId) =>
        ById.Values.Sum(counts => counts.GetValueOrDefault(locationId));

    public IEnumerable<(LocationColumn Column, long Rows)> ReferencesTo(int locationId) =>
        ById.Where(entry => entry.Value.GetValueOrDefault(locationId) > 0)
            .Select(entry => (entry.Key, entry.Value[locationId]));

    public IEnumerable<NameReference> ReferencesToName(string normalizedName) =>
        ByName.Where(reference => reference.NormalizedName == normalizedName);
}

internal static class ReferenceScan
{
    /// <summary>
    /// Every foreign key into <c>Locations</c>, then every other column that is named like a location id — a
    /// location can be pointed at without a key (<c>ImportMaterializationGroups.LocationId</c> is), and a scan
    /// that only trusted the keys would miss exactly those.
    /// </summary>
    public static async Task<LocationReferences> ScanAsync(
        BaxOrdersDbContext db, IReadOnlyCollection<int> locationIds, IReadOnlyCollection<string> normalizedNames,
        CancellationToken cancellationToken)
    {
        var connection = await Database.OpenAsync(db, cancellationToken);
        var transaction = Database.CurrentTransaction(db);

        var columns = new List<LocationColumn>();
        await using (var keys = new NpgsqlCommand(
            """
            SELECT cl.relname, att.attname, con.conname, con.confdeltype::text
            FROM pg_constraint con
            JOIN pg_class cl ON cl.oid = con.conrelid
            JOIN pg_namespace ns ON ns.oid = cl.relnamespace
            JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
            WHERE con.contype = 'f'
              AND con.confrelid = 'public."Locations"'::regclass
              AND ns.nspname = 'public'
            ORDER BY cl.relname, att.attname
            """, connection, transaction))
        await using (var reader = await keys.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                columns.Add(new LocationColumn(
                    reader.GetString(0), reader.GetString(1), reader.GetString(2), OnDeleteOf(reader.GetString(3))));
            }
        }

        await using (var named = new NpgsqlCommand(
            """
            SELECT c.table_name, c.column_name
            FROM information_schema.columns c
            JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE c.table_schema = 'public'
              AND t.table_type = 'BASE TABLE'
              AND c.column_name ILIKE '%location%id'
              AND c.table_name <> 'Locations'
            ORDER BY c.table_name, c.column_name
            """, connection, transaction))
        await using (var reader = await named.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var table = reader.GetString(0);
                var column = reader.GetString(1);
                if (!columns.Any(known => known.Table == table && known.Column == column))
                {
                    columns.Add(new LocationColumn(table, column, null, null));
                }
            }
        }

        var byId = new Dictionary<LocationColumn, IReadOnlyDictionary<int, long>>();
        foreach (var column in columns)
        {
            var counts = new Dictionary<int, long>();
            await using var count = new NpgsqlCommand(
                $"SELECT {Database.Quote(column.Column)}, count(*) FROM {Database.Quote(column.Table)} "
                + $"WHERE {Database.Quote(column.Column)} = ANY(@ids) GROUP BY 1",
                connection, transaction);
            count.Parameters.AddWithValue("ids", locationIds.ToArray());
            await using var reader = await count.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                counts[reader.GetInt32(0)] = reader.GetInt64(1);
            }

            byId[column] = counts;
        }

        var byName = await NameReferencesAsync(db, normalizedNames, cancellationToken);
        var materialized = await NamesAsync(connection, transaction,
            "SELECT schemaname || '.' || matviewname FROM pg_matviews ORDER BY 1", cancellationToken);
        var views = await NamesAsync(connection, transaction,
            "SELECT table_schema || '.' || table_name FROM information_schema.views "
            + "WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY 1",
            cancellationToken);

        return new LocationReferences(columns, byId, byName, materialized, views);
    }

    /// <summary>
    /// Text that would resolve to a location at the next validation: staged rows, batch decisions and operator
    /// corrections. None of them has an id to follow, so they are matched the way the importer matches them.
    /// </summary>
    private static async Task<List<NameReference>> NameReferencesAsync(
        BaxOrdersDbContext db, IReadOnlyCollection<string> normalizedNames, CancellationToken cancellationToken)
    {
        var names = normalizedNames.ToArray();
        var found = new List<NameReference>();

        found.AddRange((await db.ImportRows.AsNoTracking()
                .Where(row => row.NormalizedLocationName != null && names.Contains(row.NormalizedLocationName))
                .GroupBy(row => row.NormalizedLocationName!)
                .Select(group => new { Name = group.Key, Rows = group.Count() })
                .ToListAsync(cancellationToken))
            .Select(row => new NameReference("ImportRows.NormalizedLocationName", row.Name, row.Rows)));

        found.AddRange((await db.ImportResolutions.AsNoTracking()
                .Where(resolution => resolution.Kind == ImportResolutionKind.Location && names.Contains(resolution.SourceKey))
                .GroupBy(resolution => resolution.SourceKey)
                .Select(group => new { Name = group.Key, Rows = group.Count() })
                .ToListAsync(cancellationToken))
            .Select(row => new NameReference("ImportResolutions.SourceKey", row.Name, row.Rows)));

        // A correction is typed by a person and stored as typed, so it is normalized here before it is compared.
        var corrections = await db.ImportRowCorrections.AsNoTracking()
            .Where(correction => correction.Field == ImportCorrectionField.Location && correction.CorrectedValue != null)
            .Select(correction => correction.CorrectedValue!)
            .ToListAsync(cancellationToken);

        found.AddRange(corrections
            .Select(TextNormalizer.Normalize)
            .Where(names.Contains)
            .GroupBy(name => name)
            .Select(group => new NameReference("ImportRowCorrections.CorrectedValue", group.Key, group.Count())));

        return found;
    }

    private static async Task<List<string>> NamesAsync(
        NpgsqlConnection connection, NpgsqlTransaction? transaction, string sql, CancellationToken cancellationToken)
    {
        var names = new List<string>();
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            names.Add(reader.GetString(0));
        }

        return names;
    }

    private static string OnDeleteOf(string code) => code switch
    {
        "a" => "NO ACTION",
        "r" => "RESTRICT",
        "c" => "CASCADE",
        "n" => "SET NULL",
        "d" => "SET DEFAULT",
        _ => code,
    };
}
