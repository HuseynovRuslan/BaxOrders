using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Matching;
using BaxOrders.Application.Imports.Reading;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Reports;
using BaxOrders.Domain.Normalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.CatalogueMigration;

/// <summary>
/// Read-only: the catalogue, the aliases, the counts every screen shows, the import mapping and the figures that
/// must not have moved. Each check says what it compared; the command fails if any of them does.
/// </summary>
internal static class Verification
{
    /// <summary>Sentyabr 2026, the month the specification's expected partitions are for.</summary>
    private static readonly DateOnly September = new(2026, 9, 1);

    public static async Task<int> RunAsync(IServiceProvider provider, ToolSettings settings, CancellationToken cancellationToken)
    {
        var db = Program.Db(provider);
        var checks = new List<(string Name, bool Passed, string Detail)>();
        void Check(string name, bool passed, string detail) => checks.Add((name, passed, detail));

        // ---- the catalogue ----------------------------------------------------------------------------------
        var planning = await Planning.ReadAsync(db, cancellationToken);
        var state = planning.State;
        var names = state.Locations.Select(location => location.Name).OrderByName(name => name).ToList();

        Check("Catalogue is the owner's 27 objects, in the B6 order",
            names.SequenceEqual(CatalogueDecisions.ExpectedCatalogue, StringComparer.Ordinal),
            $"{names.Count} objects: {string.Join(", ", names)}");
        Check("Every object is active (Puşkin parkı kept active)",
            state.Locations.All(location => location.IsActive),
            $"inactive: {Report.Names(state.Locations.Where(location => !location.IsActive))}");
        Check("Maştağa, Ramana, Əmircan are gone",
            CatalogueDecisions.Deletions.All(deletion => state.ByCode(deletion.Code) is null),
            string.Join(", ", CatalogueDecisions.Deletions.Select(deletion => $"{deletion.Code}: {(state.ByCode(deletion.Code) is null ? "absent" : "PRESENT")}")));
        Check("Çadır exists as LOC-000047",
            state.ByCode("LOC-000047")?.Name == "Çadır",
            $"LOC-000047 = '{state.ByCode("LOC-000047")?.Name}'");
        Check("The six renames are applied, by code",
            CatalogueDecisions.Renames.All(rename => state.ByCode(rename.Code)?.Name == rename.To),
            string.Join("; ", CatalogueDecisions.Renames.Select(rename => $"{rename.Code} = '{state.ByCode(rename.Code)?.Name}'")));
        Check("A second run of the migration changes nothing",
            planning.Plan.IsEmpty && planning.Plan.CanApply,
            $"{planning.Plan.Steps.Count} step(s), {planning.Plan.Stops.Count} STOP(s)");

        // ---- aliases ----------------------------------------------------------------------------------------
        var baselinePath = Invariants.BaselinePath(settings);
        var baselineAliases = File.Exists(baselinePath)
            ? (await File.ReadAllLinesAsync(baselinePath, cancellationToken))
                .Where(line => line.StartsWith("# alias\t", StringComparison.Ordinal))
                .Select(line => line.Split('\t'))
                .Select(parts => (Normalized: parts[1], Code: parts[2], Alias: parts[3]))
                .ToList()
            : [];

        var current = state.Aliases.ToDictionary(alias => alias.NormalizedAlias, alias => (Code: state.ById(alias.LocationId)?.Code, alias.Alias), StringComparer.Ordinal);
        var lost = baselineAliases.Where(alias => current.GetValueOrDefault(alias.Normalized).Code != alias.Code).ToList();
        Check($"Every one of the {baselineAliases.Count} aliases that existed before is still there, on the same object",
            baselineAliases.Count > 0 && lost.Count == 0,
            lost.Count == 0 ? "none lost or moved" : $"lost or moved: {string.Join(", ", lost.Select(alias => alias.Alias))}");

        var allowed = CatalogueDecisions.Renames.Select(rename => (Spelling: rename.From, rename.Code))
            .Concat(CatalogueDecisions.Spellings.Select(spelling => (spelling.Spelling, spelling.Code)))
            .ToDictionary(entry => TextNormalizer.Normalize(entry.Spelling), entry => entry.Code, StringComparer.Ordinal);
        var added = current.Where(alias => baselineAliases.All(before => before.Normalized != alias.Key)).ToList();
        var unexpected = added.Where(alias => allowed.GetValueOrDefault(alias.Key) != alias.Value.Code).ToList();
        Check("Only the aliases the approved rename and import rules require were added",
            unexpected.Count == 0,
            $"added {added.Count}: {string.Join(", ", added.Select(alias => $"'{alias.Value.Alias}' → {alias.Value.Code}"))}"
            + (unexpected.Count == 0 ? string.Empty : $"; NOT APPROVED: {string.Join(", ", unexpected.Select(alias => alias.Value.Alias))}"));

        // ---- the same count on every screen -----------------------------------------------------------------
        var list = await provider.GetRequiredService<LocationOrderQueries>().ListAsync(new LocationOrderListQuery(), cancellationToken);
        Check("Obyektlər: Obyekt 27 · Sifarişi olan 26",
            list.LocationCount == 27 && list.LocationsWithOrders == 26,
            $"Obyekt {list.LocationCount} · Sifarişi olan {list.LocationsWithOrders}");

        var report = await provider.GetRequiredService<MonthlyReportQueries>().GetAsync(new MonthlyReportQuery(2026), cancellationToken);
        Check("Aylıq hesabat 2026: Obyekt 27, Çadır one row",
            report.LocationCount == 27 && report.Rows.Count(row => row.LocationName == "Çadır") == 1,
            $"Obyekt {report.LocationCount}, rows {report.Rows.Count}");

        var dashboard = provider.GetRequiredService<ManagementDashboardQueries>();
        foreach (var basis in new[]
                 {
                     AnalyticsComparisonBasis.PreviousMonth,
                     AnalyticsComparisonBasis.Previous3MonthAverage,
                     AnalyticsComparisonBasis.Previous6MonthAverage,
                     AnalyticsComparisonBasis.AllPriorMonths,
                 })
        {
            var result = await dashboard.GetAsync(
                September, new DashboardQuery(basis, PageSize: ManagementDashboardQueries.MaxPageSize), cancellationToken);
            var partition = result?.Summary.Partition;
            var expected = basis == AnalyticsComparisonBasis.PreviousMonth ? (23, 1, 2, 1) : (24, 0, 2, 1);
            var actual = partition is null
                ? (-1, -1, -1, -1)
                : (partition.Compared.Count, partition.NoBaseline.Count, partition.NoOrderThisMonth.Count, partition.NoHistory.Count);
            Check($"Panel Sentyabr 2026, {basis}: {expected.Item1} / {expected.Item2} / {expected.Item3} / {expected.Item4} = 27",
                actual == expected && partition!.LocationCount == 27,
                $"compared {actual.Item1} / no baseline {actual.Item2} / no order {actual.Item3} / no history {actual.Item4} = {partition?.LocationCount}");

            if (basis == AnalyticsComparisonBasis.PreviousMonth && result is not null)
            {
                Check("Panel: 27 rows in 'Bütün obyektlər', Çadır among them; the headline reads 24 / 27",
                    result.Rows.TotalCount == 27
                    && result.Rows.Items.Any(row => row.LocationName == "Çadır")
                    && result.Summary.LocationsWithCurrentRequest == 24
                    && result.Summary.LocationCount == 27,
                    $"rows {result.Rows.TotalCount}, headline {result.Summary.LocationsWithCurrentRequest} / {result.Summary.LocationCount}");
                Check("Panel rows are in the Azerbaijani order",
                    result.Rows.Items.Select(row => row.LocationName).SequenceEqual(CatalogueDecisions.ExpectedCatalogue, StringComparer.Ordinal),
                    string.Join(", ", result.Rows.Items.Select(row => row.LocationName)));
            }
        }

        Check("Obyektlər rows are in the Azerbaijani order",
            list.Locations.Items.Select(row => row.Name).SequenceEqual(CatalogueDecisions.ExpectedCatalogue.Take(list.Locations.Items.Count), StringComparer.Ordinal),
            string.Join(", ", list.Locations.Items.Select(row => row.Name)));
        Check("Aylıq hesabat rows are in the Azerbaijani order",
            report.Rows.Select(row => row.LocationName).SequenceEqual(CatalogueDecisions.ExpectedCatalogue, StringComparer.Ordinal),
            string.Join(", ", report.Rows.Select(row => row.LocationName)));

        // ---- A5: the Sentyabr workbook through the importer's own loader ------------------------------------
        var live = await ImportMappingProof.LiveIndexAsync(provider.GetRequiredService<ImportCatalogLoader>(), cancellationToken);
        var workbookPath = ImportMappingProof.WorkbookPath(Program.RepositoryRoot());
        var batchId = await ImportMappingProof.FindBatchAsync(db, cancellationToken);
        if (File.Exists(workbookPath) && batchId is { } batch)
        {
            var blocks = ImportMappingProof.ReadBlockNames(provider.GetRequiredService<IExcelWorkbookReader>(), workbookPath);
            var recorded = await ImportMappingProof.RecordedAsync(db, batch, cancellationToken);
            var mapping = new ImportMappingResult(workbookPath, batch, ImportMappingProof.Map(blocks, recorded, live));
            Report.Heading($"A5: {ImportMappingProof.WorkbookFileName}, batch #{batch}, matched by ImportCatalogLoader (nothing staged)");
            Report.Blocks(mapping.Blocks, state);
            Console.WriteLine();
            Check("A5: every block of the Sentyabr workbook maps to the same location id as batch #" + batch,
                mapping.AllUnchanged,
                $"{mapping.Blocks.Count(block => block.IsUnchanged)} of {mapping.Blocks.Count} block names");
        }
        else
        {
            Check("A5: the Sentyabr workbook and its batch are available", false, workbookPath);
        }

        Report.Heading("Owner-list and previous spellings, through ImportCatalogLoader");
        Planning.PrintSpellings(live, state.Locations, out var spellingsResolve);
        Console.WriteLine();
        Check("Every owner-list and previous spelling resolves to its object", spellingsResolve, "see the list above");

        // ---- MUST NOT CHANGE --------------------------------------------------------------------------------
        if (!File.Exists(baselinePath))
        {
            Check("MUST NOT CHANGE: baseline recorded", false, $"missing: {baselinePath}");
        }
        else
        {
            var before = await Invariants.ReadAsync(baselinePath);
            var after = await Invariants.CaptureAsync(provider, cancellationToken);
            var comparison = Compare(before, after);

            Report.Heading($"MUST NOT CHANGE — {before.Count:N0} figures before, {after.Count:N0} after");
            foreach (var line in comparison.Differences.Take(60))
            {
                Console.WriteLine($"  {line}");
            }

            Console.WriteLine(comparison.Differences.Count == 0 ? "  Every figure is identical." : $"  {comparison.Differences.Count} difference(s).");
            Console.WriteLine();
            KeyFigures(before, after);

            Check("MUST NOT CHANGE: every money amount, count and object-level figure is identical",
                comparison.Differences.Count == 0,
                $"{comparison.Identical:N0} identical, {comparison.Differences.Count} different");
            Check("HD-002: the 94 pricing-classification rows are unchanged",
                before.GetValueOrDefault("pricing.decisions.count") == "94"
                && Same(before, after, "pricing.decisions.count", "pricing.decisions.sha256", "pricing.decisions.lines.sha256"),
                $"count {after.GetValueOrDefault("pricing.decisions.count")}, record hash and line hash "
                + (Same(before, after, "pricing.decisions.sha256", "pricing.decisions.lines.sha256") ? "unchanged" : "CHANGED"));
            Check("Qiymət təsnifatı counters are unchanged",
                Same(before, after, "pricing.total", "pricing.unresolved", "pricing.missingRequiredPrice", "pricing.internalFreeSupply"),
                $"unresolved {after.GetValueOrDefault("pricing.unresolved")}, missing price {after.GetValueOrDefault("pricing.missingRequiredPrice")}, "
                + $"internal supply {after.GetValueOrDefault("pricing.internalFreeSupply")}");
        }

        Report.Heading("Verification");
        foreach (var (name, passed, detail) in checks)
        {
            Console.WriteLine($"  [{(passed ? "PASS" : "FAIL")}] {name}");
            Console.WriteLine($"         {detail}");
        }

        var failed = checks.Count(check => !check.Passed);
        Console.WriteLine();
        Console.WriteLine(failed == 0
            ? $"All {checks.Count} checks passed. Nothing was changed."
            : $"{failed} of {checks.Count} checks FAILED. Nothing was changed.");
        return failed == 0 ? 0 : 1;
    }

