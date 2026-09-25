using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.ImportPricingMigration;

/// <summary>What the database holds, as far as this migration is concerned.</summary>
/// <param name="Known">Every migration the code has, oldest first.</param>
/// <param name="Applied">Every migration the database records as applied, oldest first.</param>
/// <param name="PresentColumns">Which of <see cref="Columns"/> the <c>ImportRows</c> table has.</param>
/// <param name="ClassifiedRows">
/// How many staged rows hold anything in one of the four columns; null unless all four exist.
/// </param>
public sealed record MigrationState(
    IReadOnlyList<string> Known,
    IReadOnlyList<string> Applied,
    IReadOnlyList<string> PresentColumns,
    int? ClassifiedRows)
{
    public const string TableName = "ImportRows";

    /// <summary>The four columns the migration adds, in the order the snapshot lists them.</summary>
    public static readonly IReadOnlyList<string> Columns =
    [
        "PricingClassification",
        "PricingClassifiedAtUtc",
        "PricingClassifiedByDisplayName",
        "PricingClassifiedByUserId",
    ];

    // Asked of information_schema rather than by selecting them, so a missing column is an answer, not an error.
    private const string PresentColumnsSql =
        "SELECT column_name::text AS \"Value\" FROM information_schema.columns "
        + "WHERE table_schema = 'public' AND table_name = 'ImportRows' "
        + "AND column_name IN ('PricingClassification', 'PricingClassifiedAtUtc', 'PricingClassifiedByDisplayName', 'PricingClassifiedByUserId')";

    public bool ColumnsExist => Columns.All(PresentColumns.Contains);

    public bool AnyColumnExists => PresentColumns.Count > 0;

    public static async Task<MigrationState> ReadAsync(BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);

        var known = db.Database.GetMigrations().ToList();
        var applied = (await db.Database.GetAppliedMigrationsAsync(cancellationToken)).ToList();
        var present = (await db.Database.SqlQueryRaw<string>(PresentColumnsSql).ToListAsync(cancellationToken))
            .OrderBy(column => column, StringComparer.Ordinal)
            .ToList();

        int? classified = Columns.All(present.Contains)
            ? await db.ImportRows.CountAsync(row =>
                row.PricingClassification != null
                || row.PricingClassifiedByUserId != null
                || row.PricingClassifiedByDisplayName != null
                || row.PricingClassifiedAtUtc != null, cancellationToken)
            : null;

        return new MigrationState(known, applied, present, classified);
    }

    public string DescribeColumns() =>
        ColumnsExist
            ? $"all four exist; {ClassifiedRows} row(s) hold a value in them"
            : AnyColumnExists
                ? $"only {string.Join(", ", PresentColumns)} exist"
                : "none of the four exists";
}

/// <summary>
/// The whole plan of this tool: apply <see cref="Target"/> and nothing else — or, when that cannot be done safely,
/// say why and change nothing.
/// </summary>
/// <param name="Pending">Migrations the code has and the database has not, oldest first.</param>
/// <param name="Stops">Every reason not to apply. Empty when the plan is safe.</param>
public sealed record MigrationPlan(IReadOnlyList<string> Pending, IReadOnlyList<string> Stops)
{
    /// <summary>The one migration Task 16a may apply.</summary>
    public const string Target = "20260925180000_AddImportRowPricingClassification";

    /// <summary>The migration the database stood at before Task 16a.</summary>
    public const string Previous = "20260925120000_AddProductMatchDecisions";

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

        if (pending.Contains(Target) && state.AnyColumnExists)
        {
            stops.Add(
                $"{MigrationState.TableName} already has {string.Join(", ", state.PresentColumns)} although {Target} is pending. "
                + "Something other than this migration added them.");
        }

        if (applied.Contains(Target) && !state.ColumnsExist)
        {
            stops.Add($"{Target} is recorded as applied, but {MigrationState.TableName} lacks some of its four columns ({state.DescribeColumns()}).");
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
                : $"  Apply {Target}: add four nullable columns and two checks to {MigrationState.TableName}. No row of any table is written.");
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
