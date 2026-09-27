using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Product and variant decisions against a real SQL Server database. Every fixture here is synthetic: no company
/// workbook is read and no record of the real catalog is touched.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class ProductResolutionTests(PostgresDatabaseFixture database)
{
    [PostgresFact]
    public async Task An_unknown_product_keeps_the_batch_out_of_import()
    {
        await using var db = database.CreateContext();
        var name = $"Naməlum mal {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: name));

        var row = Assert.Single(await RowsAsync(db, batchId));
        Assert.Null(row.MatchedProductId);
        Assert.Null(row.VariantSourceKey);
        Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownProduct);

        var batch = await db.ImportBatches.SingleAsync(b => b.Id == batchId);
        Assert.Equal(ImportStatus.NeedsReview, batch.Status);
    }

    [PostgresFact]
    public async Task A_product_decision_resolves_its_rows_and_opens_the_variant_for_review()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Makaron mop {Unique()}");
        var spelling = $"Makaron-mop {Unique()}";
        var batchId = await StageAsync(db,
            new OrderLine(Product: spelling),
            new OrderLine(Product: $"  {spelling.ToUpperInvariant()} ", Price: null),
            new OrderLine(Product: $"Başqa mal {Unique()}"));
        var key = ImportSourceKeys.Name(spelling)!;

        var result = await ResolutionService(db).ResolveProductToExistingAsync(
            new ResolveToExistingCommand(batchId, key, product.Id, ResolutionScope.BatchOnly), CancellationToken.None);

        Assert.Equal((ResolutionOutcome.Applied, 2, false), (result.Outcome, result.AffectedRows, result.AliasSaved));

        await using var check = database.CreateContext();
        var rows = await RowsAsync(check, batchId);
        Assert.Equal(new long?[] { product.Id, product.Id, null }, rows.Select(row => row.MatchedProductId));

        // The variant of those rows is now a distinct value a person can decide on.
        var variantKey = ImportSourceKeys.ProductVariant(product.Id, ProductVariantKey.Create(null, null, null, "PCS"));
        Assert.Equal([variantKey, variantKey, null], rows.Select(row => row.VariantSourceKey));
        Assert.All(rows.Take(2), row =>
        {
            Assert.DoesNotContain(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownProduct);
            Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownProductVariant);
        });

        // Raw Excel text and issues from other stages survive the decision.
        Assert.Equal($"  {spelling.ToUpperInvariant()} ", rows[1].OriginalProductName);
        Assert.Contains(rows[1].Issues, issue => issue.IssueType == ImportIssueType.MissingPrice);
        Assert.Empty(await check.ProductAliases.Where(alias => alias.NormalizedAlias == key).ToListAsync());
    }

    [PostgresFact]
    public async Task A_created_product_gets_a_generated_code_and_no_variant_of_its_own()
    {
        await using var db = database.CreateContext();
        var name = $"Yeni mal {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: name));
        var key = ImportSourceKeys.Name(name)!;

        var result = await ResolutionService(db).CreateProductAsync(
            new CreateProductCommand(batchId, key, name, null, ResolutionScope.BatchOnly), CancellationToken.None);

        await using var check = database.CreateContext();
        var product = await check.Products.SingleAsync(item => item.Id == result.TargetId);
        Assert.Matches(@"^PRD-\d{6}$", product.Code);
        Assert.Equal(name, product.Name);
        Assert.Null(product.CategoryId);

        // Creating the product never invents the variant: that is a separate decision.
        Assert.Empty(await check.ProductVariants.Where(variant => variant.ProductId == product.Id).ToListAsync());
        var row = Assert.Single(await RowsAsync(check, batchId));
        Assert.Equal<long?>(product.Id, row.MatchedProductId);
        Assert.Null(row.MatchedProductVariantId);
    }

    [PostgresFact]
    public async Task A_product_alias_makes_the_next_import_resolve_by_itself()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Rezin əlcək {Unique()}");
        var spelling = $"Rezin alcek {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: spelling));
        var key = ImportSourceKeys.Name(spelling)!;

        // 13.2: an alternative product name is the administrator's to save.
        var result = await ResolutionService(db, ReviewingAdmin).ResolveProductToExistingAsync(
            new ResolveToExistingCommand(batchId, key, product.Id, ResolutionScope.GlobalAlias), CancellationToken.None);

        Assert.True(result.AliasSaved);

        await using var next = database.CreateContext();
        Assert.Equal(product.Id, await next.ProductAliases.Where(alias => alias.NormalizedAlias == key).Select(alias => alias.ProductId).SingleAsync());

        var laterBatchId = await StageAsync(next, new OrderLine(Product: spelling));
        var laterRow = Assert.Single(await RowsAsync(next, laterBatchId));
        Assert.Equal<long?>(product.Id, laterRow.MatchedProductId);
        Assert.DoesNotContain(laterRow.Issues, issue => issue.IssueType == ImportIssueType.UnknownProduct);
    }

    [PostgresFact]
    public async Task A_product_alias_that_would_be_ambiguous_is_refused_and_nothing_is_stored()
    {
        await using var db = database.CreateContext();
        var spelling = $"İkili ad {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: spelling));

        // The spelling becomes a canonical product only after staging, so the row is still unresolved.
        await AddProductAsync(db, spelling);
        var other = await AddProductAsync(db, $"Başqa mal {Unique()}");
        var key = ImportSourceKeys.Name(spelling)!;

        // 13.2: an alternative product name is the administrator's to save; the ambiguity is refused all the same.
        var service = ResolutionService(db, ReviewingAdmin);

        var conflict = await Assert.ThrowsAsync<ConflictException>(() => service.ResolveProductToExistingAsync(
            new ResolveToExistingCommand(batchId, key, other.Id, ResolutionScope.GlobalAlias), CancellationToken.None));
        Assert.Contains("already the name", conflict.Message);

        // Creating a product under a taken name is refused the same way.
        await Assert.ThrowsAsync<ConflictException>(() => service.CreateProductAsync(
            new CreateProductCommand(batchId, key, spelling, null, ResolutionScope.BatchOnly), CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Empty(await check.ImportResolutions.Where(resolution => resolution.ImportBatchId == batchId).ToListAsync());
        Assert.Empty(await check.ProductAliases.Where(alias => alias.NormalizedAlias == key).ToListAsync());
        Assert.All(await RowsAsync(check, batchId), row => Assert.Null(row.MatchedProductId));
    }

    [PostgresFact]
    public async Task A_variant_waits_for_the_unit_decision_and_is_counted_as_blocked()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Boya {Unique()}");
        var unitSpelling = $"kv{Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: product.Name, OrderUnit: unitSpelling));
        var queries = new ImportReviewQueries(db);

        var blocked = Assert.Single(
            await queries.GetSummaryAsync(batchId, CancellationToken.None) ?? [],
            item => item.Kind == ImportResolutionKind.ProductVariant);
        Assert.Equal((0, 0, 1), (blocked.DistinctValues, blocked.AffectedRows, blocked.DependencyBlockedRows));

        var row = Assert.Single(await RowsAsync(db, batchId));
        Assert.Null(row.VariantSourceKey);
        var reason = Assert.Single(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownProductVariant);
        Assert.Contains("order unit", reason.Message);

        // Resolving the unit is what makes the variant reviewable.
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        await ResolutionService(db).ResolveUnitToExistingAsync(
            ImportResolutionKind.OrderUnit,
            new ResolveToExistingCommand(batchId, unitSpelling, pieces.Id, ResolutionScope.BatchOnly),
            CancellationToken.None);

        await using var check = database.CreateContext();
        var unblocked = Assert.Single(await RowsAsync(check, batchId));
        Assert.Equal(ImportSourceKeys.ProductVariant(product.Id, ProductVariantKey.Create(null, null, null, "PCS")), unblocked.VariantSourceKey);

        var summary = Assert.Single(
            await new ImportReviewQueries(check).GetSummaryAsync(batchId, CancellationToken.None) ?? [],
            item => item.Kind == ImportResolutionKind.ProductVariant);
        Assert.Equal((1, 1, 0), (summary.DistinctValues, summary.AffectedRows, summary.DependencyBlockedRows));
    }

    [PostgresFact]
    public async Task A_created_variant_is_built_from_canonical_units_and_finishes_the_batch()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Süngər {Unique()}");
        // Named on both lines, because this test ends by asserting the batch has nothing left to decide.
        var person = await ResponsiblePersonAsync(db);
        var batchId = await StageAsync(db,
            new OrderLine(Product: product.Name, SpecificationValue: "50", SpecificationUnit: "sm", OrderUnit: "ədəd", Person: person),
            new OrderLine(Product: product.Name, SpecificationValue: "50", SpecificationUnit: "sm", OrderUnit: "əd", Person: person));
        var queries = new ImportReviewQueries(db);

        // Two spellings of one unit are one variant, because the key is built from unit codes.
        var page = await queries.GetUnresolvedAsync(batchId, new UnresolvedQuery(ImportResolutionKind.ProductVariant), CancellationToken.None);
        var value = Assert.Single(page!.Items);
        Assert.Equal(2, value.AffectedRowCount);
        Assert.Contains(product.Name, value.ParentLabel!);

        var plan = await queries.GetVariantPlanAsync(batchId, value.SourceKey, CancellationToken.None);
        Assert.True(plan!.CanCreate);
        Assert.Equal(("50", "CM — Santimetr", "PCS — Ədəd"), (plan.SpecificationValue!, plan.SpecificationUnitLabel!, plan.OrderUnitLabel));

        var result = await ResolutionService(db).CreateProductVariantAsync(
            new CreateProductVariantCommand(batchId, value.SourceKey), CancellationToken.None);

        await using var check = database.CreateContext();
        var variant = await check.ProductVariants
            .Include(item => item.OrderUnit)
            .Include(item => item.SpecificationUnit)
            .SingleAsync(item => item.Id == result.TargetId);
        Assert.Equal((product.Id, "50", "CM", "PCS"), (variant.ProductId, variant.SpecificationValue!, variant.SpecificationUnit!.Code, variant.OrderUnit!.Code));

        var rows = await RowsAsync(check, batchId);
        Assert.All(rows, row => Assert.Equal<long?>(variant.Id, row.MatchedProductVariantId));
        Assert.All(rows, row => Assert.DoesNotContain(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownProductVariant));

        var batch = await check.ImportBatches.SingleAsync(b => b.Id == batchId);
        Assert.Equal((ImportStatus.ReadyToImport, 0, 0), (batch.Status, batch.InvalidRows, batch.WarningRows));
    }

    [PostgresFact]
    public async Task A_variant_is_mapped_only_inside_its_own_product_and_order_unit()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Mop {Unique()}");
        var other = await AddProductAsync(db, $"Başqa mop {Unique()}");
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var packs = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PACK");

        var wrongUnit = await AddVariantAsync(db, product, packs);
        var wrongProduct = await AddVariantAsync(db, other, pieces);

        var batchId = await StageAsync(db, new OrderLine(Product: product.Name, OrderUnit: "ədəd"));
        var sourceKey = ImportSourceKeys.ProductVariant(product.Id, ProductVariantKey.Create(null, null, null, "PCS"));
        var service = ResolutionService(db);

        var foreignProduct = await Assert.ThrowsAsync<ConflictException>(() => service.ResolveProductVariantToExistingAsync(
            new ResolveToExistingCommand(batchId, sourceKey, wrongProduct.Id, ResolutionScope.BatchOnly), CancellationToken.None));
        Assert.Contains("belongs to product", foreignProduct.Message);

        var foreignUnit = await Assert.ThrowsAsync<ConflictException>(() => service.ResolveProductVariantToExistingAsync(
            new ResolveToExistingCommand(batchId, sourceKey, wrongUnit.Id, ResolutionScope.BatchOnly), CancellationToken.None));
        Assert.Contains("ordered in", foreignUnit.Message);

        // A variant decision is about this import's ids, so it can never be saved as a global alias.
        await Assert.ThrowsAsync<DomainException>(() => service.ResolveProductVariantToExistingAsync(
            new ResolveToExistingCommand(batchId, sourceKey, wrongUnit.Id, ResolutionScope.GlobalAlias), CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Empty(await check.ImportResolutions.Where(resolution => resolution.ImportBatchId == batchId).ToListAsync());
        Assert.Null(Assert.Single(await RowsAsync(check, batchId)).MatchedProductVariantId);
    }

    [PostgresFact]
    public async Task Mapping_a_matching_variant_is_idempotent_and_contradicting_it_conflicts()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Fırça {Unique()}");
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var first = await AddVariantAsync(db, product, pieces, "10");
        var second = await AddVariantAsync(db, product, pieces, "20");

        var batchId = await StageAsync(db, new OrderLine(Product: product.Name, SpecificationValue: "10", SpecificationUnit: "sm"));
        var sourceKey = ImportSourceKeys.ProductVariant(product.Id, ProductVariantKey.Create("10", "CM", null, "PCS"));

        // The staged variant already exists, so matching found it without any decision.
        Assert.Equal<long?>(first.Id, Assert.Single(await RowsAsync(db, batchId)).MatchedProductVariantId);

        var service = ResolutionService(db);

        // Creating a variant that already exists is refused instead of silently making a twin.
        var duplicate = await Assert.ThrowsAsync<ConflictException>(() => service.CreateProductVariantAsync(
            new CreateProductVariantCommand(batchId, sourceKey), CancellationToken.None));
        Assert.Contains("already exists", duplicate.Message);

        var applied = await service.ResolveProductVariantToExistingAsync(
            new ResolveToExistingCommand(batchId, sourceKey, first.Id, ResolutionScope.BatchOnly), CancellationToken.None);
        var repeated = await service.ResolveProductVariantToExistingAsync(
            new ResolveToExistingCommand(batchId, sourceKey, first.Id, ResolutionScope.BatchOnly), CancellationToken.None);

        Assert.Equal((ResolutionOutcome.Applied, ResolutionOutcome.AlreadyApplied), (applied.Outcome, repeated.Outcome));

        await Assert.ThrowsAsync<ConflictException>(() => service.ResolveProductVariantToExistingAsync(
            new ResolveToExistingCommand(batchId, sourceKey, second.Id, ResolutionScope.BatchOnly), CancellationToken.None));

        await using var check = database.CreateContext();
        var resolution = Assert.Single(await check.ImportResolutions.Where(r => r.ImportBatchId == batchId).ToListAsync());
        Assert.Equal<long?>(first.Id, resolution.ProductVariantId);
        Assert.Equal(2, await check.ProductVariants.CountAsync(variant => variant.ProductId == product.Id));
    }

    [PostgresFact]
    public async Task A_variant_cannot_be_decided_while_its_product_is_unknown()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Kürək {Unique()}");
        var batchId = await StageAsync(db, new OrderLine(Product: $"Naməlum {Unique()}"));
        var sourceKey = ImportSourceKeys.ProductVariant(product.Id, ProductVariantKey.Create(null, null, null, "PCS"));

        // No staged row carries this variant, so there is nothing to decide about.
        await Assert.ThrowsAsync<NotFoundException>(() => ResolutionService(db).CreateProductVariantAsync(
            new CreateProductVariantCommand(batchId, sourceKey), CancellationToken.None));

        Assert.Null(await new ImportReviewQueries(db).GetVariantPlanAsync(batchId, sourceKey, CancellationToken.None));
    }

    [PostgresFact]
    public async Task Distinct_product_values_are_listed_with_their_spellings_and_can_be_searched()
    {
        await using var db = database.CreateContext();
        var first = $"Mal A {Unique()}";
        var second = $"Mal B {Unique()}";
        var batchId = await StageAsync(db,
            new OrderLine(Product: first),
            new OrderLine(Product: $" {first.ToUpperInvariant()}"),
            new OrderLine(Product: second));
        var queries = new ImportReviewQueries(db);

        var products = Assert.Single(
            await queries.GetSummaryAsync(batchId, CancellationToken.None) ?? [],
            item => item.Kind == ImportResolutionKind.Product);
        Assert.Equal((2, 3), (products.DistinctValues, products.AffectedRows));

        var page = await queries.GetUnresolvedAsync(batchId, new UnresolvedQuery(ImportResolutionKind.Product), CancellationToken.None);
        var biggest = page!.Items[0];
        Assert.Equal((ImportSourceKeys.Name(first), 2, first), (biggest.SourceKey, biggest.AffectedRowCount, biggest.DisplayValue));
        Assert.Equal(2, biggest.SampleOriginalValues.Count);

        var filtered = await queries.GetUnresolvedAsync(
            batchId, new UnresolvedQuery(ImportResolutionKind.Product, Search: second), CancellationToken.None);
        Assert.Equal(ImportSourceKeys.Name(second), Assert.Single(filtered!.Items).SourceKey);
    }

    [PostgresFact]
    public async Task Products_and_variants_are_searched_as_choices_for_a_person()
    {
        await using var db = database.CreateContext();
        var marker = Unique();
        var product = await AddProductAsync(db, $"Süpürgə {marker}");
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var packs = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PACK");
        var small = await AddVariantAsync(db, product, pieces, "30");
        await AddVariantAsync(db, product, packs, "30");

        var alias = $"Supurge {marker}";
        product.AddAlias(alias);
        await db.SaveChangesAsync();

        var queries = new ReferenceSearchQueries(db);
        Assert.Equal(product.Id, Assert.Single(await queries.SearchProductsAsync($"Süpürgə {marker}", CancellationToken.None)).Id);

        // The alias is a way to find the product, not a second product.
        Assert.Equal(product.Id, Assert.Single(await queries.SearchProductsAsync(alias, CancellationToken.None)).Id);

        var variants = await queries.SearchProductVariantsAsync(product.Id, null, CancellationToken.None);
        Assert.Equal(2, variants.Count);
        Assert.Contains(variants, option => option.Id == small.Id && option.Label.Contains("30 CM") && option.Label.EndsWith("PCS"));

        // Variants of another product are never offered.
        var other = await AddProductAsync(db, $"Başqa {marker}");
        Assert.Empty(await queries.SearchProductVariantsAsync(other.Id, null, CancellationToken.None));
    }

    /// <summary>
    /// Two makes of one article are two variants of one product, and deciding them creates no product at all.
    /// </summary>
    /// <remarks>
    /// The real workbook does this on 17 lines: it names a product the catalog already has and puts a brand or a
    /// grit — BOSCH, Staunch, P40, P60 — in "Model/Kod". The catalog is inconsistent about it, holding some grits
    /// as products of their own. One product per real article is what a manager compares month over month, so the
    /// make belongs to the variant; five products called almost the same thing would split one trend into five.
    /// </remarks>
    [PostgresFact]
    public async Task Two_makes_of_one_article_are_two_variants_of_the_same_product()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Laqonda daşı almaz {Unique()}");
        var batchId = await StageAsync(db,
            new OrderLine(Product: product.Name, Model: "BOSCH"),
            new OrderLine(Product: product.Name, Model: "Staunch"));
        var productsBefore = await db.Products.CountAsync();

        // Each make is a decision of its own, because the model is part of what a variant is.
        var queries = new ImportReviewQueries(db);
        var page = await queries.GetUnresolvedAsync(
            batchId, new UnresolvedQuery(ImportResolutionKind.ProductVariant), CancellationToken.None);
        Assert.Equal(2, page!.Items.Count);
        Assert.All(page.Items, item => Assert.Equal(1, item.AffectedRowCount));

        var service = ResolutionService(db);
        foreach (var item in page.Items)
        {
            var plan = await queries.GetVariantPlanAsync(batchId, item.SourceKey, CancellationToken.None);
            Assert.True(plan!.CanCreate);
            await service.CreateProductVariantAsync(
                new CreateProductVariantCommand(batchId, item.SourceKey), CancellationToken.None);
        }

        await using var check = database.CreateContext();
        var variants = await check.ProductVariants.Where(variant => variant.ProductId == product.Id).ToListAsync();
        Assert.Equal(2, variants.Count);
        Assert.Equal<string?>(["BOSCH", "Staunch"], variants.Select(variant => variant.ModelCode).OrderBy(code => code, StringComparer.Ordinal));

        // Nothing was added to the product catalog: a make is not an article.
        Assert.Equal(productsBefore, await check.Products.CountAsync());

        var rows = await RowsAsync(check, batchId);
        Assert.All(rows, row => Assert.Equal<long?>(product.Id, row.MatchedProductId));
        Assert.Equal(2, rows.Select(row => row.MatchedProductVariantId).Distinct().Count());
        Assert.All(rows, row => Assert.DoesNotContain(row.Issues, issue => issue.IssueType == ImportIssueType.UnknownProductVariant));

        // And the cell the operator read is still on the row, spelled as the workbook spells it.
        Assert.Equal<string?>(["BOSCH", "Staunch"], rows.Select(row => row.OriginalModelCode).OrderBy(code => code, StringComparer.Ordinal));
    }

    /// <summary>One article number typed with different spacing is one variant, not two decisions.</summary>
    /// <remarks>
    /// The workbook's models are typed by hand: "№611320" appears beside "№ 611 320". <c>ModelCodeNormalizer</c>
    /// removes every space for exactly this reason, so the review has to offer this as a single piece of work —
    /// otherwise one make would be created twice and two orders for it would stop being comparable.
    /// </remarks>
    [PostgresFact]
    public async Task One_article_number_typed_two_ways_is_one_variant()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Laqonda daşı almaz {Unique()}");
        var batchId = await StageAsync(db,
            new OrderLine(Product: product.Name, Model: "№611320"),
            new OrderLine(Product: product.Name, Model: "№ 611 320"));

        var queries = new ImportReviewQueries(db);
        var page = await queries.GetUnresolvedAsync(
            batchId, new UnresolvedQuery(ImportResolutionKind.ProductVariant), CancellationToken.None);
        var value = Assert.Single(page!.Items);
        Assert.Equal(2, value.AffectedRowCount);

        await ResolutionService(db).CreateProductVariantAsync(
            new CreateProductVariantCommand(batchId, value.SourceKey), CancellationToken.None);

        await using var check = database.CreateContext();
        var variant = Assert.Single(await check.ProductVariants.Where(item => item.ProductId == product.Id).ToListAsync());
        var rows = await RowsAsync(check, batchId);
        Assert.All(rows, row => Assert.Equal<long?>(variant.Id, row.MatchedProductVariantId));

        // One variant, and both spellings still readable on their own rows.
        Assert.Equal<string?>(["№ 611 320", "№611320"], rows.Select(row => row.OriginalModelCode).OrderBy(code => code, StringComparer.Ordinal));
    }

    /// <summary>A make and the plain article are different variants: an empty model is a value of its own.</summary>
    [PostgresFact]
    public async Task An_article_with_no_make_is_not_the_same_variant_as_one_with_a_make()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Şkurka {Unique()}");
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var plain = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var batchId = await StageAsync(db,
            new OrderLine(Product: product.Name),
            new OrderLine(Product: product.Name, Model: "P40"));

        var rows = await RowsAsync(db, batchId);
        Assert.Equal<long?>(plain.Id, rows[0].MatchedProductVariantId);
        Assert.Null(rows[1].MatchedProductVariantId);
        Assert.DoesNotContain(rows[0].Issues, issue => issue.IssueType == ImportIssueType.UnknownProductVariant);
        Assert.Contains(rows[1].Issues, issue => issue.IssueType == ImportIssueType.UnknownProductVariant);
    }

    /// <summary>
    /// A variant is created from the cell as the operator corrected it, never from the text the workbook holds.
    /// </summary>
    /// <remarks>
    /// Excel turns a model code like "11 11 21" into the date 2021-11-11, and the import says so on the row. The
    /// operator then states what the cell should have said — and the whole point of that correction is that the
    /// catalog gets the typed value, not the date. Reading the workbook text here would either write the date
    /// into the catalog for good or refuse the creation with a message about rows that nobody changed.
    /// </remarks>
    [PostgresFact]
    public async Task A_variant_is_created_from_the_corrected_cell_and_not_from_the_workbook_text()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Yaramilla {Unique()}");
        var batchId = await StageAsync(db, new OrderLine(
            Product: product.Name, SpecificationValue: "25", SpecificationUnit: "kq", Model: new DateTime(2021, 11, 11)));

        var staged = Assert.Single(await RowsAsync(db, batchId));
        Assert.Equal("2021-11-11", staged.OriginalModelCode);
        Assert.Contains(staged.Issues, issue =>
            issue.IssueType == ImportIssueType.Other && issue.Message.Contains("stored this cell as a date"));

        await CorrectionService(db).ApplyAsync(
            new ApplyCorrectionCommand(batchId, staged.Id, ImportCorrectionField.ModelCode, "11 11 21"), CancellationToken.None);

        await using var reviewing = database.CreateContext();
        var corrected = Assert.Single(await RowsAsync(reviewing, batchId));
        var plan = await new ImportReviewQueries(reviewing).GetVariantPlanAsync(
            batchId, corrected.VariantSourceKey!, CancellationToken.None);

        // What the screen offers to create has to be what the operator asked for.
        Assert.Equal("11 11 21", plan!.ModelCode);
        Assert.True(plan.CanCreate);

        var result = await ResolutionService(reviewing).CreateProductVariantAsync(
            new CreateProductVariantCommand(batchId, corrected.VariantSourceKey!), CancellationToken.None);

        await using var check = database.CreateContext();
        var variant = await check.ProductVariants.SingleAsync(item => item.Id == result.TargetId);
        Assert.Equal("11 11 21", variant.ModelCode);

        // And the workbook still says what it always said.
        var finished = Assert.Single(await RowsAsync(check, batchId));
        Assert.Equal("2021-11-11", finished.OriginalModelCode);
        Assert.Equal<long?>(variant.Id, finished.MatchedProductVariantId);
    }

    /// <summary>The same for the specification: a corrected «Ölçü» is what the variant is built from.</summary>
    [PostgresFact]
    public async Task A_variant_is_created_from_the_corrected_specification()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Laqonda naqilli {Unique()}");
        var batchId = await StageAsync(db, new OrderLine(Product: product.Name, SpecificationValue: "12", SpecificationUnit: "mm"));

        var staged = Assert.Single(await RowsAsync(db, batchId));
        await CorrectionService(db).ApplyAsync(
            new ApplyCorrectionCommand(batchId, staged.Id, ImportCorrectionField.SpecificationValue, "125"), CancellationToken.None);

        await using var reviewing = database.CreateContext();
        var corrected = Assert.Single(await RowsAsync(reviewing, batchId));
        var plan = await new ImportReviewQueries(reviewing).GetVariantPlanAsync(
            batchId, corrected.VariantSourceKey!, CancellationToken.None);
        Assert.Equal("125", plan!.SpecificationValue);

        var result = await ResolutionService(reviewing).CreateProductVariantAsync(
            new CreateProductVariantCommand(batchId, corrected.VariantSourceKey!), CancellationToken.None);

        await using var check = database.CreateContext();
        Assert.Equal("125", (await check.ProductVariants.SingleAsync(item => item.Id == result.TargetId)).SpecificationValue);
        Assert.Equal("12", Assert.Single(await RowsAsync(check, batchId)).OriginalSpecificationValue);
    }

    /// <summary>
    /// One name the catalog does not have becomes one product with a variant per size and make — and the
    /// products that look like it are left exactly where they are.
    /// </summary>
    /// <remarks>
    /// The company's workbook writes seventeen lines under a single generic name where the catalog holds six
    /// older products spelled differently. The owner ruled that the workbook is the current truth and the six
    /// stay as historical fact, so the review makes one product and lets the specification and the model tell
    /// its variants apart. Two things have to hold for that to be safe: the catalog gains one product and not
    /// one per make, and nothing is written that would fold the older six into it — the decision is for this
    /// import, so no alias is saved.
    /// </remarks>
    [PostgresFact]
    public async Task One_generic_name_becomes_one_product_with_a_variant_for_each_make()
    {
        await using var db = database.CreateContext();
        var marker = Unique();
        var older = await AddProductAsync(db, $"Laqonda daşı dəmir üçün {marker}");
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var olderVariant = await AddVariantAsync(db, older, pieces, "115");

        var name = $"Laqonda daşı metal üçün {marker}";
        var batchId = await StageAsync(db,
            new OrderLine(Product: name, SpecificationValue: "115", SpecificationUnit: "mm", Model: "Alevs"),
            new OrderLine(Product: name, SpecificationValue: "115", SpecificationUnit: "mm", Model: "Alevs"),
            // The same make and size, ordered in a unit somebody typed with a capital: one variant, not two.
            new OrderLine(Product: name, SpecificationValue: "115", SpecificationUnit: "mm", Model: "Skom", OrderUnit: "Ədəd"),
            new OrderLine(Product: name, SpecificationValue: "115", SpecificationUnit: "mm", Model: "Skom"),
            new OrderLine(Product: name, SpecificationValue: "230", SpecificationUnit: "mm"));
        var productsBefore = await db.Products.CountAsync();
        var service = ResolutionService(db);

        var product = await service.CreateProductAsync(
            new CreateProductCommand(batchId, ImportSourceKeys.Name(name)!, name, null, ResolutionScope.BatchOnly),
            CancellationToken.None);
        Assert.Equal((ResolutionOutcome.Applied, 5, false), (product.Outcome, product.AffectedRows, product.AliasSaved));

        await using var reviewing = database.CreateContext();
        var queries = new ImportReviewQueries(reviewing);
        var page = await queries.GetUnresolvedAsync(
            batchId, new UnresolvedQuery(ImportResolutionKind.ProductVariant), CancellationToken.None);

        // Three variants for five lines: size and make tell them apart, the capital letter does not.
        Assert.Equal(3, page!.Items.Count);
        Assert.Equal([1, 2, 2], page.Items.Select(item => item.AffectedRowCount).Order());

        foreach (var item in page.Items)
        {
            await ResolutionService(reviewing).CreateProductVariantAsync(
                new CreateProductVariantCommand(batchId, item.SourceKey), CancellationToken.None);
        }

        await using var check = database.CreateContext();
        var created = await check.ProductVariants
            .Where(variant => variant.ProductId == product.TargetId).ToListAsync();
        Assert.Equal(3, created.Count);
        Assert.Equal<string?>(
            [null, "Alevs", "Skom"],
            created.Select(variant => variant.ModelCode).OrderBy(code => code, StringComparer.Ordinal));

        // One product, not one per make, and the older one is untouched — still there, still with its own variant.
        Assert.Equal(productsBefore + 1, await check.Products.CountAsync());
        Assert.True(await check.Products.AnyAsync(item => item.Id == older.Id && item.IsActive));
        Assert.Single(await check.ProductVariants.Where(variant => variant.ProductId == older.Id).ToListAsync());
        Assert.Equal(older.Id, (await check.ProductVariants.SingleAsync(v => v.Id == olderVariant.Id)).ProductId);

        // Nothing was written that would make the older name resolve to the new product in a later import.
        Assert.Empty(await check.ProductAliases.Where(alias => alias.ProductId == product.TargetId).ToListAsync());

        var rows = await RowsAsync(check, batchId);
        Assert.All(rows, row => Assert.Equal<long?>(product.TargetId, row.MatchedProductId));
        Assert.All(rows, row => Assert.NotNull(row.MatchedProductVariantId));
        Assert.Equal(rows[2].MatchedProductVariantId, rows[3].MatchedProductVariantId);
    }

    private static async Task<Product> AddProductAsync(BaxOrdersDbContext db, string name)
    {
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(CancellationToken.None), name);
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return product;
    }

    private static async Task<ProductVariant> AddVariantAsync(
        BaxOrdersDbContext db, Product product, UnitOfMeasure orderUnit, string? specification = null)
    {
        var specificationUnit = specification is null ? null : await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "CM");
        var variant = product.AddVariant(specification, specificationUnit, null, orderUnit);
        await db.SaveChangesAsync();
        return variant;
    }

    private static Task<List<ImportRow>> RowsAsync(BaxOrdersDbContext db, long importBatchId) =>
        db.ImportRows.AsNoTracking()
            .Include(row => row.Issues)
            .Where(row => row.ImportBatchId == importBatchId)
            .OrderBy(row => row.RowNumber)
            .ToListAsync();

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];
}
