using BaxOrders.Application.Imports.Matching;
using BaxOrders.Application.Imports.Reading;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace BaxOrders.CatalogueMigration;

/// <summary>
/// A1, read-only: every reference to the objects the owner asked to delete, the aliases that exist, and how the
/// importer turns a block name into an object.
/// </summary>
internal static class Inspection
{
    public static async Task<int> RunAsync(IServiceProvider provider, CancellationToken cancellationToken)
    {
        var db = Program.Db(provider);
        var state = await CatalogueState.ReadAsync(db, cancellationToken);

        await CatalogueAsync(db, state, cancellationToken);
        Sequence(state);

        var targets = CatalogueDecisions.Deletions
            .Select(deletion => (Deletion: deletion, Location: state.ByCode(deletion.Code)))
            .ToList();
        var targetIds = targets.Where(target => target.Location is not null).Select(target => target.Location!.Id).ToArray();
        var targetNames = targets.Where(target => target.Location is not null)
            .Select(target => target.Location!.NormalizedName).ToArray();

        var references = await ReferenceScan.ScanAsync(db, state.Locations.Select(location => location.Id).ToArray(), targetNames, cancellationToken);
        ReferenceColumns(references, state);
        await DeletionTargetsAsync(db, targets, references, cancellationToken);
        Derived(references);
        Aliases(state);
        await ImportMappingAsync(provider, db, state, cancellationToken);
        await PricingAuditAsync(db, cancellationToken);

        Console.WriteLine("Nothing was changed.");
        return 0;
    }

    private static async Task CatalogueAsync(BaxOrdersDbContext db, CatalogueState state, CancellationToken cancellationToken)
    {
        var orders = await db.OrderRequests.AsNoTracking()
            .GroupBy(request => request.LocationId)
            .Select(group => new
            {
                LocationId = group.Key,
                Requests = group.Count(),
                First = group.Min(request => request.RequestPeriod),
                Last = group.Max(request => request.RequestPeriod),
            })
            .ToDictionaryAsync(row => row.LocationId, cancellationToken);

        Report.Heading($"Catalogue — {state.Locations.Count} objects ({state.Locations.Count(location => location.IsActive)} active, "
            + $"{orders.Count} with order history)");
        Console.WriteLine($"  {"Id",4}  {"Code",-12} {"Active",-6} {"Orders",6}  {"First",-8} {"Last",-8}  Name");
        foreach (var location in state.Locations.OrderBy(location => location.Code, StringComparer.Ordinal))
        {
            var found = orders.GetValueOrDefault(location.Id);
            Console.WriteLine(
                $"  {location.Id,4}  {location.Code,-12} {(location.IsActive ? "yes" : "NO"),-6} {found?.Requests ?? 0,6}  "
                + $"{Report.Month(found?.First),-8} {Report.Month(found?.Last),-8}  {location.Name}");
        }

        Console.WriteLine();
    }

    private static void Sequence(CatalogueState state)
    {
        Report.Heading("Location code sequence");
        Console.WriteLine($"  LocationCodeNumbers: last_value {state.SequenceLastValue}, is_called {state.SequenceIsCalled} "
            + $"→ next number {state.NextSequenceNumber}");
        Console.WriteLine($"  Highest issued LOC code: LOC-{state.HighestIssuedCodeNumber:D6}");
        Console.WriteLine();
    }

    private static void ReferenceColumns(LocationReferences references, CatalogueState state)
    {
        Report.Heading("Every column that holds a location id");
        foreach (var column in references.Columns)
        {
            var counts = references.ById[column];
            var guard = column.ForeignKey is null ? "no foreign key" : $"FK {column.ForeignKey}, ON DELETE {column.OnDelete}";
            Console.WriteLine($"  {column,-42} {guard,-60} {counts.Values.Sum(),6} rows over {counts.Count} objects");
        }

        var unreferenced = state.Locations.Where(location => references.RowsReferencing(location.Id) == 0).ToList();
        Console.WriteLine($"  Objects nothing refers to by id: {Report.Names(unreferenced)}");
        Console.WriteLine();
    }