    /// <summary>The figures a reader checks first, side by side, out of the tens of thousands compared above.</summary>
    private static void KeyFigures(IReadOnlyDictionary<string, string> before, IReadOnlyDictionary<string, string> after)
    {
        var keys = new List<string>
        {
            "orders.requests", "orders.lines",
            "pricing.unresolved", "pricing.missingRequiredPrice", "pricing.internalFreeSupply", "pricing.decisions.count",
        };

        foreach (var basis in new[] { "PreviousMonth", "Previous3MonthAverage", "Previous6MonthAverage", "AllPriorMonths" })
        {
            keys.AddRange([
                $"dashboard.2026-09.{basis}.current.amount",
                $"dashboard.2026-09.{basis}.comparedCurrent.amount",
                $"dashboard.2026-09.{basis}.baseline.amount",
                $"dashboard.2026-09.{basis}.delta",
            ]);
        }

        keys.AddRange(["report.2026.total", "report.2026.requests"]);
        keys.AddRange(Enumerable.Range(1, 12).Select(month => $"report.2026.month.{month:D2}.amount"));

        foreach (var order in new[] { 153, 154 })
        {
            keys.AddRange([
                $"order.{order}.location",
                $"order.{order}.detail.ItemCount",
                $"order.{order}.detail.KnownAmountTotal",
                $"order.{order}.PreviousMonth.Current.KnownAmount",
            ]);
            keys.AddRange(new[] { "PreviousMonth", "Previous3MonthAverage", "Previous6MonthAverage", "AllPriorMonths" }
                .SelectMany(basis => new[] { $"order.{order}.{basis}.Primary.BaselineKnownAmount", $"order.{order}.{basis}.Primary.DeltaAmount" }));
        }

        Report.Heading("Key figures — before → after");
        foreach (var key in keys)
        {
            var then = before.GetValueOrDefault(key) ?? "(absent)";
            var now = after.GetValueOrDefault(key) ?? "(absent)";
            Console.WriteLine($"  {key,-62} {then,14} → {now,-14} {(then == now ? "same" : "CHANGED")}");
        }

        Console.WriteLine();
    }

