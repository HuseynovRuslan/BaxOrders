using BaxOrders.Application.Orders.Pricing;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.ImportPricingMigration;

/// <summary>
/// Read-only: where the migrations stand, which staged imports are still under review and how many of their rows
/// have no price, what Qiymət təsnifatı counts today, which suppliers are marked as never charging, and whether
/// Task 3's alternative name "H.Ə.M Təmizlik" still names Heydər Əliyev Mərkəzi. Changes nothing.
/// </summary>
/// <remarks>
/// Every query here projects the columns it needs, so it runs the same before the migration — when the four new
/// columns do not exist yet — and after it.
/// </remarks>
internal static class Inspection
{
    /// <summary>The brief's example of an alternative object name (Task 3).</summary>
    public const string HemAlternativeName = "H.Ə.M Təmizlik";

    public static async Task<int> RunAsync(IServiceProvider provider, CancellationToken cancellationToken)
    {
        var db = Program.Db(provider);
        var state = await MigrationState.ReadAsync(db, cancellationToken);
        var plan = MigrationPlan.Of(state);

        Report.Heading("Migrations");
        Console.WriteLine($"  In the code: {state.Known.Count}, latest {state.Known.LastOrDefault() ?? "—"}");
        Console.WriteLine($"  Applied: {state.Applied.Count}, latest {state.Applied.LastOrDefault() ?? "—"}");
        Console.WriteLine($"  Pending: {(plan.Pending.Count == 0 ? "none" : string.Join(", ", plan.Pending))}");
        foreach (var stop in plan.Stops)
        {
            Console.WriteLine($"  STOP: {stop}");
        }

        Console.WriteLine($"  {MigrationState.TableName} classification columns: {state.DescribeColumns()}");
        Console.WriteLine();

        await ImportsAsync(db, cancellationToken);
        await PricingAsync(provider, db, cancellationToken);
        await SuppliersAsync(db, cancellationToken);
        await HemAliasAsync(db, cancellationToken);

        Console.WriteLine("Inspection only. Nothing was changed.");
        return 0;
    }

    /// <summary>Batches by status, and for each one still under review, the unpriced rows it would import.</summary>
    private static async Task ImportsAsync(Infrastructure.Persistence.BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        var batches = await db.ImportBatches.AsNoTracking()
            .OrderBy(batch => batch.Id)
            .Select(batch => new { batch.Id, batch.OriginalFileName, batch.Status, batch.TotalRows, batch.ExcludedRows })
            .ToListAsync(cancellationToken);

        Report.Heading($"Import batches — {batches.Count}");
        foreach (var group in batches.GroupBy(batch => batch.Status).OrderBy(group => group.Key))
        {
            Console.WriteLine($"  {group.Key}: {group.Count()}");
        }

        Console.WriteLine();

        var underReview = batches.Where(batch => batch.Status is ImportStatus.NeedsReview or ImportStatus.ReadyToImport).ToList();
        Report.Heading($"Batches under review (NeedsReview / ReadyToImport) — {underReview.Count}");
        foreach (var batch in underReview)
        {
            var unpriced = await db.ImportRows.AsNoTracking()
                .CountAsync(row => row.ImportBatchId == batch.Id && !row.IsExcluded && row.ParsedUnitPrice == null, cancellationToken);
            Console.WriteLine(
                $"  #{batch.Id} «{batch.OriginalFileName}» {batch.Status}: {batch.TotalRows} row(s), {batch.ExcludedRows} excluded, "
                + $"{unpriced} included row(s) without a price — «Təsnif edilməyib» if imported unclassified after this task");
        }

        if (underReview.Count == 0)
        {
            Console.WriteLine("  None.");
        }

        Console.WriteLine();
    }

