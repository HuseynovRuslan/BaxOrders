using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The last shape the real workbook asked for: an operational name is enough to be a canonical location, a name
/// may belong to two different catalogs at once, and a service period is a legitimate order unit. Every fixture
/// is synthetic; no company workbook is read.
/// </summary>
[Collection(SqlServerCollection.Name)]
public sealed class OperationalCatalogTests(SqlServerDatabaseFixture database)
{
    [SqlServerFact]
    public async Task A_short_operational_name_can_be_canonical_as_written()
    {
        // "EXPO" is how the company writes it. Nothing waits for a longer official name, and nothing invents one.
        var written = $"EXPO {Unique()}";

        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(Location: written));

        var result = await ResolutionService(db).CreateLocationAsync(
            new CreateLocationCommand(batchId, Key(written), written, ResolutionScope.GlobalAlias), CancellationToken.None);

        await using var check = database.CreateContext();
        var location = await check.Locations.SingleAsync(item => item.Id == result.TargetId);

        Assert.Equal(written, location.Name);
        Assert.StartsWith("LOC-", location.Code, StringComparison.Ordinal);

        var row = Assert.Single(await RowsAsync(check, batchId));
        Assert.Equal(location.Id, row.MatchedLocationId);
        Assert.DoesNotContain(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownLocation);
    }

    [SqlServerFact]
    public async Task One_name_may_be_both_a_location_and_a_supplier()
    {
        // Two catalogs, two identities. Sharing a name is not a conflict and never merges the entity types.
        var written = $"Qala baza {Unique()}";

        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(Location: written, Supplier: written));

        var service = ResolutionService(db);
        var location = await service.CreateLocationAsync(
            new CreateLocationCommand(batchId, Key(written), written, ResolutionScope.BatchOnly), CancellationToken.None);
        var supplier = await service.CreateSupplierAsync(
            new CreateSupplierCommand(batchId, Key(written), written, null, ResolutionScope.BatchOnly), CancellationToken.None);

        await using var check = database.CreateContext();
        var row = Assert.Single(await RowsAsync(check, batchId));

        Assert.Equal<long?>(location.TargetId, row.MatchedLocationId);
        Assert.Equal<long?>(supplier.TargetId, row.MatchedSupplierId);
        Assert.DoesNotContain(row.Issues, issue =>
            issue.IssueType is ImportIssueType.UnknownLocation or ImportIssueType.UnknownSupplier);
    }

    [SqlServerFact]
    public async Task A_service_period_is_a_normal_order_unit()
    {
        await using var db = database.CreateContext();
        var code = $"MON{Unique()[..3].ToUpperInvariant()}";
        var batchId = await StageAsync(db, new OrderLine(Product: $"Ayaqyolu pulu {Unique()}", OrderUnit: "ay", Price: 100, Quantity: 1));
        var row = Assert.Single(await RowsAsync(db, batchId));

        Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownUnit);

        var result = await ResolutionService(db).CreateUnitAsync(
            // BatchOnly: a global alias for "ay" would follow every other test in the suite.
            new CreateUnitCommand(batchId, ImportResolutionKind.OrderUnit, "ay", code, "Ay", "ay", UnitType.Other, ResolutionScope.BatchOnly),
            CancellationToken.None);

        await using var check = database.CreateContext();
        var unit = await check.UnitsOfMeasure.SingleAsync(item => item.Id == result.TargetId);

        Assert.Equal((code, "Ay", "ay", UnitType.Other), (unit.Code, unit.Name, unit.Symbol, unit.UnitType));

        var resolved = Assert.Single(await RowsAsync(check, batchId));
        Assert.Equal(unit.Id, resolved.MatchedOrderUnitId);
        Assert.DoesNotContain(resolved.Issues, issue => issue.IssueType == ImportIssueType.UnknownUnit);

        // A billing period has no relation to any physical unit; nothing converts between them.
        Assert.Equal("ay", resolved.OriginalOrderUnit);
    }

    [SqlServerFact]
    public async Task Resolving_the_last_reference_clears_the_blocker_it_caused()
    {
        var written = $"Bayıl yolu {Unique()}";

        await using var db = database.CreateContext();
        var batchId = await StageAsync(db, new OrderLine(Location: written));

        var before = await Readiness(db, batchId);
        Assert.Contains(before.Blockers, blocker => blocker.IssueType == ImportIssueType.UnknownLocation);
        Assert.Equal(1, before.UnresolvedReferences.Locations);

        await ResolutionService(db).CreateLocationAsync(
            new CreateLocationCommand(batchId, Key(written), written, ResolutionScope.BatchOnly), CancellationToken.None);

        await using var check = database.CreateContext();
        var after = await Readiness(check, batchId);

        Assert.DoesNotContain(after.Blockers, blocker => blocker.IssueType == ImportIssueType.UnknownLocation);
        Assert.Equal(0, after.UnresolvedReferences.Locations);
    }

    [SqlServerFact]
    public async Task A_variant_plan_shows_the_descriptor_and_says_when_there_is_no_order_unit()
    {
        await using var db = database.CreateContext();
        var product = $"Sep {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: product, SpecificationValue: "28", SpecificationUnit: "diş", OrderUnit: null));
        var row = Assert.Single(await RowsAsync(db, batchId));

        var service = ResolutionService(db);
        await service.CreateProductAsync(
            new CreateProductCommand(batchId, Key(product), product, null, ResolutionScope.BatchOnly), CancellationToken.None);
        await service.MarkNotAUnitAsync(
            new MarkNotAUnitCommand(batchId, ImportResolutionKind.SpecificationUnit, "diş"), CancellationToken.None);
        await CorrectionService(db).ClearAsync(batchId, row.Id, ImportCorrectionField.OrderUnit, CancellationToken.None);

        await using var check = database.CreateContext();
        var reloaded = Assert.Single(await RowsAsync(check, batchId));
        var plan = await ReviewQueries(check).GetVariantPlanAsync(batchId, reloaded.VariantSourceKey!, CancellationToken.None);

        Assert.NotNull(plan);
        Assert.True(plan!.CanCreate);
        Assert.Equal("28", plan.SpecificationValue);
        Assert.Equal("diş", plan.SpecificationDescriptor);
        Assert.Null(plan.SpecificationUnitLabel);

        // Empty, never a placeholder unit: the screen shows its own word for a line with no order unit.
        Assert.Equal(string.Empty, plan.OrderUnitLabel);
    }

    private static async Task<ImportReadiness> Readiness(BaxOrdersDbContext db, long importBatchId) =>
        await new ImportReadinessQueries(db, ReviewQueries(db)).GetReadinessAsync(importBatchId, CancellationToken.None)
        ?? throw new InvalidOperationException($"Import #{importBatchId} was not found.");

    private static ImportReviewQueries ReviewQueries(BaxOrdersDbContext db) => new(db);

    private static string Key(string value) => Domain.Normalization.TextNormalizer.Normalize(value);

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];

    private static Task<List<ImportRow>> RowsAsync(BaxOrdersDbContext db, long importBatchId) =>
        db.ImportRows.AsNoTracking()
            .Include(row => row.Issues)
            .Include(row => row.Corrections)
            .Where(row => row.ImportBatchId == importBatchId)
            .OrderBy(row => row.RowNumber)
            .ToListAsync();
}
