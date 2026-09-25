using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.ProductMatchMigration;

/// <summary>What the database holds, as far as this migration is concerned.</summary>
/// <param name="Known">Every migration the code has, oldest first.</param>
/// <param name="Applied">Every migration the database records as applied, oldest first.</param>
/// <param name="TableExists">Whether <c>ProductMatchDecisions</c> is there.</param>
/// <param name="DecisionCount">How many rows it holds; null when it is not there.</param>
public sealed record MigrationState(
    IReadOnlyList<string> Known,
    IReadOnlyList<string> Applied,
    bool TableExists,
    int? DecisionCount)
{
    public const string TableName = "ProductMatchDecisions";

    // Asked of the catalogue rather than by querying the table, so a missing table is an answer, not an error.
    private const string TableExistsSql =
        "SELECT to_regclass('public.\"" + TableName + "\"') IS NOT NULL AS \"Value\"";

    public static async Task<MigrationState> ReadAsync(BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);

        var known = db.Database.GetMigrations().ToList();
        var applied = (await db.Database.GetAppliedMigrationsAsync(cancellationToken)).ToList();
        var exists = (await db.Database.SqlQueryRaw<bool>(TableExistsSql).ToListAsync(cancellationToken)).Single();

        int? rows = exists ? await db.ProductMatchDecisions.CountAsync(cancellationToken) : null;
        return new MigrationState(known, applied, exists, rows);
    }
}

/// <summary>
/// The whole plan of this tool: apply <see cref="Target"/> and nothing else — or, when that cannot be done safely,
/// say why and change nothing.
/// </summary>
/// <param name="Pending">Migrations the code has and the database has not, oldest first.</param>
/// <param name="Stops">Every reason not to apply. Empty when the plan is safe.</param>
public sealed record MigrationPlan(IReadOnlyList<string> Pending, IReadOnlyList<string> Stops)
{
    /// <summary>The one migration Task 13a may apply.</summary>
    public const string Target = "20260925120000_AddProductMatchDecisions";

    /// <summary>The migration the database stood at before Task 13a.</summary>
    public const string Previous = "20260923124150_AddOrderItemPricingDecisions";

    /// <summary>Nothing to apply and nothing wrong: the migration is already in.</summary>
    public bool IsDone => Stops.Count == 0 && Pending.Count == 0;

    /// <summary>Exactly the one migration is pending and nothing stands in its way.</summary>
    public bool CanApply => Stops.Count == 0 && Pending.Count == 1 && Pending[0] == Target;

    public static MigrationPlan Of(MigrationState state)
    {
        ArgumentNullException.ThrowIfNull(state);

        var known = state.Known.ToHashSet(StringComparer.Ordinal);
        var applied = state.Applied.ToHashSet(StringComparer.Ordinal);
        var pending = state.Known.Where(migration => !applied.Contains(migration)).ToList();
        var stops = new List<string>();

        if (!known.Contains(Target))
        {
            stops.Add($"The code does not contain the migration {Target}.");
        }

        foreach (var unknown in state.Applied.Where(migration => !known.Contains(migration)))
        {
            stops.Add($"The database has the migration {unknown} applied, which this code does not know.");
        }

        foreach (var other in pending.Where(migration => migration != Target))
        {
            stops.Add($"The migration {other} is pending too. Only {Target} may be applied by this tool.");
        }

        if (pending.Contains(Target) && state.TableExists)
        {
            stops.Add($"{MigrationState.TableName} already exists although {Target} is pending. Something other than this migration created it.");
        }

        if (applied.Contains(Target) && !state.TableExists)
        {
            stops.Add($"{Target} is recorded as applied, but {MigrationState.TableName} does not exist.");
        }

        return new MigrationPlan(pending, stops);
    }

    public void Print()
    {
        Report.Heading("Plan");
        Console.WriteLine(Pending.Count == 0
            ? "  Pending migrations: none."
            : $"  Pending migrations: {string.Join(", ", Pending)}");

        if (Stops.Count == 0)
        {
            Console.WriteLine(IsDone
                ? "  Nothing to apply: the migration is already in the database."
                : $"  Apply {Target}: create the empty table {MigrationState.TableName}. No row of any table is written.");
        }
        else
        {
            foreach (var stop in Stops)
            {
                Console.WriteLine($"  STOP: {stop}");
            }
        }

        Console.WriteLine();
    }
}
