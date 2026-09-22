using Npgsql;

namespace BaxOrders.DataTransfer;

/// <summary>
/// Moves the identity sequences past the ids that were copied.
/// </summary>
/// <remarks>
/// The rows were inserted with their own ids, so every sequence still stands where a fresh database left it
/// and the next insert would collide with a row that already exists. This is the step whose absence only
/// shows up later, when somebody adds a location and the database refuses it.
/// </remarks>
public static class Sequences
{
    public static async Task<int> ResetAsync(NpgsqlConnection target, IReadOnlyList<TablePlan> tables)
    {
        ArgumentNullException.ThrowIfNull(target);
        ArgumentNullException.ThrowIfNull(tables);

        var advanced = 0;
        foreach (var table in tables)
        {
            foreach (var column in table.KeyColumns)
            {
                // pg_get_serial_sequence takes the identifiers as text and the highest id has to come from the
                // table itself, so the statement is written per column rather than parameterised.
                // setval's third argument says whether the value was "used": false on an empty table leaves
                // the sequence handing out 1 next, which is what a fresh database would do.
                await using var command = new NpgsqlCommand($"""
                    SELECT setval(
                        pg_get_serial_sequence('"{table.Name}"', '{column}'),
                        GREATEST(COALESCE((SELECT max("{column}") FROM "{table.Name}"), 0), 1),
                        COALESCE((SELECT max("{column}") FROM "{table.Name}"), 0) > 0)
                    WHERE pg_get_serial_sequence('"{table.Name}"', '{column}') IS NOT NULL
                    """, target);

                await command.ExecuteNonQueryAsync();
                advanced++;
            }
        }

        // The two code sequences are the application's own, not identity columns behind a table.
        foreach (var (sequence, table, column) in NamedSequences)
        {
            // The codes look like PRD-000042; the number is the last six characters. A code that does not look
            // like one is ignored rather than guessed at.
            const string CodePattern = "'^[A-Z]+-[0-9]{6}$'";
            var highest = $"""(SELECT max(CAST(right("{column}", 6) AS bigint)) FROM "{table}" WHERE "{column}" ~ {CodePattern})""";

            await using var command = new NpgsqlCommand(
                $"""
                SELECT setval('"{sequence}"',
                    GREATEST(COALESCE({highest}, 0), 1),
                    COALESCE({highest}, 0) > 0)
                """, target);

            await command.ExecuteNonQueryAsync();
            advanced++;
        }

        return advanced;
    }

    /// <summary>
    /// The sequences that hand out `PRD-000001` and `LOC-000001`. They are read back out of the codes that
    /// exist, because the codes are the only record of how far they got.
    /// </summary>
    private static readonly (string Sequence, string Table, string Column)[] NamedSequences =
    [
        ("ProductCodeNumbers", "Products", "Code"),
        ("LocationCodeNumbers", "Locations", "Code"),
    ];
}
