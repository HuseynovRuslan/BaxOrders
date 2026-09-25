using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace BaxOrders.ProductMatchMigration;

public enum ApplyOutcome
{
    Applied = 1,

    /// <summary>The migration was already in; nothing was run.</summary>
    NothingToDo = 2,

    /// <summary>A STOP condition held; nothing was run.</summary>
    Refused = 3,

    /// <summary>The migration ran but the result is not the one expected: a migration still pending, or rows in the table.</summary>
    Failed = 4,
}

/// <param name="Before">The plan as it stood before anything ran.</param>
/// <param name="After">The database as it stands afterwards; null when nothing ran.</param>
public sealed record ApplyResult(ApplyOutcome Outcome, MigrationPlan Before, MigrationState? After);

/// <summary>
/// The Task 13a migration, and nothing else. The only command that writes.
/// </summary>
/// <remarks>
/// It refuses to start without a backup taken today and a recorded baseline, so the order
/// <c>--dry-run → --backup → --apply</c> cannot be skipped by accident. The STOP conditions of the dry run are checked
/// again immediately before, and the one migration is applied by EF Core's own migrator, which runs it in one
/// transaction. Afterwards nothing may be pending and the new table must be empty. A second run finds nothing to do.
/// </remarks>
internal static class Apply
{
    public static async Task<int> RunAsync(IServiceProvider provider, ToolSettings settings, CancellationToken cancellationToken)
    {
        var backup = Backup.TodaysBackup(settings);
        if (backup is null)
        {
            Console.Error.WriteLine($"Refused: no {ToolSettings.TaskTag} backup of {settings.DatabaseName} taken today in {settings.BackupDirectory}. Run --backup first.");
            return 1;
        }

        var baseline = Invariants.BaselinePath(settings);
        if (!File.Exists(baseline))
        {
            Console.Error.WriteLine($"Refused: no baseline of the figures that must not change ({baseline}). Run --backup first.");
            return 1;
        }

        Console.WriteLine($"Backup: {backup.FullName} ({backup.Length:N0} bytes, {backup.LastWriteTime:yyyy-MM-dd HH:mm:ss})");
        Console.WriteLine($"Baseline: {baseline}");
        Console.WriteLine();

        var result = await ExecuteAsync(Program.Db(provider), cancellationToken);
        result.Before.Print();

        switch (result.Outcome)
        {
            case ApplyOutcome.Refused:
                Console.Error.WriteLine("Refused: the plan has STOP conditions. Nothing was changed.");
                return 1;
            case ApplyOutcome.NothingToDo:
                Console.WriteLine("Nothing to apply: the migration is already in the database. Nothing was changed.");
                return 0;
        }

        var after = result.After!;
        DryRun.PrintState(after);
        var pending = MigrationPlan.Of(after).Pending;

        if (result.Outcome == ApplyOutcome.Failed)
        {
            Console.Error.WriteLine(
                $"FAILED: after the migration {pending.Count} migration(s) are pending and {MigrationState.TableName} "
                + $"{(after.TableExists ? $"holds {after.DecisionCount} row(s)" : "does not exist")}. Restore {backup.FullName} if needed.");
            return 1;
        }

        Report.Heading("Applied");
        Console.WriteLine($"  done: {MigrationPlan.Target}");
        Console.WriteLine($"  Nothing is pending; {MigrationState.TableName} exists and holds 0 rows. No other table was written.");
        return 0;
    }

    /// <summary>Check, apply the one migration, read the result back.</summary>
    internal static async Task<ApplyResult> ExecuteAsync(BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        var plan = MigrationPlan.Of(await MigrationState.ReadAsync(db, cancellationToken));
        if (plan.Stops.Count > 0)
        {
            return new ApplyResult(ApplyOutcome.Refused, plan, null);
        }

        if (plan.IsDone)
        {
            return new ApplyResult(ApplyOutcome.NothingToDo, plan, null);
        }

        if (!plan.CanApply)
        {
            return new ApplyResult(ApplyOutcome.Refused, plan, null);
        }

        // Up to this migration and not one step further, whatever else the code may one day contain.
        await db.GetService<IMigrator>().MigrateAsync(MigrationPlan.Target, cancellationToken);

        db.ChangeTracker.Clear();
        var after = await MigrationState.ReadAsync(db, cancellationToken);
        var succeeded = MigrationPlan.Of(after).IsDone && after.TableExists && after.DecisionCount == 0;

        return new ApplyResult(succeeded ? ApplyOutcome.Applied : ApplyOutcome.Failed, plan, after);
    }
}
