using Microsoft.Data.SqlClient;
using Npgsql;
using NpgsqlTypes;

namespace BaxOrders.DataTransfer;

/// <summary>Copies one table's rows across, value for value.</summary>
/// <remarks>
/// Every column is written explicitly, ids included, so the two databases hold the same rows with the same
/// identities and every foreign key still points where it pointed. Nothing is recomputed, defaulted or
/// normalised on the way: a value that was wrong stays wrong, which is the point of a provider migration.
/// </remarks>
public static class TableCopier
{
    /// <summary>
    /// Columns the target has and the source never did, with what to put in them.
    /// </summary>
    /// <remarks>
    /// Only bookkeeping belongs here. <c>ConcurrencyStamp</c> replaced SQL Server's <c>rowversion</c> in Task
    /// 9C: it says "this is the row as it stands now" and means nothing historically, so a fresh value is the
    /// honest one. A business column missing from the source is a mistake, not a default — hence the refusal
    /// below rather than a silent fallback.
    /// </remarks>
    private static readonly Dictionary<string, Func<object>> Generated = new(StringComparer.Ordinal)
    {
        ["ConcurrencyStamp"] = () => Guid.NewGuid(),
    };

    public static async Task<long> CopyAsync(
        SqlConnection source, NpgsqlConnection target, NpgsqlTransaction transaction, TablePlan table)
    {
        ArgumentNullException.ThrowIfNull(table);

        var available = await SourceColumnsAsync(source, table.Name);
        var read = table.Columns.Where(available.Contains).ToList();
        var generated = table.Columns.Except(read, StringComparer.Ordinal).ToList();

        // Identity's own ConcurrencyStamp is a string and does exist in the source, so this only ever catches
        // a column the migration genuinely introduced.
        if (generated.FirstOrDefault(column => !Generated.ContainsKey(column)) is { } unknown)
        {
            throw new InvalidOperationException(
                $"[{table.Name}].[{unknown}] does not exist in the source and there is no rule for filling it. "
                + "Copying the table would invent data, so the transfer stops here.");
        }

        var select = new SqlCommand(
            $"SELECT {string.Join(", ", read.Select(column => $"[{column}]"))} FROM [{table.Name}]", source);

        await using var reader = await select.ExecuteReaderAsync();

        var all = read.Concat(generated).ToList();
        var targets = string.Join(", ", all.Select(column => $"\"{column}\""));
        var placeholders = string.Join(", ", all.Select((_, index) => $"${index + 1}"));
        var insert = $"INSERT INTO \"{table.Name}\" ({targets}) VALUES ({placeholders})";

        var rows = 0L;
        while (await reader.ReadAsync())
        {
            await using var write = new NpgsqlCommand(insert, target, transaction);
            for (var index = 0; index < read.Count; index++)
            {
                write.Parameters.Add(Parameter(reader.GetValue(index)));
            }

            foreach (var column in generated)
            {
                write.Parameters.Add(Parameter(Generated[column]()));
            }

            await write.ExecuteNonQueryAsync();
            rows++;
        }

        return rows;
    }

    private static async Task<HashSet<string>> SourceColumnsAsync(SqlConnection source, string table)
    {
        var command = new SqlCommand(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table", source);
        command.Parameters.AddWithValue("@table", table);

        var columns = new HashSet<string>(StringComparer.Ordinal);
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            columns.Add(reader.GetString(0));
        }

        return columns;
    }

    /// <summary>
    /// One value on its way across.
    /// </summary>
    /// <remarks>
    /// SQL Server hands back <see cref="DateTime"/> with no kind, because <c>datetime2</c> does not carry one.
    /// Every timestamp in this model is a UTC instant — each column is named for it — so it is labelled rather
    /// than converted: converting would silently move the instant by this machine's offset.
    /// </remarks>
    private static NpgsqlParameter Parameter(object value) => value switch
    {
        DBNull => new NpgsqlParameter { Value = DBNull.Value },
        DateTime moment => new NpgsqlParameter
        {
            NpgsqlDbType = NpgsqlDbType.TimestampTz,
            Value = DateTime.SpecifyKind(moment, DateTimeKind.Utc),
        },
        _ => new NpgsqlParameter { Value = value },
    };
}
