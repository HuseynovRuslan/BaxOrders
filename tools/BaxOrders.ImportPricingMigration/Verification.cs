namespace BaxOrders.ImportPricingMigration;

/// <summary>
/// Read-only: nothing is pending, the four columns are there and NULL on every staged row, and every figure recorded
/// before the migration is exactly what it was. Each check says what it compared; the command fails if any of them does.
/// </summary>
internal static class Verification
{
    /// <summary>The figures a reader checks first, side by side, out of the thousands compared.</summary>
    private static readonly string[] KeyFigures =
    [
        "orders.requests", "orders.lines", "orders.lines.sha256",
        "catalogue.products", "catalogue.products.sha256",
        "catalogue.variants", "catalogue.variants.sha256",
        "catalogue.aliases", "catalogue.aliases.sha256",
        "catalogue.locationAliases", "catalogue.locationAliases.sha256",
        "catalogue.suppliers", "catalogue.suppliers.sha256",
        "catalogue.productMatchDecisions", "catalogue.productMatchDecisions.sha256",
        "pricing.total", "pricing.unresolved", "pricing.missingRequiredPrice", "pricing.internalFreeSupply",
        "pricing.decisions.count", "pricing.decisions.sha256", "pricing.decisions.lines.sha256",
        "dashboard.2026-09.PreviousMonth.current.amount",
        "dashboard.2026-09.PreviousMonth.baseline.amount",
        "dashboard.2026-09.PreviousMonth.delta",
        "report.2026.total",
        "hem.2026-09.order",
        "hem.2026-09.PreviousMonth.Current.KnownAmount",
        "hem.2026-09.PreviousMonth.Primary.BaselineKnownAmount",
        Invariants.HeydarAliyevSeptemberDelta,
        "imports.batches", "imports.batches.sha256",
        "imports.rows", "imports.rows.sha256",
        "imports.materializations", "imports.materializations.sha256",
        "imports.corrections", "imports.corrections.sha256",
        "imports.resolutions", "imports.resolutions.sha256",
    ];

    public static async Task<int> RunAsync(IServiceProvider provider, ToolSettings settings, CancellationToken cancellationToken)
    {
        var checks = new List<(string Name, bool Passed, string Detail)>();
        void Check(string name, bool passed, string detail) => checks.Add((name, passed, detail));

        var state = await MigrationState.ReadAsync(Program.Db(provider), cancellationToken);
        var plan = MigrationPlan.Of(state);
        DryRun.PrintState(state);

        Check("No migration is pending, and no STOP condition holds",
            plan.IsDone,
            plan.IsDone ? "nothing pending" : $"pending: {string.Join(", ", plan.Pending)}; {string.Join(" ", plan.Stops)}");
        Check($"{MigrationPlan.Target} is applied",
            state.Applied.Contains(MigrationPlan.Target),
            $"latest applied: {state.Applied.LastOrDefault() ?? "—"}");
        Check($"{MigrationState.TableName} has the four classification columns, NULL on every row",
            state.ColumnsExist && state.ClassifiedRows == 0,
            state.DescribeColumns());

        var baselinePath = Invariants.BaselinePath(settings);
        if (!File.Exists(baselinePath))
        {
            Check("MUST NOT CHANGE: baseline recorded", false, $"missing: {baselinePath}");
        }
        else
        {
            var before = await Invariants.ReadAsync(baselinePath);
            var after = await Invariants.CaptureAsync(provider, cancellationToken);
            var (identical, differences) = Invariants.Compare(before, after);

            Report.Heading($"MUST NOT CHANGE — {before.Count:N0} figures before, {after.Count:N0} after ({baselinePath})");
            foreach (var line in differences)
            {
                Console.WriteLine($"  {line}");
            }

            Console.WriteLine(differences.Count == 0 ? "  Every figure is identical." : $"  {differences.Count} difference(s).");
            Console.WriteLine();

            Report.Heading("Key figures — before → after");
            foreach (var key in KeyFigures)
            {
                var then = before.GetValueOrDefault(key) ?? "(absent)";
                var now = after.GetValueOrDefault(key) ?? "(absent)";
                Console.WriteLine($"  {key,-52} {Short(then),18} → {Short(now),-18} {(then == now ? "same" : "CHANGED")}");
            }

            Console.WriteLine();

            Check("MUST NOT CHANGE: every recorded figure is identical, key by key",
                differences.Count == 0,
                $"{identical:N0} identical, {differences.Count} different");
            Check("HD-002: the pricing decisions, the 94 reclassified lines among them, are unchanged",
                Same(before, after, "pricing.decisions.count", "pricing.decisions.sha256", "pricing.decisions.lines.sha256"),
                $"count {before.GetValueOrDefault("pricing.decisions.count") ?? "(absent)"} → {after.GetValueOrDefault("pricing.decisions.count") ?? "(absent)"}, "
                + $"record hash and line hash {(Same(before, after, "pricing.decisions.sha256", "pricing.decisions.lines.sha256") ? "unchanged" : "CHANGED")}");
            Check("Qiymət təsnifatı: the three totals are unchanged",
                Same(before, after, "pricing.total", "pricing.unresolved", "pricing.missingRequiredPrice", "pricing.internalFreeSupply"),
                $"unresolved {after.GetValueOrDefault("pricing.unresolved")}, price required {after.GetValueOrDefault("pricing.missingRequiredPrice")}, "
                + $"internal {after.GetValueOrDefault("pricing.internalFreeSupply")}");
            Check("No order, line, product, variant, alias, object alias, supplier or product-match decision changed",
                Same(before, after,
                    "orders.requests", "orders.lines", "orders.lines.sha256",
                    "catalogue.products.sha256", "catalogue.variants.sha256", "catalogue.aliases.sha256",
                    "catalogue.locationAliases.sha256", "catalogue.suppliers.sha256", "catalogue.productMatchDecisions.sha256"),
                "counts and hashes compared");
            Check("No import batch, staged row, materialization, correction or resolution changed",
                Same(before, after,
                    "imports.batches.sha256", "imports.rows.sha256", "imports.materializations.sha256",
                    "imports.corrections.sha256", "imports.resolutions.sha256"),
                $"{after.GetValueOrDefault("imports.batches")} batch(es), {after.GetValueOrDefault("imports.rows")} row(s) compared by hash");
            Check("Heydər Əliyev Mərkəzi, 2026-09, «Keçən ay»: the difference is unchanged",
                Same(before, after, Invariants.HeydarAliyevSeptemberDelta),
                $"{before.GetValueOrDefault(Invariants.HeydarAliyevSeptemberDelta) ?? "(absent)"} → {after.GetValueOrDefault(Invariants.HeydarAliyevSeptemberDelta) ?? "(absent)"}");
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

    private static bool Same(IReadOnlyDictionary<string, string> before, IReadOnlyDictionary<string, string> after, params string[] keys) =>
        keys.All(key => before.TryGetValue(key, out var value) && after.GetValueOrDefault(key) == value);

    /// <summary>A hash is long; its first twelve characters are enough to see whether it moved.</summary>
    private static string Short(string value) => value.Length > 18 ? value[..12] + "…" : value;
}