    private static async Task DeletionTargetsAsync(
        BaxOrdersDbContext db,
        IReadOnlyList<(DeletionDecision Deletion, CatalogueLocation? Location)> targets,
        LocationReferences references,
        CancellationToken cancellationToken)
    {
        Report.Heading("Objects the owner asked to delete — every referencing row");
        var connection = await Database.OpenAsync(db, cancellationToken);

        foreach (var (deletion, location) in targets)
        {
            if (location is null)
            {
                Console.WriteLine($"  {deletion.Code} ({deletion.Name}): not in the catalogue.");
                continue;
            }

            Console.WriteLine($"  {location.Code} — {location.Name} (id {location.Id}, active {location.IsActive})");
            foreach (var column in references.Columns)
            {
                var rows = references.ById[column].GetValueOrDefault(location.Id);
                Console.Write($"    {column,-42} {rows,6}");
                if (rows > 0)
                {
                    await using var ids = new NpgsqlCommand(
                        $"SELECT \"Id\"::text FROM {Database.Quote(column.Table)} WHERE {Database.Quote(column.Column)} = @id ORDER BY 1 LIMIT 50",
                        connection);
                    ids.Parameters.AddWithValue("id", location.Id);
                    var found = new List<string>();
                    await using var reader = await ids.ExecuteReaderAsync(cancellationToken);
                    while (await reader.ReadAsync(cancellationToken))
                    {
                        found.Add(reader.GetString(0));
                    }

                    Console.Write($"  ids: {string.Join(", ", found)}");
                }

                Console.WriteLine();
            }

            var byName = references.ReferencesToName(location.NormalizedName).ToList();
            Console.WriteLine(byName.Count == 0
                ? "    by name (staged rows, batch decisions, corrections): 0"
                : $"    by name: {string.Join("; ", byName.Select(reference => $"{reference.Source} {reference.Rows}"))}");
        }

        Console.WriteLine();
    }

    private static void Derived(LocationReferences references)
    {
        Report.Heading("Materialized and derived tables");
        Console.WriteLine($"  Materialized views: {(references.MaterializedViews.Count == 0 ? "none" : string.Join(", ", references.MaterializedViews))}");
        Console.WriteLine($"  Views: {(references.Views.Count == 0 ? "none" : string.Join(", ", references.Views))}");
        Console.WriteLine("  No table stores a location's name: every screen joins Locations by id, so a rename is read "
            + "everywhere at once and there is nothing to rebuild.");
        Console.WriteLine();
    }

    private static void Aliases(CatalogueState state)
    {
        Report.Heading($"Location aliases — {state.Aliases.Count}");
        foreach (var alias in state.Aliases.OrderBy(alias => alias.Id))
        {
            var owner = state.ById(alias.LocationId);
            Console.WriteLine($"  #{alias.Id,-4} {alias.Alias,-34} → {owner?.Code,-12} {owner?.Name}");
        }

        Console.WriteLine();
    }

    private static async Task ImportMappingAsync(
        IServiceProvider provider, BaxOrdersDbContext db, CatalogueState state, CancellationToken cancellationToken)
    {
        Report.Heading("How the importer recognises an object");
        Console.WriteLine("  Each row's 'Obyekt' cell is normalized by TextNormalizer (NFKC, case-folded, I/İ/ı → i, spacing");
        Console.WriteLine("  around punctuation removed) and looked up in one NameIndex holding the normalized names of the");
        Console.WriteLine("  ACTIVE locations and the aliases of the ACTIVE locations (ImportCatalogLoader). Exact match only;");
        Console.WriteLine("  a key that points at two locations is Ambiguous and selects nothing. A batch's own review");
        Console.WriteLine("  decisions (ImportResolutions) are consulted first, but belong to that batch only; a GlobalAlias");
        Console.WriteLine("  decision also writes a LocationAlias. No code, no sheet name and no fuzzy match is involved.");
        Console.WriteLine();

        var batches = await db.ImportBatches.AsNoTracking()
            .Where(batch => batch.OriginalFileName == ImportMappingProof.WorkbookFileName)
            .OrderBy(batch => batch.Id)
            .Select(batch => new
            {
                batch.Id,
                batch.Status,
                batch.TotalRows,
                Materialized = db.ImportMaterializations.Any(materialization => materialization.ImportBatchId == batch.Id),
            })
            .ToListAsync(cancellationToken);

        Report.Heading($"Batches of {ImportMappingProof.WorkbookFileName}");
        foreach (var batch in batches)
        {
            Console.WriteLine($"  #{batch.Id}  {batch.Status,-14} {batch.TotalRows,6} rows  materialized {batch.Materialized}");
        }

        var batchId = await ImportMappingProof.FindBatchAsync(db, cancellationToken);
        if (batchId is null)
        {
            Console.WriteLine("  No materialized batch of this workbook was found.");
            Console.WriteLine();
            return;
        }

        var recorded = await ImportMappingProof.RecordedAsync(db, batchId.Value, cancellationToken);
        var rowCounts = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId)
            .GroupBy(row => row.OriginalLocationName ?? string.Empty)
            .Select(group => new { Name = group.Key, Rows = group.Count() })
            .ToDictionaryAsync(row => row.Name, row => row.Rows, cancellationToken);

        Console.WriteLine();
        Report.Heading($"Batch #{batchId}: block name → recorded location");
        foreach (var name in rowCounts.Keys.Order(Application.Common.AzerbaijaniCollation.Comparer))
        {
            var ids = recorded.GetValueOrDefault(name) ?? [];
            var targets = ids.Count == 0 ? "(unmatched)" : string.Join(", ", ids.Select(id => $"{state.ById(id)?.Code} {state.ById(id)?.Name}"));
            Console.WriteLine($"  {name,-44} {rowCounts[name],5} rows → {targets}");
        }

