using Microsoft.Data.SqlClient;
using Npgsql;

namespace BaxOrders.DataTransfer;

/// <summary>Counts both sides and says whether they agree, table by table and on the business figures.</summary>
public static class Reconciliation
{
    /// <returns>True when every table and every business figure matches.</returns>
    public static async Task<bool> ReportAsync(
        SqlConnection source, NpgsqlConnection target, IReadOnlyList<TablePlan> tables)
    {
        ArgumentNullException.ThrowIfNull(tables);

        Console.WriteLine();
        Console.WriteLine($"{"table",-34}{"SQL Server",12}{"PostgreSQL",12}");

        var matched = true;
        foreach (var table in tables.OrderBy(table => table.Name, StringComparer.Ordinal))
        {
            var before = await ScalarAsync(source, $"SELECT COUNT_BIG(*) FROM [{table.Name}]");
            var after = await ScalarAsync(target, $"SELECT count(*) FROM \"{table.Name}\"");
            var same = Equals(before, after);
            matched &= same;
            Console.WriteLine($"{table.Name,-34}{before,12:N0}{after,12:N0}{(same ? "" : "   MISMATCH")}");
        }

        Console.WriteLine();
        Console.WriteLine("business figures");
        foreach (var (label, sqlServer, postgres) in Figures)
        {
            var before = await ScalarAsync(source, sqlServer);
            var after = await ScalarAsync(target, postgres);
            var same = Equals(before, after);
            matched &= same;
            Console.WriteLine($"  {label,-32}{before,16}{after,16}{(same ? "" : "   MISMATCH")}");
        }

        Console.WriteLine();
        Console.WriteLine(matched ? "Reconciled: both databases agree." : "DIFFERENT: see the mismatches above.");
        return matched;
    }

    public static async Task<long> TargetRowCountAsync(NpgsqlConnection target, IReadOnlyList<TablePlan> tables)
    {
        ArgumentNullException.ThrowIfNull(tables);

        var total = 0L;
        foreach (var table in tables)
        {
            total += (long)await ScalarAsync(target, $"SELECT count(*) FROM \"{table.Name}\"");
        }

        return total;
    }

