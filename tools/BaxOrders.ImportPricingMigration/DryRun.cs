using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace BaxOrders.ImportPricingMigration;

/// <summary>The plan, printed before anything is applied, with the exact SQL and every STOP condition. Changes nothing.</summary>
internal static class DryRun
{
    public static async Task<int> RunAsync(IServiceProvider provider, CancellationToken cancellationToken)
    {
        var db = Program.Db(provider);
        var state = await MigrationState.ReadAsync(db, cancellationToken);
        var plan = MigrationPlan.Of(state);

        PrintState(state);
        plan.Print();

        if (plan.CanApply)
        {
            Report.Heading($"SQL that --apply runs ({MigrationPlan.Target}, as EF Core generates it)");
            Console.WriteLine(Script(db, state));
            Console.WriteLine();
        }

        Console.WriteLine(plan.Stops.Count > 0
            ? "Dry run: STOP — the migration must NOT be applied. Nothing was changed."
            : plan.IsDone
                ? "Dry run: nothing is pending. Nothing was changed."
                : "Dry run: the one migration can be applied. Nothing was changed.");
        return plan.Stops.Count > 0 ? 1 : 0;
    }

    /// <summary>The SQL from the last applied migration to <see cref="MigrationPlan.Target"/>, transaction included.</summary>
    public static string Script(BaxOrdersDbContext db, MigrationState state) =>
        db.GetService<IMigrator>().GenerateScript(
            fromMigration: state.Applied.Count == 0 ? null : state.Applied[^1],
            toMigration: MigrationPlan.Target);

    public static void PrintState(MigrationState state)
    {
        Report.Heading("Migrations");
        Console.WriteLine($"  In the code: {state.Known.Count}, latest {state.Known.LastOrDefault() ?? "—"}");
        Console.WriteLine($"  Applied to the database: {state.Applied.Count}, latest {state.Applied.LastOrDefault() ?? "—"}");
        Console.WriteLine($"  {MigrationState.TableName} classification columns: {state.DescribeColumns()}");
        Console.WriteLine();
    }
}
