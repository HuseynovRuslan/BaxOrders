using System.Data;
using BaxOrders.DataTransfer;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Npgsql;

// One-time move of the Development database from SQL Server to PostgreSQL (Task 9C).
//
// It copies rows as they are — every id, every value — and changes nothing on the way: this is a provider
// migration, not a data cleanup. Run it once against an empty PostgreSQL schema created by the migrations,
// then reconcile the counts before the SQL Server database is retired.
//
//   dotnet run --project tools/BaxOrders.DataTransfer -- --source "<sql server>" --target "<postgres>"
//   dotnet run --project tools/BaxOrders.DataTransfer -- --verify-only

var options = TransferOptions.Parse(args);
if (options is null)
{
    Console.Error.WriteLine("""
        Usage: dotnet run --project tools/BaxOrders.DataTransfer -- [options]

          --source <connection string>   SQL Server to read (default: the Development LocalDB)
          --target <connection string>   PostgreSQL to write (default: ConnectionStrings:BaxOrders from user-secrets)
          --reset                        Empty the target's tables first (the migration seeds some)
          --verify-only                  Count both sides and compare; write nothing
        """);
    return 2;
}

await using var context = new BaxOrdersDbContext(
    new DbContextOptionsBuilder<BaxOrdersDbContext>().UseNpgsql(options.Target).Options);

// The order to copy in, worked out from the model's own foreign keys: a table is never written before the
// tables it points at. Taking it from the model means a new table cannot be forgotten here.
var tables = TableOrder.Of(context.Model);
Console.WriteLine($"{tables.Count} tables, in dependency order.");

await using var source = new SqlConnection(options.Source);
await source.OpenAsync();
await using var target = new NpgsqlConnection(options.Target);
await target.OpenAsync();

if (options.VerifyOnly)
{
    return await Reconciliation.ReportAsync(source, target, tables) ? 0 : 1;
}

var existing = await Reconciliation.TargetRowCountAsync(target, tables);
if (existing > 0 && !options.Reset)
{
    Console.Error.WriteLine(
        $"The target already holds {existing} row(s) — the migration seeds reference data. "
        + "Pass --reset to empty it first, so nothing is copied twice.");
    return 1;
}

var copied = 0L;
await using (var transaction = await target.BeginTransactionAsync())
{
    if (options.Reset)
    {
        // Children first, so no foreign key is broken on the way down.
        foreach (var table in tables.Reverse())
        {
            await using var clear = new NpgsqlCommand($"DELETE FROM \"{table.Name}\"", target, transaction);
            await clear.ExecuteNonQueryAsync();
        }

        Console.WriteLine($"Cleared {existing:N0} seeded row(s) from the target.");
    }

    foreach (var table in tables)
    {
        var rows = await TableCopier.CopyAsync(source, target, transaction, table);
        copied += rows;
        Console.WriteLine($"  {table.Name,-34} {rows,7:N0}");
    }

    await transaction.CommitAsync();
}

Console.WriteLine($"Copied {copied:N0} row(s).");

// Explicit ids were inserted, so the identity sequences still start at 1 and the next insert would collide.
var advanced = await Sequences.ResetAsync(target, tables);
Console.WriteLine($"Reset {advanced} sequence(s) past the ids that were copied.");

return await Reconciliation.ReportAsync(source, target, tables) ? 0 : 1;
