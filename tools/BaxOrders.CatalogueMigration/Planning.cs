using BaxOrders.Application.Imports.Matching;
using BaxOrders.Infrastructure.Persistence;

namespace BaxOrders.CatalogueMigration;

/// <summary>The catalogue as it is, what refers to it, and the plan that follows — read the same way by every command.</summary>
internal sealed record Planning(CatalogueState State, LocationReferences References, CataloguePlan Plan)
{
    public static async Task<Planning> ReadAsync(BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        var state = await CatalogueState.ReadAsync(db, cancellationToken);
        var references = await ReferenceScan.ScanAsync(
            db,
            state.Locations.Select(location => location.Id).ToArray(),
            state.Locations.Select(location => location.NormalizedName).ToArray(),
            cancellationToken);

        var byLocation = state.Locations.ToDictionary(
            location => location.Id,
            location => (IReadOnlyList<string>)
            [
                .. references.ReferencesTo(location.Id).Select(found => $"{found.Column}: {found.Rows} rows"),
                .. references.ReferencesToName(location.NormalizedName).Select(found => $"{found.Source} (by name): {found.Rows} rows"),
            ]);

        return new Planning(state, references, CataloguePlanner.Plan(state, byLocation));
    }

    public void Print() => Print(Plan);

    public static void Print(CataloguePlan plan)
    {
        Report.Heading($"Plan — {plan.Steps.Count} change(s)");
        if (plan.IsEmpty)
        {
            Console.WriteLine("  Nothing to change: the catalogue already reflects every decision.");
        }

        foreach (var step in plan.Steps)
        {
            Console.WriteLine($"  {step}");
        }

        Console.WriteLine();
        Report.Heading($"Decisions that need no change — {plan.Notes.Count}");
        foreach (var note in plan.Notes)
        {
            Console.WriteLine($"  {note}");
        }

        Console.WriteLine();
        Report.Heading($"STOP conditions — {plan.Stops.Count}");
        if (plan.Stops.Count == 0)
        {
            Console.WriteLine("  None: nothing refers to an object to delete, every code carries the expected name, no alias");
            Console.WriteLine("  collides, any insert takes the next code in the sequence, and the result is the owner's 27 objects.");
        }

        foreach (var stop in plan.Stops)
        {
            Console.WriteLine($"  STOP: {stop}");
        }

        Console.WriteLine();
    }

    /// <summary>Where each owner-list spelling lands, through a given lookup.</summary>
    public static void PrintSpellings(NameIndex<int> index, IEnumerable<CatalogueLocation> locations, out bool allResolve)
    {
        var byId = locations.ToDictionary(location => location.Id);
        allResolve = true;
        foreach (var spelling in CatalogueDecisions.Renames.Select(rename => new SpellingDecision(rename.From, rename.Code, "previous name"))
                     .Concat(CatalogueDecisions.Spellings))
        {
            var match = index.Resolve(spelling.Spelling);
            var target = match.Kind == MatchKind.Matched ? byId.GetValueOrDefault(match.Id!.Value) : null;
            var ok = target is not null && target.Code == spelling.Code;
            allResolve &= ok;
            var landed = target is null ? match.Kind.ToString().ToUpperInvariant() : $"{target.Code} {target.Name}";
            Console.WriteLine($"  {spelling.Spelling,-36} → {landed,-60} [{(ok ? "ok" : $"EXPECTED {spelling.Code}")}]");
        }
    }
}
