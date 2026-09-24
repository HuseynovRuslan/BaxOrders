using BaxOrders.Domain.Locations;
using BaxOrders.Infrastructure.Persistence;
using Npgsql;

namespace BaxOrders.CatalogueMigration;

public enum ApplyOutcome
{
    Applied = 1,

    /// <summary>The catalogue already reflected every decision; nothing was written.</summary>
    NothingToDo = 2,

    /// <summary>A STOP condition held; nothing was written.</summary>
    Refused = 3,

    /// <summary>The steps ran but the plan was not empty afterwards; everything was rolled back.</summary>
    RolledBack = 4,
}

/// <param name="Before">The plan as it stood inside the transaction, before any step.</param>
/// <param name="After">The plan read again from what the steps wrote; empty when the migration is idempotent.</param>
public sealed record ApplyResult(ApplyOutcome Outcome, CataloguePlan Before, CataloguePlan? After, IReadOnlyList<string> MaterializedViews);

/// <summary>
/// A3: the approved catalogue changes, in one transaction, and nothing else. The only command that writes.
/// </summary>
/// <remarks>
/// <para>
/// It refuses to start without a backup taken today and a recorded baseline, so the order
/// <c>--dry-run → --backup → --apply</c> cannot be skipped by accident. Inside the transaction the catalogue is
/// locked, the plan is worked out again from what is there at that moment, and any STOP condition ends it with
/// nothing written. After the steps the plan is worked out once more and has to come back empty — the proof,
/// before commit, that the migration is idempotent.
/// </para>
/// <para>
/// Every value written goes through the domain first: a renamed or inserted <see cref="Location"/> is built so
/// its normalized name is the one the application would compute, and every alias is a
/// <see cref="LocationAlias"/>, so an alias equal to its object's name is refused here exactly as it is
/// everywhere else. The rows themselves are written with plain statements because the application refuses to
/// delete a location at all; the owner decided these three are to go, and the foreign keys — every one of
/// them <c>RESTRICT</c> — still stand behind that decision.
/// </para>
/// </remarks>
internal static class Apply
{
    public static async Task<int> RunAsync(IServiceProvider provider, ToolSettings settings, CancellationToken cancellationToken)
    {
        var backup = Backup.TodaysBackup(settings);
        if (backup is null)
        {
            Console.Error.WriteLine($"Refused: no backup of {settings.DatabaseName} taken today in {settings.BackupDirectory}. Run --backup first.");
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
        Planning.Print(result.Before);

        switch (result.Outcome)
        {
            case ApplyOutcome.Refused:
                Console.Error.WriteLine("Refused: the plan has STOP conditions. Nothing was changed.");
                return 1;
            case ApplyOutcome.NothingToDo:
                Console.WriteLine("Nothing to apply: the catalogue already reflects every decision. Nothing was changed.");
                return 0;
            case ApplyOutcome.RolledBack:
                Console.Error.WriteLine("Rolled back: after the steps the plan was not empty — the migration would not be idempotent.");
                Planning.Print(result.After!);
                return 1;
        }

        Report.Heading("Applied");
        foreach (var step in result.Before.Steps)
        {
            Console.WriteLine($"  done: {step}");
        }

        Console.WriteLine(result.MaterializedViews.Count == 0
            ? "  No materialized view exists and no table stores an object's name, so nothing derived needed rebuilding."
            : $"  Refreshed materialized views: {string.Join(", ", result.MaterializedViews)}");
        Console.WriteLine();
        Console.WriteLine($"Committed {result.Before.Steps.Count} change(s). The plan read back inside the transaction had "
            + $"nothing left to do. Catalogue: {result.After!.Locations.Count} objects, {result.After.Aliases.Count} aliases.");
        return 0;
    }

    /// <summary>Lock, plan, apply, plan again, commit — or write nothing at all.</summary>
    internal static async Task<ApplyResult> ExecuteAsync(BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var connection = await Database.OpenAsync(db, cancellationToken);
        var npgsqlTransaction = Database.CurrentTransaction(db)!;

        // Nobody changes the catalogue while it is being changed.
        await ExecuteAsync(connection, npgsqlTransaction,
            """LOCK TABLE "Locations", "LocationAliases" IN SHARE ROW EXCLUSIVE MODE""", cancellationToken);

        var before = await Planning.ReadAsync(db, cancellationToken);
        if (!before.Plan.CanApply || before.Plan.IsEmpty)
        {
            await transaction.RollbackAsync(cancellationToken);
            return new ApplyResult(
                before.Plan.CanApply ? ApplyOutcome.NothingToDo : ApplyOutcome.Refused, before.Plan, null, []);
        }

        var now = DateTime.UtcNow;
        foreach (var step in before.Plan.Steps)
        {
            await ApplyAsync(connection, npgsqlTransaction, step, now, cancellationToken);
        }

        // A4: derived tables are refreshed afterwards. There are none today; if one is added, it is not forgotten.
        foreach (var view in before.References.MaterializedViews)
        {
            await ExecuteAsync(connection, npgsqlTransaction, $"REFRESH MATERIALIZED VIEW {view}", cancellationToken);
        }

        db.ChangeTracker.Clear();
        var after = await Planning.ReadAsync(db, cancellationToken);
        if (!after.Plan.IsEmpty || !after.Plan.CanApply)
        {
            await transaction.RollbackAsync(cancellationToken);
            return new ApplyResult(ApplyOutcome.RolledBack, before.Plan, after.Plan, before.References.MaterializedViews);
        }

        await transaction.CommitAsync(cancellationToken);
        db.ChangeTracker.Clear();
        return new ApplyResult(ApplyOutcome.Applied, before.Plan, after.Plan, before.References.MaterializedViews);
    }

    private static async Task ApplyAsync(
        NpgsqlConnection connection, NpgsqlTransaction transaction, PlanStep step, DateTime now, CancellationToken cancellationToken)
    {
        switch (step.Kind)
        {
            case StepKind.DeleteLocation:
                await ExpectOneAsync(connection, transaction,
                    """DELETE FROM "Locations" WHERE "Id" = @id AND "Code" = @code AND "Name" = @name""",
                    [("id", step.LocationId!.Value), ("code", step.Code), ("name", step.From!)],
                    step, cancellationToken);
                break;

            case StepKind.RenameLocation:
            {
                var renamed = new Location(step.Code, step.To);
                await ExpectOneAsync(connection, transaction,
                    """
                    UPDATE "Locations" SET "Name" = @name, "NormalizedName" = @normalized, "UpdatedAtUtc" = @now
                    WHERE "Id" = @id AND "Code" = @code AND "Name" = @from
                    """,
                    [("name", renamed.Name), ("normalized", renamed.NormalizedName), ("now", now),
                        ("id", step.LocationId!.Value), ("code", step.Code), ("from", step.From!)],
                    step, cancellationToken);
                break;
            }

            case StepKind.InsertLocation:
            {
                var inserted = new Location(step.Code, step.To);

                // The next number in the application's own sequence, drawn the way the application draws it, so the
                // code generator will never hand the same code to another object.
                await using (var next = new NpgsqlCommand("""SELECT nextval('"LocationCodeNumbers"')""", connection, transaction))
                {
                    var number = (long)(await next.ExecuteScalarAsync(cancellationToken))!;
                    if (LocationCode.FromNumber(number) != inserted.Code)
                    {
                        throw new InvalidOperationException(
                            $"The sequence issued {LocationCode.FromNumber(number)}, not {inserted.Code}. Rolled back.");
                    }
                }

                await ExpectOneAsync(connection, transaction,
                    """
                    INSERT INTO "Locations" ("Code", "Name", "NormalizedName", "IsActive", "CreatedAtUtc", "UpdatedAtUtc")
                    VALUES (@code, @name, @normalized, TRUE, @now, @now)
                    """,
                    [("code", inserted.Code), ("name", inserted.Name), ("normalized", inserted.NormalizedName), ("now", now)],
                    step, cancellationToken);
                break;
            }

            case StepKind.AddAlias:
            {
                var (id, name, active) = await TargetAsync(connection, transaction, step.Code, cancellationToken);
                var target = new Location(step.Code, name);
                if (!active)
                {
                    target.Deactivate();
                }

                // Built through the domain, so its rules — not on an inactive object, never equal to the name —
                // are the ones enforced here.
                var alias = new LocationAlias(target, step.To);
                await ExpectOneAsync(connection, transaction,
                    """
                    INSERT INTO "LocationAliases" ("LocationId", "Alias", "NormalizedAlias", "CreatedAtUtc")
                    VALUES (@location, @alias, @normalized, @now)
                    """,
                    [("location", id), ("alias", alias.Alias), ("normalized", alias.NormalizedAlias), ("now", now)],
                    step, cancellationToken);
                break;
            }

            default:
                throw new InvalidOperationException($"Unknown step {step.Kind}.");
        }
    }

    private static async Task<(int Id, string Name, bool IsActive)> TargetAsync(
        NpgsqlConnection connection, NpgsqlTransaction transaction, string code, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(
            """SELECT "Id", "Name", "IsActive" FROM "Locations" WHERE "Code" = @code""", connection, transaction);
        command.Parameters.AddWithValue("code", code);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException($"{code} disappeared during the migration. Rolled back.");
        }

        return (reader.GetInt32(0), reader.GetString(1), reader.GetBoolean(2));
    }

    private static async Task ExpectOneAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        string sql,
        IReadOnlyList<(string Name, object Value)> parameters,
        PlanStep step,
        CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        foreach (var (name, value) in parameters)
        {
            command.Parameters.AddWithValue(name, value);
        }

        var rows = await command.ExecuteNonQueryAsync(cancellationToken);
        if (rows != 1)
        {
            throw new InvalidOperationException($"'{step}' touched {rows} rows instead of one. Rolled back.");
        }
    }

    private static async Task ExecuteAsync(
        NpgsqlConnection connection, NpgsqlTransaction transaction, string sql, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(sql, connection, transaction);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