    /// <summary>
    /// What the business would notice if it changed, checked apart from the row counts.
    /// </summary>
    /// <remarks>
    /// Counts alone would not catch a money column that lost its scale or a status that came across as
    /// something else, so the figures that carry meaning are compared as values.
    /// </remarks>
    private static readonly (string Label, string SqlServer, string Postgres)[] Figures =
    [
        ("order requests",
            "SELECT COUNT_BIG(*) FROM [OrderRequests]",
            "SELECT count(*) FROM \"OrderRequests\""),
        ("drafts",
            "SELECT COUNT_BIG(*) FROM [OrderRequests] WHERE [Status] = 'Draft'",
            "SELECT count(*) FROM \"OrderRequests\" WHERE \"Status\" = 'Draft'"),
        ("highest version",
            "SELECT MAX([Version]) FROM [OrderRequests]",
            "SELECT max(\"Version\") FROM \"OrderRequests\""),
        ("order items",
            "SELECT COUNT_BIG(*) FROM [OrderRequestItems]",
            "SELECT count(*) FROM \"OrderRequestItems\""),
        ("items without a price",
            "SELECT COUNT_BIG(*) FROM [OrderRequestItems] WHERE [UnitPrice] IS NULL",
            "SELECT count(*) FROM \"OrderRequestItems\" WHERE \"UnitPrice\" IS NULL"),
        ("items without a supplier",
            "SELECT COUNT_BIG(*) FROM [OrderRequestItems] WHERE [SupplierId] IS NULL",
            "SELECT count(*) FROM \"OrderRequestItems\" WHERE \"SupplierId\" IS NULL"),
        ("known money",
            "SELECT CAST(SUM([Quantity] * [UnitPrice]) AS DECIMAL(38,5)) FROM [OrderRequestItems] WHERE [UnitPrice] IS NOT NULL",
            "SELECT CAST(sum(\"Quantity\" * \"UnitPrice\") AS numeric(38,5)) FROM \"OrderRequestItems\" WHERE \"UnitPrice\" IS NOT NULL"),
        ("total quantity",
            "SELECT CAST(SUM([Quantity]) AS DECIMAL(38,3)) FROM [OrderRequestItems]",
            "SELECT CAST(sum(\"Quantity\") AS numeric(38,3)) FROM \"OrderRequestItems\""),
        ("provenance links",
            "SELECT COUNT_BIG(*) FROM [ImportRowMaterializations]",
            "SELECT count(*) FROM \"ImportRowMaterializations\""),
        ("items reaching a workbook row",
            """
            SELECT COUNT_BIG(*) FROM [OrderRequestItems] i
            JOIN [ImportRowMaterializations] m ON m.[OrderRequestItemId] = i.[Id]
            JOIN [ImportRows] r ON r.[Id] = m.[ImportRowId]
            """,
            """
            SELECT count(*) FROM "OrderRequestItems" i
            JOIN "ImportRowMaterializations" m ON m."OrderRequestItemId" = i."Id"
            JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
            """),
        ("workflow events",
            "SELECT COUNT_BIG(*) FROM [OrderRequestWorkflowEvents]",
            "SELECT count(*) FROM \"OrderRequestWorkflowEvents\""),
        ("revisions",
            "SELECT COUNT_BIG(*) FROM [OrderRequestRevisions]",
            "SELECT count(*) FROM \"OrderRequestRevisions\""),
        ("edit events",
            "SELECT COUNT_BIG(*) FROM [OrderRequestEditEvents]",
            "SELECT count(*) FROM \"OrderRequestEditEvents\""),
        ("lineage links",
            "SELECT COUNT_BIG(*) FROM [OrderRequestItems] WHERE [SourceOrderRequestItemId] IS NOT NULL",
            "SELECT count(*) FROM \"OrderRequestItems\" WHERE \"SourceOrderRequestItemId\" IS NOT NULL"),
        ("identity users",
            "SELECT COUNT_BIG(*) FROM [AspNetUsers]",
            "SELECT count(*) FROM \"AspNetUsers\""),
        ("identity roles",
            "SELECT COUNT_BIG(*) FROM [AspNetRoles]",
            "SELECT count(*) FROM \"AspNetRoles\""),
        ("staged rows",
            "SELECT COUNT_BIG(*) FROM [ImportRows]",
            "SELECT count(*) FROM \"ImportRows\""),
        ("excluded rows",
            "SELECT COUNT_BIG(*) FROM [ImportRows] WHERE [IsExcluded] = 1",
            "SELECT count(*) FROM \"ImportRows\" WHERE \"IsExcluded\""),
        ("resolutions",
            "SELECT COUNT_BIG(*) FROM [ImportResolutions]",
            "SELECT count(*) FROM \"ImportResolutions\""),
        ("row corrections",
            "SELECT COUNT_BIG(*) FROM [ImportRowCorrections]",
            "SELECT count(*) FROM \"ImportRowCorrections\""),
    ];

    private static async Task<object> ScalarAsync(SqlConnection connection, string sql)
    {
        await using var command = new SqlCommand(sql, connection);
        return Normalize(await command.ExecuteScalarAsync());
    }

    private static async Task<object> ScalarAsync(NpgsqlConnection connection, string sql)
    {
        await using var command = new NpgsqlCommand(sql, connection);
        return Normalize(await command.ExecuteScalarAsync());
    }

    /// <summary>
    /// Makes the two providers' answers comparable: SQL Server counts as <c>bigint</c>, PostgreSQL as
    /// <c>bigint</c> too, but sums come back as <c>decimal</c> with different trailing zeros.
    /// </summary>
    private static object Normalize(object? value) => value switch
    {
        null or DBNull => "—",
        decimal number => number.ToString("0.#####", System.Globalization.CultureInfo.InvariantCulture),
        int number => (long)number,
        _ => value,
    };
}
