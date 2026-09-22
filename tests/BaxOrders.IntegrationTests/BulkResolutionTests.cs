using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Bulk review against a real SQL Server database: select, preview, confirm, apply. Every fixture is synthetic —
/// no company workbook is read and no record of the real catalog is touched.
/// </summary>
[Collection(SqlServerCollection.Name)]
public sealed class BulkResolutionTests(SqlServerDatabaseFixture database)
{
    [SqlServerFact]
    public async Task A_preview_writes_nothing()
    {
        await using var db = database.CreateContext();
        var names = Names(3);
        var batchId = await StageAsync(db, [.. names.Select(name => new OrderLine(Product: name))]);

        var products = await db.Products.CountAsync();
        var resolutions = await db.ImportResolutions.CountAsync();

        var preview = await BulkService(db).PreviewAsync(batchId, CreateProducts(names), CancellationToken.None);

        Assert.Equal((3, 3, 0, 3), (preview.Summary.Selected, preview.Summary.Ready, preview.Summary.Conflicts, preview.Summary.RecordsToCreate));
        Assert.Equal(3, preview.Summary.RowsAffected);
        Assert.All(preview.Items, item => Assert.True(item.CreatesRecord && !item.CreatesAlias));
        Assert.Equal(names, preview.Items.Select(item => item.DisplayValue));

        await using var check = database.CreateContext();
        Assert.Equal(products, await check.Products.CountAsync());
        Assert.Equal(resolutions, await check.ImportResolutions.CountAsync());
        Assert.All(await RowsAsync(check, batchId), row => Assert.Null(row.MatchedProductId));
    }

    [SqlServerFact]
    public async Task Selected_products_are_created_and_matched_in_one_operation()
    {
        await using var db = database.CreateContext();
        var names = Names(3);
        var batchId = await StageAsync(db,
        [
            new OrderLine(Product: names[0]),
            new OrderLine(Product: $" {names[0].ToUpperInvariant()} ", Price: null),
            new OrderLine(Product: names[1]),
            new OrderLine(Product: names[2]),
        ]);

        var result = await BulkService(db).ApplyAsync(batchId, CreateProducts(names), CancellationToken.None);

        Assert.Equal((3, 0, 3, 0), (result.AppliedItems, result.SkippedItems, result.CreatedRecords, result.AliasesSaved));

        await using var check = database.CreateContext();
        var created = await check.Products.Where(product => names.Contains(product.Name)).ToListAsync();
        Assert.Equal(3, created.Count);
        Assert.All(created, product => Assert.Matches(@"^PRD-\d{6}$", product.Code));
        Assert.Equal(3, created.Select(product => product.Code).Distinct().Count());

        var rows = await RowsAsync(check, batchId);
        Assert.All(rows, row => Assert.NotNull(row.MatchedProductId));
        Assert.All(rows, row => Assert.DoesNotContain(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownProduct));

        // Issues from other stages and the raw text survive the bulk re-match.
        Assert.Equal($" {names[0].ToUpperInvariant()} ", rows[1].OriginalProductName);
        Assert.Contains(rows[1].Issues, issue => issue.IssueType == ImportIssueType.MissingPrice);
        Assert.All(rows, row => Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownProductVariant));