    private static bool Same(IReadOnlyDictionary<string, string> before, IReadOnlyDictionary<string, string> after, params string[] keys) =>
        keys.All(key => before.TryGetValue(key, out var value) && after.GetValueOrDefault(key) == value);

    /// <summary>
    /// Every figure present on both sides must be equal. A figure on one side only is a difference too, unless it
    /// belongs to an object the migration was approved to remove or add and carries nothing: those objects had,
    /// and have, no orders.
    /// </summary>
    internal static (int Identical, IReadOnlyList<string> Differences) Compare(
        IReadOnlyDictionary<string, string> before, IReadOnlyDictionary<string, string> after)
    {
        var removed = CatalogueDecisions.Deletions.Select(deletion => deletion.Code).ToHashSet(StringComparer.Ordinal);
        var addedCodes = CatalogueDecisions.Inserts.Select(insert => insert.Code).ToHashSet(StringComparer.Ordinal);
        static bool Empty(string value) => value is "—" or "0" or "0.00";
        static bool Mentions(string key, IEnumerable<string> codes) => codes.Any(code => key.Contains($".{code}.", StringComparison.Ordinal));

        var identical = 0;
        var differences = new List<string>();
        foreach (var (key, value) in before)
        {
            if (!after.TryGetValue(key, out var now))
            {
                if (!(Mentions(key, removed) && Empty(value)))
                {
                    differences.Add($"{key}: {value} → (gone)");
                }

                continue;
            }

            if (now == value)
            {
                identical++;
            }
            else
            {
                differences.Add($"{key}: {value} → {now}");
            }
        }

        foreach (var (key, value) in after.Where(entry => !before.ContainsKey(entry.Key)))
        {
            if (!(Mentions(key, addedCodes) && Empty(value)))
            {
                differences.Add($"{key}: (new) → {value}");
            }
        }

        return (identical, differences);
    }
}