        var resolutions = await db.ImportResolutions.AsNoTracking()
            .Where(resolution => resolution.Kind == ImportResolutionKind.Location)
            .OrderBy(resolution => resolution.ImportBatchId).ThenBy(resolution => resolution.Id)
            .Select(resolution => new { resolution.ImportBatchId, resolution.SourceKey, resolution.Scope, resolution.Action, resolution.LocationId })
            .ToListAsync(cancellationToken);

        Console.WriteLine();
        Report.Heading($"Location review decisions (all batches) — {resolutions.Count}");
        foreach (var resolution in resolutions)
        {
            var target = resolution.LocationId is { } id ? $"{state.ById(id)?.Code} {state.ById(id)?.Name}" : "—";
            Console.WriteLine($"  batch #{resolution.ImportBatchId,-6} {resolution.SourceKey,-40} {resolution.Scope,-11} {resolution.Action,-11} → {target}");
        }

        var workbookPath = ImportMappingProof.WorkbookPath(Program.RepositoryRoot());
        Console.WriteLine();
        Report.Heading("The same workbook, read and matched again against today's catalogue (nothing staged)");
        if (!File.Exists(workbookPath))
        {
            Console.WriteLine($"  Workbook not found: {workbookPath}");
            Console.WriteLine();
            return;
        }

        var blocks = ImportMappingProof.ReadBlockNames(provider.GetRequiredService<IExcelWorkbookReader>(), workbookPath);
        var live = await ImportMappingProof.LiveIndexAsync(provider.GetRequiredService<ImportCatalogLoader>(), cancellationToken);
        Report.Blocks(ImportMappingProof.Map(blocks, recorded, live), state);
        Console.WriteLine();
    }

    /// <summary>HD-002, read only: the 94 reclassified lines are shown so nobody has to take their count on trust.</summary>
    private static async Task PricingAuditAsync(BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        var decisions = await db.OrderItemPricingDecisions.AsNoTracking()
            .GroupBy(decision => new { decision.PreviousMode, decision.NewMode, decision.ActorDisplayName })
            .Select(group => new
            {
                group.Key.PreviousMode,
                group.Key.NewMode,
                group.Key.ActorDisplayName,
                Count = group.Count(),
                First = group.Min(decision => decision.OccurredAtUtc),
                Last = group.Max(decision => decision.OccurredAtUtc),
            })
            .ToListAsync(cancellationToken);

        Report.Heading("Pricing classification decisions (HD-002 — read only, never changed by this tool)");
        foreach (var row in decisions)
        {
            Console.WriteLine($"  {row.PreviousMode} → {row.NewMode}  {row.Count} records by {row.ActorDisplayName}, "
                + $"{row.First:yyyy-MM-dd HH:mm:ss}–{row.Last:HH:mm:ss} UTC");
        }

        var modes = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.UnitPrice == null)
            .GroupBy(item => item.PricingMode)
            .Select(group => new { Mode = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);
        Console.WriteLine($"  Unpriced lines by mode: {string.Join(", ", modes.OrderBy(row => row.Mode).Select(row => $"{row.Mode} {row.Count}"))}");
        Console.WriteLine();
    }
}

/// <summary>Formatting shared by the commands, so the five outputs read alike.</summary>
internal static class Report
{
    public static void Heading(string text)
    {
        Console.WriteLine($"== {text} ==");
    }

    public static string Month(DateOnly? period) => period?.ToString("yyyy-MM", System.Globalization.CultureInfo.InvariantCulture) ?? "—";

    public static string Names(IEnumerable<CatalogueLocation> locations)
    {
        var list = locations.Select(location => $"{location.Code} {location.Name}").ToList();
        return list.Count == 0 ? "none" : string.Join(", ", list);
    }

    public static void Blocks(IReadOnlyList<BlockMapping> blocks, CatalogueState state)
    {
        string Target(int id) => $"{id} {state.ById(id)?.Code} {state.ById(id)?.Name}";

        foreach (var block in blocks)
        {
            var before = block.RecordedLocationIds.Count == 0 ? "(not in batch)" : string.Join(" / ", block.RecordedLocationIds.Select(Target));
            var now = block.Resolved.Kind switch
            {
                MatchKind.Matched => Target(block.Resolved.Id!.Value),
                MatchKind.Ambiguous => $"AMBIGUOUS {string.Join(" / ", block.Resolved.Candidates.Select(Target))}",
                var kind => kind.ToString().ToUpperInvariant(),
            };
            var verdict = block.IsUnchanged ? "same" : "DIFFERENT";
            Console.WriteLine($"  {block.BlockName,-44} {block.WorkbookRows,5} rows  before: {before}");
            Console.WriteLine($"  {string.Empty,-44} {string.Empty,5}       now:    {now}   [{verdict}]");
        }

        var unchanged = blocks.Count(block => block.IsUnchanged);
        Console.WriteLine($"  {unchanged} of {blocks.Count} block names map to the same location id as the batch recorded.");
    }
}