        // One refresh at the end, and the counters match the rows.
        var batch = await check.ImportBatches.SingleAsync(item => item.Id == batchId);
        Assert.Equal(rows.Count(row => row.ValidationStatus == ImportRowValidationStatus.NeedsReview), batch.WarningRows);
        Assert.Equal(ImportStatus.NeedsReview, batch.Status);
        Assert.Empty(await check.ProductAliases.Where(alias => created.Select(product => product.Id).Contains(alias.ProductId)).ToListAsync());
    }

    [SqlServerFact]
    public async Task Several_spellings_can_be_mapped_to_one_existing_record()
    {
        await using var db = database.CreateContext();
        var supplier = await AddSupplierAsync(db, $"Cleanfix MMC {Unique()}");
        var spellings = new[] { $"Cleanfix {Unique()}", $"Cleanfiks {Unique()}", $"Klinfiks {Unique()}" };
        var batchId = await StageAsync(db, [.. spellings.Select(name => new OrderLine(Supplier: name))]);

        var request = Items(spellings.Select(spelling =>
            new BulkResolutionItem(ImportResolutionKind.Supplier, ImportSourceKeys.Name(spelling)!, BulkResolutionAction.MapExisting, supplier.Id)));

        var preview = await BulkService(db).PreviewAsync(batchId, request, CancellationToken.None);
        Assert.Equal(3, preview.Summary.Ready);
        Assert.Equal(0, preview.Summary.RecordsToCreate);
        Assert.Equal(0, preview.Summary.AliasesToCreate);
        Assert.All(preview.Items, item => Assert.Equal(supplier.Name, item.TargetLabel));

        var result = await BulkService(db).ApplyAsync(batchId, request, CancellationToken.None);
        Assert.Equal((3, 0, 0), (result.AppliedItems, result.CreatedRecords, result.AliasesSaved));

        await using var check = database.CreateContext();
        Assert.All(await RowsAsync(check, batchId), row => Assert.Equal<int?>(supplier.Id, row.MatchedSupplierId));

        // The default scope keeps the decision inside this import: no alias is written.
        Assert.Empty(await check.SupplierAliases.Where(alias => alias.SupplierId == supplier.Id).ToListAsync());
        Assert.All(
            await check.ImportResolutions.Where(resolution => resolution.ImportBatchId == batchId).ToListAsync(),
            resolution => Assert.Equal(ResolutionScope.BatchOnly, resolution.Scope));
    }

    [SqlServerFact]
    public async Task Global_aliases_are_saved_only_where_the_operator_asked_for_them()
    {
        await using var db = database.CreateContext();
        var supplier = await AddSupplierAsync(db, $"Green Garden {Unique()}");
        var remembered = $"Green Gardem {Unique()}";
        var once = $"Grin Garden {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Supplier: remembered), new OrderLine(Supplier: once, Product: "Başqa mal"));

        var request = Items(
        [
            new BulkResolutionItem(ImportResolutionKind.Supplier, ImportSourceKeys.Name(remembered)!, BulkResolutionAction.MapExisting, supplier.Id, ResolutionScope.GlobalAlias),
            new BulkResolutionItem(ImportResolutionKind.Supplier, ImportSourceKeys.Name(once)!, BulkResolutionAction.MapExisting, supplier.Id),
        ]);

        var preview = await BulkService(db).PreviewAsync(batchId, request, CancellationToken.None);
        Assert.Equal(1, preview.Summary.AliasesToCreate);

        var result = await BulkService(db).ApplyAsync(batchId, request, CancellationToken.None);
        Assert.Equal((2, 1), (result.AppliedItems, result.AliasesSaved));

        await using var check = database.CreateContext();
        var alias = Assert.Single(await check.SupplierAliases.Where(item => item.SupplierId == supplier.Id).ToListAsync());
        Assert.Equal(remembered, alias.Alias);
    }

    [SqlServerFact]
    public async Task One_conflicting_value_stops_the_whole_operation()
    {
        await using var db = database.CreateContext();
        var supplier = await AddSupplierAsync(db, $"Target {Unique()}");
        var safe = $"Safe {Unique()}";
        var taken = $"Taken {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Supplier: safe), new OrderLine(Supplier: taken, Product: "Başqa mal"));

        // The second spelling is the canonical name of another supplier, so it can never become an alias.
        await AddSupplierAsync(db, taken);

        var request = Items(
        [
            new BulkResolutionItem(ImportResolutionKind.Supplier, ImportSourceKeys.Name(safe)!, BulkResolutionAction.MapExisting, supplier.Id, ResolutionScope.GlobalAlias),
            new BulkResolutionItem(ImportResolutionKind.Supplier, ImportSourceKeys.Name(taken)!, BulkResolutionAction.MapExisting, supplier.Id, ResolutionScope.GlobalAlias),
        ]);

        var preview = await BulkService(db).PreviewAsync(batchId, request, CancellationToken.None);
        Assert.Equal((1, 1), (preview.Summary.Ready, preview.Summary.Conflicts));

        var refused = await Assert.ThrowsAsync<BulkResolutionConflictException>(
            () => BulkService(db).ApplyAsync(batchId, request, CancellationToken.None));
        Assert.Contains("nothing was changed", refused.Message);
        Assert.Equal(ImportSourceKeys.Name(taken), Assert.Single(refused.Items).SourceKey);

        // Not even the value that was fine on its own is written.
        await using var check = database.CreateContext();
        Assert.Empty(await check.ImportResolutions.Where(resolution => resolution.ImportBatchId == batchId).ToListAsync());
        Assert.Empty(await check.SupplierAliases.Where(alias => alias.SupplierId == supplier.Id).ToListAsync());
        Assert.All(await RowsAsync(check, batchId), row => Assert.Null(row.MatchedSupplierId));
    }

    [SqlServerFact]
    public async Task Repeating_a_bulk_operation_writes_nothing_the_second_time()
    {
        await using var db = database.CreateContext();
        var names = Names(2);
        var batchId = await StageAsync(db, [.. names.Select(name => new OrderLine(Product: name))]);
        var request = CreateProducts(names);

        await BulkService(db).ApplyAsync(batchId, request, CancellationToken.None);
        var repeated = await BulkService(db).ApplyAsync(batchId, request, CancellationToken.None);

        Assert.Equal((0, 2, 0), (repeated.AppliedItems, repeated.SkippedItems, repeated.CreatedRecords));
        Assert.All(repeated.Items, item => Assert.Equal(BulkItemStatus.AlreadyResolved, item.Status));

        await using var check = database.CreateContext();
        Assert.Equal(2, await check.Products.CountAsync(product => names.Contains(product.Name)));
        Assert.Equal(2, await check.ImportResolutions.CountAsync(resolution => resolution.ImportBatchId == batchId));
    }

    [SqlServerFact]
    public async Task A_catalog_change_between_preview_and_apply_is_caught()
    {
        await using var db = database.CreateContext();
        var names = Names(2);
        var batchId = await StageAsync(db, [.. names.Select(name => new OrderLine(Product: name))]);
        var request = CreateProducts(names);

        var preview = await BulkService(db).PreviewAsync(batchId, request, CancellationToken.None);
        Assert.Equal(2, preview.Summary.Ready);

        // Someone else creates a product with that name while the operator is looking at the preview.
        await AddProductAsync(db, names[1]);

        var refused = await Assert.ThrowsAsync<BulkResolutionConflictException>(
            () => BulkService(db).ApplyAsync(batchId, request, CancellationToken.None));
        Assert.Contains("already the name", Assert.Single(refused.Items).Problem);

        await using var check = database.CreateContext();
        Assert.Empty(await check.ImportResolutions.Where(resolution => resolution.ImportBatchId == batchId).ToListAsync());
        Assert.Equal(0, await check.Products.CountAsync(product => product.Name == names[0]));
    }

    [SqlServerFact]
    public async Task Units_and_category_paths_are_never_created_in_bulk()
    {
        await using var db = database.CreateContext();
        var unitSpelling = $"kv{Unique()}";
        var batchId = await StageAsync(db, new OrderLine(OrderUnit: unitSpelling, MainCategory: $"Usta {Unique()}"));
        var service = BulkService(db);

        var unit = await Assert.ThrowsAsync<ValidationException>(() => service.PreviewAsync(
            batchId, Items([new BulkResolutionItem(ImportResolutionKind.OrderUnit, unitSpelling, BulkResolutionAction.CreateFromValue)]), CancellationToken.None));
        Assert.Contains("only a person knows", unit.Message);

        var categoryKey = await db.ImportRows.Where(row => row.ImportBatchId == batchId)
            .Select(row => row.NormalizedCategoryPath!).FirstAsync();
        var category = await Assert.ThrowsAsync<ValidationException>(() => service.PreviewAsync(
            batchId, Items([new BulkResolutionItem(ImportResolutionKind.CategoryPath, categoryKey, BulkResolutionAction.CreateFromValue)]), CancellationToken.None));
        Assert.Contains("hierarchy", category.Message);

        // Mapping the same values to records the operator picked is allowed.
        var pieces = await db.UnitsOfMeasure.SingleAsync(item => item.Code == "PCS");
        db.Categories.Add(Category.CreateRoot($"Kateqoriya {Unique()}"));
        await db.SaveChangesAsync();
        var target = await db.Categories.OrderByDescending(item => item.Id).FirstAsync();

        var result = await service.ApplyAsync(batchId, Items(
        [
            new BulkResolutionItem(ImportResolutionKind.OrderUnit, unitSpelling, BulkResolutionAction.MapExisting, pieces.Id),
            new BulkResolutionItem(ImportResolutionKind.CategoryPath, categoryKey, BulkResolutionAction.MapExisting, target.Id),
        ]), CancellationToken.None);

        Assert.Equal((2, 0), (result.AppliedItems, result.CreatedRecords));

        await using var check = database.CreateContext();
        var row = Assert.Single(await RowsAsync(check, batchId));
        Assert.Equal((pieces.Id, target.Id), (row.MatchedOrderUnitId, row.MatchedCategoryId));
    }

    [SqlServerFact]
    public async Task The_item_limit_is_enforced_before_anything_is_read()
    {
        await using var db = database.CreateContext();
        var names = Names(3);
        var batchId = await StageAsync(db, [.. names.Select(name => new OrderLine(Product: name))]);

        var tooMany = await Assert.ThrowsAsync<ValidationException>(() => BulkService(db, maxItems: 2)
            .ApplyAsync(batchId, CreateProducts(names), CancellationToken.None));

        Assert.Contains("at most 2", tooMany.Message);

        await using var check = database.CreateContext();
        Assert.Empty(await check.ImportResolutions.Where(resolution => resolution.ImportBatchId == batchId).ToListAsync());
    }

    [SqlServerFact]
    public async Task Dependency_ready_variants_are_created_in_one_operation_and_finish_the_batch()
    {
        await using var db = database.CreateContext();
        var names = Names(2);
        var batchId = await StageAsync(db,
        [
            new OrderLine(Product: names[0], SpecificationValue: "50", SpecificationUnit: "sm", OrderUnit: "ədəd"),
            new OrderLine(Product: names[0], SpecificationValue: "50", SpecificationUnit: "sm", OrderUnit: "əd"),
            new OrderLine(Product: names[1], OrderUnit: "ədəd"),
        ]);

        await BulkService(db).ApplyAsync(batchId, CreateProducts(names), CancellationToken.None);

        await using var afterProducts = database.CreateContext();
        var queries = new ImportReviewQueries(afterProducts);
        var variants = await queries.GetUnresolvedAsync(
            batchId, new UnresolvedQuery(ImportResolutionKind.ProductVariant, PageSize: 50), CancellationToken.None);

        // Two spellings of one unit fall into one canonical variant, so two products give two variant values.
        Assert.Equal(2, variants!.Items.Count);
        var collapsed = Assert.Single(variants.Items, item => item.AffectedRowCount == 2);

        var request = Items(variants.Items.Select(item =>
            new BulkResolutionItem(ImportResolutionKind.ProductVariant, item.SourceKey, BulkResolutionAction.CreateFromValue)));

        var preview = await BulkService(afterProducts).PreviewAsync(batchId, request, CancellationToken.None);
        Assert.Equal((2, 2, 3), (preview.Summary.Ready, preview.Summary.RecordsToCreate, preview.Summary.RowsAffected));
        Assert.Equal(2, Assert.Single(preview.Items, item => item.SourceKey == collapsed.SourceKey).SourceSpellings);
        Assert.All(preview.Items, item => Assert.NotNull(item.ParentLabel));

        var result = await BulkService(afterProducts).ApplyAsync(batchId, request, CancellationToken.None);
        Assert.Equal((2, 2), (result.AppliedItems, result.CreatedRecords));

        await using var check = database.CreateContext();
        var productIds = await check.Products.Where(product => names.Contains(product.Name)).Select(product => product.Id).ToListAsync();
        Assert.Equal(2, await check.ProductVariants.CountAsync(variant => productIds.Contains(variant.ProductId)));
        var rows = await RowsAsync(check, batchId);
        Assert.All(rows, row => Assert.NotNull(row.MatchedProductVariantId));
        Assert.Equal(1, rows.Select(row => row.MatchedProductVariantId).Distinct().Count(id => rows.Count(row => row.MatchedProductVariantId == id) == 2));

        var batch = await check.ImportBatches.SingleAsync(item => item.Id == batchId);
        Assert.Equal((ImportStatus.ReadyToImport, 0, 0), (batch.Status, batch.InvalidRows, batch.WarningRows));
    }

    [SqlServerFact]
    public async Task A_variant_whose_dependencies_are_missing_cannot_be_applied()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Mop {Unique()}");
        var unitSpelling = $"kv{Unique()}";
        var batchId = await StageAsync(db,
            new OrderLine(Product: product.Name, OrderUnit: "ədəd"),
            new OrderLine(Product: product.Name, OrderUnit: unitSpelling));

        var readyKey = await db.ImportRows.Where(row => row.ImportBatchId == batchId && row.VariantSourceKey != null)
            .Select(row => row.VariantSourceKey!).FirstAsync();
        var blockedKey = ImportSourceKeys.ProductVariant(product.Id, ProductVariantKey.Create(null, null, null, "PACK"));

        var request = Items(
        [
            new BulkResolutionItem(ImportResolutionKind.ProductVariant, readyKey, BulkResolutionAction.CreateFromValue),
            new BulkResolutionItem(ImportResolutionKind.ProductVariant, blockedKey, BulkResolutionAction.CreateFromValue),
        ]);

        var preview = await BulkService(db).PreviewAsync(batchId, request, CancellationToken.None);
        Assert.Equal(1, preview.Summary.Ready);
        Assert.Equal(BulkItemStatus.NotFound, Assert.Single(preview.Items, item => item.SourceKey == blockedKey).Status);

        await Assert.ThrowsAsync<BulkResolutionConflictException>(() => BulkService(db).ApplyAsync(batchId, request, CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Empty(await check.ProductVariants.Where(variant => variant.ProductId == product.Id).ToListAsync());
        Assert.Empty(await check.ImportResolutions.Where(resolution => resolution.ImportBatchId == batchId).ToListAsync());

        // The row whose unit is still unknown carries no variant identity at all.
        Assert.Equal(1, await check.ImportRows.CountAsync(row => row.ImportBatchId == batchId && row.VariantSourceKey == null));
    }

    [SqlServerFact]
    public async Task An_existing_variant_is_mapped_but_never_duplicated()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Fırça {Unique()}");
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var existing = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var spelling = $"Firca {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: spelling));
        var productKey = ImportSourceKeys.Name(spelling)!;

        await BulkService(db).ApplyAsync(
            batchId,
            Items([new BulkResolutionItem(ImportResolutionKind.Product, productKey, BulkResolutionAction.MapExisting, product.Id)]),
            CancellationToken.None);

        await using var check = database.CreateContext();
        var row = Assert.Single(await RowsAsync(check, batchId));

        // Matching found the existing variant by itself, so nothing is left to decide and nothing is created.
        Assert.Equal<long?>(existing.Id, row.MatchedProductVariantId);
        Assert.Equal(1, await check.ProductVariants.CountAsync(variant => variant.ProductId == product.Id));

        var variants = Assert.Single(
            await new ImportReviewQueries(check).GetSummaryAsync(batchId, CancellationToken.None) ?? [],
            item => item.Kind == ImportResolutionKind.ProductVariant);
        Assert.Equal((0, 0), (variants.DistinctValues, variants.DependencyBlockedRows));
    }

    [SqlServerFact]
    public async Task The_work_queue_counts_decided_and_remaining_values()
    {
        await using var db = database.CreateContext();
        var names = Names(3);
        var batchId = await StageAsync(db, [.. names.Select(name => new OrderLine(Product: name))]);

        var before = Assert.Single(
            await new ImportReviewQueries(db).GetSummaryAsync(batchId, CancellationToken.None) ?? [],
            item => item.Kind == ImportResolutionKind.Product);
        Assert.Equal((3, 3, 0), (before.TotalValues, before.DistinctValues, before.ResolvedValues));

        await BulkService(db).ApplyAsync(batchId, CreateProducts([names[0], names[1]]), CancellationToken.None);

        await using var check = database.CreateContext();
        var summary = await new ImportReviewQueries(check).GetSummaryAsync(batchId, CancellationToken.None) ?? [];
        var products = Assert.Single(summary, item => item.Kind == ImportResolutionKind.Product);
        var variants = Assert.Single(summary, item => item.Kind == ImportResolutionKind.ProductVariant);

        Assert.Equal((3, 1, 2), (products.TotalValues, products.DistinctValues, products.ResolvedValues));

        // The rows whose product is still unknown cannot show a variant yet.
        Assert.Equal((2, 1), (variants.DistinctValues, variants.DependencyBlockedRows));
    }

    private static BulkResolutionRequest CreateProducts(IEnumerable<string> names) =>
        Items(names.Select(name =>
            new BulkResolutionItem(ImportResolutionKind.Product, ImportSourceKeys.Name(name)!, BulkResolutionAction.CreateFromValue)));

    private static BulkResolutionRequest Items(IEnumerable<BulkResolutionItem> items) => new([.. items]);

    private static string[] Names(int count) => [.. Enumerable.Range(1, count).Select(index => $"Mal {index} {Unique()}")];

    private static async Task<Product> AddProductAsync(BaxOrdersDbContext db, string name)
    {
        var product = new Product(await new SqlServerProductCodeGenerator(db).NextAsync(CancellationToken.None), name);
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return product;
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
