using BaxOrders.Application.Common;
using BaxOrders.Application.Imports;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

[Collection(SqlServerCollection.Name)]
public sealed class ImportResolutionServiceTests(SqlServerDatabaseFixture database)
{
    [SqlServerFact]
    public async Task One_decision_updates_every_row_with_that_value_and_keeps_unrelated_issues()
    {
        await using var db = database.CreateContext();
        var supplier = await AddSupplierAsync(db, $"Green Garden {Unique()}");
        var spelling = $"Green Gardem {Unique()}";
        var batchId = await StageAsync(db,
            new OrderLine(Supplier: spelling, Price: null),
            new OrderLine(Supplier: $"  {spelling.ToUpperInvariant()} ", Price: null),
            new OrderLine(Supplier: $"Azclean {Unique()}", Product: "Başqa mal"));
        var key = ImportSourceKeys.Name(spelling)!;

        var result = await ResolutionService(db).ResolveSupplierToExistingAsync(
            new ResolveToExistingCommand(batchId, key, supplier.Id, ResolutionScope.BatchOnly), CancellationToken.None);

        Assert.Equal((ResolutionOutcome.Applied, 2, false), (result.Outcome, result.AffectedRows, result.AliasSaved));

        await using var check = database.CreateContext();
        var rows = await RowsAsync(check, batchId);
        Assert.Equal([supplier.Id, supplier.Id, null], rows.Select(row => row.MatchedSupplierId));
        Assert.All(rows.Take(2), row =>
        {
            Assert.DoesNotContain(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownSupplier);
            Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.MissingPrice);
            Assert.Contains(row.Issues, issue => issue is { IssueType: ImportIssueType.DuplicateRow, Severity: IssueSeverity.Info });
            Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownProduct);
        });

        // Raw Excel text is never touched by a decision.
        Assert.Equal($"  {spelling.ToUpperInvariant()} ", rows[1].OriginalSupplierName);
        Assert.Empty(await check.SupplierAliases.Where(alias => alias.NormalizedAlias == key).ToListAsync());

        var batch = await check.ImportBatches.SingleAsync(b => b.Id == batchId);
        Assert.Equal(rows.Count(row => row.ValidationStatus == ImportRowValidationStatus.NeedsReview), batch.WarningRows);
    }

    [SqlServerFact]
    public async Task A_global_alias_makes_the_next_import_resolve_by_itself()
    {
        await using var db = database.CreateContext();
        var supplier = await AddSupplierAsync(db, $"Cleanfix MMC {Unique()}");
        var spelling = $"Cleanfix {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Supplier: spelling));
        var key = ImportSourceKeys.Name(spelling)!;

        var result = await ResolutionService(db).ResolveSupplierToExistingAsync(
            new ResolveToExistingCommand(batchId, key, supplier.Id, ResolutionScope.GlobalAlias), CancellationToken.None);

        Assert.True(result.AliasSaved);

        await using var next = database.CreateContext();
        Assert.Equal(supplier.Id, await next.SupplierAliases.Where(alias => alias.NormalizedAlias == key).Select(alias => alias.SupplierId).SingleAsync());

        var laterBatchId = await StageAsync(next, new OrderLine(Supplier: spelling));
        var laterRow = Assert.Single(await RowsAsync(next, laterBatchId));
        Assert.Equal(supplier.Id, laterRow.MatchedSupplierId);
        Assert.DoesNotContain(laterRow.Issues, issue => issue.IssueType == ImportIssueType.UnknownSupplier);
    }

    [SqlServerFact]
    public async Task An_alias_that_would_be_ambiguous_is_refused_and_nothing_is_stored()
    {
        await using var db = database.CreateContext();
        var spelling = $"Ambiguous {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Supplier: spelling));

        // The name becomes a canonical supplier only after staging, so the row is still unresolved.
        await AddSupplierAsync(db, spelling);
        var other = await AddSupplierAsync(db, $"Other {Unique()}");
        var key = ImportSourceKeys.Name(spelling)!;

        var conflict = await Assert.ThrowsAsync<ConflictException>(() => ResolutionService(db).ResolveSupplierToExistingAsync(
            new ResolveToExistingCommand(batchId, key, other.Id, ResolutionScope.GlobalAlias), CancellationToken.None));
        Assert.Contains("already the name", conflict.Message);

        await using var check = database.CreateContext();
        Assert.Empty(await check.ImportResolutions.Where(resolution => resolution.ImportBatchId == batchId).ToListAsync());
        Assert.Empty(await check.SupplierAliases.Where(alias => alias.NormalizedAlias == key).ToListAsync());
        Assert.All(await RowsAsync(check, batchId), row => Assert.Null(row.MatchedSupplierId));
    }

    [SqlServerFact]
    public async Task Repeating_a_decision_is_idempotent_and_contradicting_it_conflicts()
    {
        await using var db = database.CreateContext();
        var first = await AddSupplierAsync(db, $"First {Unique()}");
        var second = await AddSupplierAsync(db, $"Second {Unique()}");
        var spelling = $"Omid {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Supplier: spelling));
        var key = ImportSourceKeys.Name(spelling)!;
        var service = ResolutionService(db);

        var applied = await service.ResolveSupplierToExistingAsync(new ResolveToExistingCommand(batchId, key, first.Id, ResolutionScope.BatchOnly), CancellationToken.None);
        var repeated = await service.ResolveSupplierToExistingAsync(new ResolveToExistingCommand(batchId, key, first.Id, ResolutionScope.BatchOnly), CancellationToken.None);
        var promoted = await service.ResolveSupplierToExistingAsync(new ResolveToExistingCommand(batchId, key, first.Id, ResolutionScope.GlobalAlias), CancellationToken.None);

        Assert.Equal(ResolutionOutcome.Applied, applied.Outcome);
        Assert.Equal(ResolutionOutcome.AlreadyApplied, repeated.Outcome);
        Assert.True(promoted.AliasSaved);

        await Assert.ThrowsAsync<ConflictException>(() => service.ResolveSupplierToExistingAsync(
            new ResolveToExistingCommand(batchId, key, second.Id, ResolutionScope.BatchOnly), CancellationToken.None));

        await using var check = database.CreateContext();
        var resolution = Assert.Single(await check.ImportResolutions.Where(r => r.ImportBatchId == batchId).ToListAsync());
        Assert.Equal<int?>(first.Id, resolution.SupplierId);
        Assert.Equal(ResolutionScope.GlobalAlias, resolution.Scope);
    }

    [SqlServerFact]
    public async Task A_created_location_gets_a_generated_code_and_forms_a_preview_group()
    {
        await using var db = database.CreateContext();
        var name = $"Dədə Qorqud {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Location: name), new OrderLine(Location: name, Product: "Başqa mal"));
        var key = ImportSourceKeys.Name(name)!;

        var result = await ResolutionService(db).CreateLocationAsync(
            new CreateLocationCommand(batchId, key, name, ResolutionScope.BatchOnly), CancellationToken.None);

        await using var check = database.CreateContext();
        var location = await check.Locations.SingleAsync(l => l.Id == result.TargetId);
        Assert.Matches(@"^LOC-\d{6}$", location.Code);
        Assert.Equal(name, location.Name);
        Assert.All(await RowsAsync(check, batchId), row => Assert.Equal<int?>(location.Id, row.MatchedLocationId));

        var group = Assert.Single(result.Preview.Groups, g => g.LocationId == location.Id);
        Assert.Equal((new DateOnly(2026, 3, 1), 2, false), (group.Period, group.RowCount, group.ExistingRequest));

        // An existing request for the same location and period is reported, never changed.
        check.OrderRequests.Add(new OrderRequest(location, new DateOnly(2026, 3, 1)));
        await check.SaveChangesAsync();
        var preview = await new ImportPreviewQueries(check).GetPreviewAsync(batchId, CancellationToken.None);
        var refreshed = Assert.Single(preview!.Groups, g => g.LocationId == location.Id);
        Assert.Equal((true, 1, GroupSuggestedAction.RequiresOperatorDecision), (refreshed.ExistingRequest, refreshed.LatestVersion, refreshed.SuggestedAction));
    }

    [SqlServerFact]
    public async Task Concurrent_location_code_requests_never_collide()
    {
        var codes = await Task.WhenAll(Enumerable.Range(0, 20).Select(async _ =>
        {
            await using var db = database.CreateContext();
            return await new SqlServerLocationCodeGenerator(db).NextAsync(CancellationToken.None);
        }));

        Assert.Equal(codes.Length, codes.Distinct().Count());
        Assert.All(codes, code => Assert.Matches(@"^LOC-\d{6}$", code));
    }

    [SqlServerFact]
    public async Task Creating_a_unit_unblocks_the_rows_that_used_it()
    {
        await using var db = database.CreateContext();
        var spelling = $"kv{Unique()}";
        var batchId = await StageAsync(db, new OrderLine(OrderUnit: spelling));
        var before = Assert.Single(await RowsAsync(db, batchId));
        Assert.Equal(ImportRowValidationStatus.Invalid, before.ValidationStatus);

        var code = $"KV{Unique().ToUpperInvariant()}";
        var result = await ResolutionService(db).CreateUnitAsync(
            new CreateUnitCommand(batchId, ImportResolutionKind.OrderUnit, spelling, code, $"Kvadrat metr {Unique()}", "m²", UnitType.Area, ResolutionScope.GlobalAlias),
            CancellationToken.None);

        await using var check = database.CreateContext();
        var row = Assert.Single(await RowsAsync(check, batchId));
        Assert.Equal(result.TargetId, row.MatchedOrderUnitId!.Value);
        Assert.DoesNotContain(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownUnit);

        // The operator said what the unit measures; a surface unit is an area, not "other".
        Assert.Equal(UnitType.Area, (await check.UnitsOfMeasure.SingleAsync(unit => unit.Id == result.TargetId)).UnitType);

        // The unresolved unit was an error; only the unknown product warning is left.
        Assert.Equal(ImportRowValidationStatus.NeedsReview, row.ValidationStatus);
        var batch = await check.ImportBatches.SingleAsync(b => b.Id == batchId);
        Assert.Equal((0, 1), (batch.InvalidRows, batch.WarningRows));
        Assert.True(result.AliasSaved);
    }

    [SqlServerFact]
    public async Task A_specification_unit_decision_leaves_the_order_unit_alone()
    {
        await using var db = database.CreateContext();
        var spelling = $"lik{Unique()}";
        var batchId = await StageAsync(db, new OrderLine(SpecificationValue: "5", SpecificationUnit: spelling));
        var centimeter = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "CM");
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");

        await ResolutionService(db).ResolveUnitToExistingAsync(
            ImportResolutionKind.SpecificationUnit,
            new ResolveToExistingCommand(batchId, spelling, centimeter.Id, ResolutionScope.BatchOnly),
            CancellationToken.None);

        await using var check = database.CreateContext();
        var row = Assert.Single(await RowsAsync(check, batchId));
        Assert.Equal((centimeter.Id, pieces.Id), (row.MatchedSpecificationUnitId, row.MatchedOrderUnitId));
        Assert.DoesNotContain(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownUnit);
    }

    [SqlServerFact]
    public async Task Creating_a_category_path_reuses_the_levels_that_exist()
    {
        await using var db = database.CreateContext();
        var rootName = $"Təmizlik {Unique()}";
        db.Categories.Add(Category.CreateRoot(rootName));
        await db.SaveChangesAsync();
        var root = await db.Categories.SingleAsync(category => category.Name == rootName);

        var batchId = await StageAsync(db,
            new OrderLine(MainCategory: rootName, MiddleCategory: "Təmizlik ləvazimatı", SubCategory: "Əlcək"),
            new OrderLine(MainCategory: rootName, MiddleCategory: "Təmizlik ləvazimatı", SubCategory: "Süngər", Product: "Süngər"));
        var glovesKey = ImportSourceKeys.CategoryPath(rootName, "Təmizlik ləvazimatı", "Əlcək")!;

        var plan = await new ImportReviewQueries(db).GetCategoryPathPlanAsync(batchId, glovesKey, CancellationToken.None);
        Assert.True(plan!.CanCreate);
        Assert.Equal([root.Id, null, null], plan.Levels.Select(level => level.ExistingCategoryId));

        var service = ResolutionService(db);
        var gloves = await service.CreateCategoryPathAsync(new CreateCategoryPathCommand(batchId, glovesKey), CancellationToken.None);
        var spongeKey = ImportSourceKeys.CategoryPath(rootName, "Təmizlik ləvazimatı", "Süngər")!;
        var sponge = await service.CreateCategoryPathAsync(new CreateCategoryPathCommand(batchId, spongeKey), CancellationToken.None);

        await using var check = database.CreateContext();
        var created = await check.Categories.Where(category => category.Name == "Təmizlik ləvazimatı" && category.ParentId == root.Id).ToListAsync();
        var middle = Assert.Single(created);
        var leaves = await check.Categories.Where(category => category.ParentId == middle.Id).Select(category => category.Name).ToListAsync();
        Assert.Equal(["Süngər", "Əlcək"], leaves.OrderBy(name => name, StringComparer.Ordinal));

        var rows = await RowsAsync(check, batchId);
        Assert.Equal(new long?[] { gloves.TargetId, sponge.TargetId }, rows.Select(row => (long?)row.MatchedCategoryId));
        Assert.All(rows, row => Assert.DoesNotContain(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownCategory));
    }

    [SqlServerFact]
    public async Task A_category_path_with_a_blank_level_cannot_be_created()
    {
        await using var db = database.CreateContext();
        var main = $"Usta {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(MainCategory: main, SubCategory: "Material"));
        var key = ImportSourceKeys.CategoryPath(main, null, "Material")!;

        var plan = await new ImportReviewQueries(db).GetCategoryPathPlanAsync(batchId, key, CancellationToken.None);
        Assert.False(plan!.CanCreate);

        await Assert.ThrowsAsync<ConflictException>(() => ResolutionService(db).CreateCategoryPathAsync(
            new CreateCategoryPathCommand(batchId, key), CancellationToken.None));
    }

    [SqlServerFact]
    public async Task Unresolved_values_are_grouped_by_distinct_value()
    {
        await using var db = database.CreateContext();
        var supplierA = $"Supplier A {Unique()}";
        var supplierB = $"Supplier B {Unique()}";
        var person = $"Xəyal {Unique()}";
        var batchId = await StageAsync(db,
            new OrderLine(Supplier: supplierA, Person: person),
            new OrderLine(Supplier: $" {supplierA.ToUpperInvariant()}", Person: person, Product: "Mal 2"),
            new OrderLine(Supplier: supplierB, Person: $"Elmir {Unique()}", Product: "Mal 3"));
        var queries = new ImportReviewQueries(db);

        var summary = await queries.GetSummaryAsync(batchId, CancellationToken.None) ?? [];
        var suppliers = Assert.Single(summary, item => item.Kind == ImportResolutionKind.Supplier);
        var locations = Assert.Single(summary, item => item.Kind == ImportResolutionKind.Location);

        Assert.Equal((2, 3), (suppliers.DistinctValues, suppliers.AffectedRows));
        Assert.Equal((0, 0), (locations.DistinctValues, locations.AffectedRows));

        var page = await queries.GetUnresolvedAsync(batchId, new UnresolvedQuery(ImportResolutionKind.Supplier), CancellationToken.None);
        var biggest = page!.Items[0];
        Assert.Equal((ImportSourceKeys.Name(supplierA), 2, UnresolvedStatus.Unknown), (biggest.SourceKey, biggest.AffectedRowCount, biggest.CurrentStatus));
        Assert.Equal(supplierA, biggest.DisplayValue);
        Assert.Equal(2, biggest.SampleOriginalValues.Count);
        Assert.NotEmpty(biggest.SampleRows);
        Assert.Equal(new DateOnly(2026, 3, 1), biggest.SampleRows[0].Period);

        var filtered = await queries.GetUnresolvedAsync(
            batchId, new UnresolvedQuery(ImportResolutionKind.Supplier, Search: supplierB), CancellationToken.None);
        Assert.Equal(ImportSourceKeys.Name(supplierB), Assert.Single(filtered!.Items).SourceKey);
    }

    [SqlServerFact]
    public async Task Two_decisions_for_the_same_value_cannot_both_be_stored()
    {
        await using var db = database.CreateContext();
        var first = await AddSupplierAsync(db, $"Dup A {Unique()}");
        var second = await AddSupplierAsync(db, $"Dup B {Unique()}");
        var batchId = await StageAsync(db, new OrderLine(Supplier: $"Dup {Unique()}"));
        const string key = "duplicate key";

        db.ImportResolutions.Add(new ImportResolution(batchId, ImportResolutionKind.Supplier, key, ResolutionScope.BatchOnly, ResolutionAction.MapExisting, first.Id));
        db.ImportResolutions.Add(new ImportResolution(batchId, ImportResolutionKind.Supplier, key, ResolutionScope.BatchOnly, ResolutionAction.MapExisting, second.Id));

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    private static async Task<Supplier> AddSupplierAsync(BaxOrdersDbContext db, string name)
    {
        var supplier = new Supplier(name);
        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();
        return supplier;
    }

    private static Task<List<ImportRow>> RowsAsync(BaxOrdersDbContext db, long importBatchId) =>
        db.ImportRows.AsNoTracking()
            .Include(row => row.Issues)
            .Where(row => row.ImportBatchId == importBatchId)
            .OrderBy(row => row.RowNumber)
            .ToListAsync();

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];
}