    /// <summary>Qiymət təsnifatı as it counts today, and where its unclassified lines sit.</summary>
    private static async Task PricingAsync(
        IServiceProvider provider, Infrastructure.Persistence.BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        var pricing = await provider.GetRequiredService<PricingModeReviewService>()
            .GetAsync(new PricingModeReviewQuery(PageSize: 1), cancellationToken);

        Report.Heading("Qiymət təsnifatı (PricingModeReviewService, no filter)");
        Console.WriteLine($"  Unpriced lines: {pricing.TotalCount}");
        Console.WriteLine($"  Təsnif edilməyib (Unresolved): {pricing.Unresolved}   (the brief quotes 94 as context, not as a target)");
        Console.WriteLine($"  Alış qiyməti tələb olunur (PriceRequired): {pricing.MissingRequiredPrice}");
        Console.WriteLine($"  Ödənişsiz daxili təminat (InternalFreeSupply): {pricing.InternalFreeSupply}");
        Console.WriteLine($"  Pricing decisions recorded: {await db.OrderItemPricingDecisions.CountAsync(cancellationToken)}");
        Console.WriteLine();

        var unresolved = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.UnitPrice == null && item.PricingMode == PricingMode.Unresolved)
            .Select(item => new
            {
                item.OrderRequest.RequestPeriod,
                item.OrderRequest.Location.Code,
                item.OrderRequest.Location.Name,
                WorkbookSupplier = db.ImportRowMaterializations
                    .Where(link => link.OrderRequestItemId == item.Id)
                    .Select(link => link.ImportRow.OriginalSupplierName)
                    .FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        Report.Heading($"Təsnif edilməyib by month — {unresolved.Count} line(s)");
        Console.WriteLine("  (the brief: Fevral 25, Aprel 24, Sentyabr 19, İyun 11, Yanvar 7, May 5, Mart 3)");
        foreach (var month in unresolved.GroupBy(line => line.RequestPeriod).OrderBy(group => group.Key))
        {
            Console.WriteLine($"  {Report.Month(month.Key)}: {month.Count()}");
        }

        Console.WriteLine();

        Report.Heading("Təsnif edilməyib by object and month");
        foreach (var group in unresolved
                     .GroupBy(line => (line.Code, line.Name, line.RequestPeriod))
                     .OrderBy(group => group.Key.RequestPeriod)
                     .ThenBy(group => group.Key.Code, StringComparer.Ordinal))
        {
            Console.WriteLine($"  {Report.Month(group.Key.RequestPeriod)}  {group.Key.Code} {group.Key.Name}: {group.Count()}");
        }

        Console.WriteLine();

        Report.Heading("Təsnif edilməyib by the workbook's supplier cell");
        foreach (var group in unresolved.GroupBy(line => line.WorkbookSupplier ?? "(no workbook row)").OrderByDescending(group => group.Count()))
        {
            Console.WriteLine($"  «{group.Key}»: {group.Count()}");
        }

        Console.WriteLine();
    }

    /// <summary>The suppliers whose future imported lines would have been classified by source before this task.</summary>
    private static async Task SuppliersAsync(Infrastructure.Persistence.BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        var notRequired = await db.Suppliers.AsNoTracking()
            .Where(supplier => supplier.PriceRequirement == SupplierPriceRequirement.NotRequired)
            .OrderBy(supplier => supplier.Id)
            .Select(supplier => new { supplier.Id, supplier.Name, supplier.IsActive })
            .ToListAsync(cancellationToken);

        Report.Heading($"Suppliers marked NotRequired — {notRequired.Count}");
        Console.WriteLine("  Before this task an imported unpriced line of these was seeded «Ödənişsiz daxili təminat» by source; after it, never.");
        foreach (var supplier in notRequired)
        {
            Console.WriteLine($"  #{supplier.Id} «{supplier.Name}»{(supplier.IsActive ? string.Empty : " (inactive)")}");
        }

        if (notRequired.Count == 0)
        {
            Console.WriteLine("  None.");
        }

        Console.WriteLine();
    }

    /// <summary>Task 3's alternative name, which the import must keep recognising exactly as before.</summary>
    private static async Task HemAliasAsync(Infrastructure.Persistence.BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        var normalized = TextNormalizer.Normalize(HemAlternativeName);
        var aliases = await db.LocationAliases.AsNoTracking()
            .Where(alias => alias.NormalizedAlias == normalized)
            .Select(alias => new { alias.Id, alias.Alias, alias.Location.Code, alias.Location.Name })
            .ToListAsync(cancellationToken);

        Report.Heading($"Location alias «{HemAlternativeName}» (normalized «{normalized}»)");
        foreach (var alias in aliases)
        {
            Console.WriteLine(
                $"  alias #{alias.Id} «{alias.Alias}» → {alias.Code} {alias.Name}"
                + (alias.Code == Invariants.HeydarAliyevCentre ? "  — names Heydər Əliyev Mərkəzi" : "  — does NOT name HEM"));
        }

        if (aliases.Count == 0)
        {
            Console.WriteLine("  Not found.");
        }

        Console.WriteLine($"  Location aliases in all: {await db.LocationAliases.CountAsync(cancellationToken)}");
        Console.WriteLine();
    }
}
