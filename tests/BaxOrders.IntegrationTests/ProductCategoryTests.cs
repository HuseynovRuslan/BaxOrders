using BaxOrders.Application.Catalog;
using BaxOrders.Application.Common;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportedOrders;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Giving products a canonical category from what the import history actually says, against a real PostgreSQL.
/// </summary>
/// <remarks>
/// Every product here comes through the real import pipeline, so its evidence is genuine provenance rather
/// than rows written to look like it. The database is shared with the rest of the suite and a safe
/// application is by nature catalog-wide, so each test asserts about the products it made itself, and reads
/// counts as a before-and-after difference rather than as an absolute — the same discipline the dashboard and
/// approval-inbox tests already follow, and for the same reason.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ProductCategoryTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    // ---- what the evidence means -------------------------------------------------------------------

    [PostgresFact]
    public async Task One_category_through_the_whole_history_is_a_safe_match()
    {
        var category = await CategoryAsync("Təmizlik", "Təmizlik ləvazimatı", "Təmizlik bezi");
        var productId = await ImportedProductAsync(
            Line(category, quantity: 10),
            Line(category, quantity: 4));

        var row = await RowAsync(productId);

        Assert.Equal(ProductCategoryState.UniqueEvidence, row.State);
        Assert.Null(row.CurrentCategoryId);
        var evidence = Assert.Single(row.Evidence);
        Assert.Equal(category.Id, evidence.CategoryId);
        Assert.Equal(2, evidence.Occurrences);
        Assert.Equal(["Təmizlik", "Təmizlik ləvazimatı", "Təmizlik bezi"], evidence.Path);
    }

    [PostgresFact]
    public async Task The_same_category_across_several_variants_is_still_one_safe_match()
    {
        var category = await CategoryAsync("Təmizlik", "Təmizlik ləvazimatı", "Süpürgə");

        // Three different specifications, so three different variants of one product.
        var productId = await ImportedProductAsync(
            Line(category, specification: "30", specificationUnit: "sm"),
            Line(category, specification: "40", specificationUnit: "sm"),
            Line(category, specification: "50", specificationUnit: "sm"));

        var row = await RowAsync(productId);

        // The canonical category belongs to the product, so its variants are one body of evidence, not three.
        Assert.Equal(ProductCategoryState.UniqueEvidence, row.State);
        Assert.Equal(3, Assert.Single(row.Evidence).Occurrences);
        Assert.Equal(3, await VariantCountAsync(productId));
    }

    [PostgresFact]
    public async Task Two_different_categories_make_a_product_ambiguous()
    {
        var cloth = await CategoryAsync("Təmizlik", "Təmizlik ləvazimatı", "Təmizlik bezi");
        var disinfectant = await CategoryAsync("Ofis", "Kimyəvi vasitələr", "Dezinfeksiya");

        var productId = await ImportedProductAsync(
            Line(cloth, quantity: 10),
            Line(disinfectant, quantity: 4));

        var row = await RowAsync(productId);

        Assert.Equal(ProductCategoryState.Ambiguous, row.State);
        Assert.Null(row.CurrentCategoryId);
        Assert.Equal(
            [cloth.Id, disinfectant.Id],
            row.Evidence.Select(entry => entry.CategoryId).Order());
    }

    [PostgresFact]
    public async Task A_product_with_no_import_history_has_nothing_to_go_on()
    {
        var productId = await BareProductAsync();

        var row = await RowAsync(productId);

        Assert.Equal(ProductCategoryState.NoEvidence, row.State);
        Assert.Empty(row.Evidence);
        Assert.Null(row.CurrentCategoryId);
    }

    [PostgresFact]
    public async Task A_product_that_already_has_a_category_reads_as_assigned_whatever_its_history_says()
    {
        var cloth = await CategoryAsync("Təmizlik", "Təmizlik ləvazimatı", "Təmizlik bezi");
        var disinfectant = await CategoryAsync("Ofis", "Kimyəvi vasitələr", "Dezinfeksiya");
        var productId = await ImportedProductAsync(Line(cloth), Line(disinfectant));

        // Somebody settled the conflict; the history still disagrees with itself and still shows.
        await AssignAsync(productId, cloth.Id, "Ambiguity resolved by hand");

        var row = await RowAsync(productId);

        Assert.Equal(ProductCategoryState.Assigned, row.State);
        Assert.Equal(cloth.Id, row.CurrentCategoryId);
        Assert.Equal(["Təmizlik", "Təmizlik ləvazimatı", "Təmizlik bezi"], row.CurrentCategoryPath);
        Assert.Equal(2, row.Evidence.Count);
    }

    // ---- the safe application ----------------------------------------------------------------------

    [PostgresFact]
    public async Task A_safe_application_fills_in_only_the_products_whose_history_agrees()
    {
        var brush = await CategoryAsync("Təmizlik", "Təmizlik ləvazimatı", "Fırça");
        var chemical = await CategoryAsync("Təmizlik", "Təmizlik kimyəvi maddələr", "Döşəmə təmizləyici");

        var safe = await ImportedProductAsync(Line(brush), Line(brush));
        var conflicted = await ImportedProductAsync(Line(brush), Line(chemical));
        var bare = await BareProductAsync();

        var result = await ApplySafeAsync();

        Assert.True(result.AssignedCount >= 1);
        Assert.Equal(brush.Id, await CategoryIdAsync(safe));
        Assert.Null(await CategoryIdAsync(conflicted));
        Assert.Null(await CategoryIdAsync(bare));
    }

    [PostgresFact]
    public async Task An_ambiguous_product_is_never_settled_by_the_larger_count()
    {
        var cloth = await CategoryAsync("Təmizlik", "Təmizlik ləvazimatı", "Təmizlik bezi");
        var disinfectant = await CategoryAsync("Ofis", "Kimyəvi vasitələr", "Dezinfeksiya");

        // Eighteen against one: a majority, and still not an answer.
        var lines = Enumerable.Range(0, 18).Select(_ => Line(cloth)).Append(Line(disinfectant)).ToArray();
        var productId = await ImportedProductAsync(lines);

        await ApplySafeAsync();

        Assert.Null(await CategoryIdAsync(productId));
        var row = await RowAsync(productId);
        Assert.Equal(ProductCategoryState.Ambiguous, row.State);
        Assert.Equal([18, 1], row.Evidence.Select(entry => entry.Occurrences));
    }

    [PostgresFact]
    public async Task A_safe_application_never_overwrites_a_category_somebody_decided()
    {
        var recorded = await CategoryAsync("Usta", "Tikinti ləvazimatı", "Material");
        var evidenced = await CategoryAsync("Usta", "Tikinti ləvazimatı", "Əl alətləri");

        // Its history agrees on one category; a person put it somewhere else on purpose.
        var productId = await ImportedProductAsync(Line(evidenced), Line(evidenced));
        await AssignAsync(productId, recorded.Id, "Kept where the catalogue wants it");

        await ApplySafeAsync();

        Assert.Equal(recorded.Id, await CategoryIdAsync(productId));
    }

    [PostgresFact]
    public async Task Applying_twice_changes_nothing_the_second_time()
    {
        var category = await CategoryAsync("Yaşıllıq", "Yaşıllıq texnikası", "Ehtiyat hissələri");
        var productId = await ImportedProductAsync(Line(category), Line(category));

        var first = await ApplySafeAsync();
        var second = await ApplySafeAsync();

        Assert.True(first.AssignedCount >= 1);
        Assert.Equal(0, second.AssignedCount);
        Assert.Equal(category.Id, await CategoryIdAsync(productId));

        // And exactly one decision is on record for it, not two.
        await using var db = database.CreateContext();
        Assert.Single(await db.ProductCategoryDecisions.Where(item => item.ProductId == productId).ToListAsync());
    }

    [PostgresFact]
    public async Task A_safe_application_records_who_ran_it_against_every_product_it_filled_in()
    {
        var category = await CategoryAsync("Suvarma", "Boru və fitinqlər", "Material");
        var productId = await ImportedProductAsync(Line(category));

        var actor = await UserAsync(admin: false, "Kataloq koordinatoru");
        await ApplySafeAsync(actor);

        await using var db = database.CreateContext();
        var decision = await db.ProductCategoryDecisions.SingleAsync(item => item.ProductId == productId);

        Assert.Equal(ProductCategoryDecisionType.AutoUniqueEvidence, decision.DecisionType);
        Assert.Equal(actor.UserId, decision.ActorUserId);
        Assert.Equal("Kataloq koordinatoru", decision.ActorDisplayName);
        Assert.Null(decision.PreviousCategoryId);
        Assert.Equal(category.Id, decision.NewCategoryId);
        Assert.Null(decision.Reason);
    }

    // ---- a person's decision -----------------------------------------------------------------------

    [PostgresFact]
    public async Task A_manual_decision_sets_the_category_and_says_who_made_it_and_why()
    {
        var cloth = await CategoryAsync("Təmizlik", "Təmizlik ləvazimatı", "Təmizlik bezi");
        var disinfectant = await CategoryAsync("Ofis", "Kimyəvi vasitələr", "Dezinfeksiya");
        var productId = await ImportedProductAsync(Line(cloth), Line(disinfectant));

        var actor = await UserAsync(admin: true, "Kataloq administratoru");
        var decision = await AssignAsync(productId, disinfectant.Id, "Anbar təsdiqlədi", actor);

        Assert.Equal(ProductCategoryDecisionType.Manual, decision.DecisionType);
        Assert.Equal(actor.UserId, decision.ActorUserId);
        Assert.Equal("Kataloq administratoru", decision.ActorDisplayName);
        Assert.Equal("Anbar təsdiqlədi", decision.Reason);
        Assert.Null(decision.PreviousCategoryId);
        Assert.Equal(["Ofis", "Kimyəvi vasitələr", "Dezinfeksiya"], decision.NewCategoryPath);
        Assert.Equal(disinfectant.Id, await CategoryIdAsync(productId));
    }

    [PostgresFact]
    public async Task Changing_a_decided_category_records_what_it_was_before()
    {
        var first = await CategoryAsync("Usta", "Tikinti ləvazimatı", "Material");
        var second = await CategoryAsync("Usta", "Tikinti ləvazimatı", "Əl alətləri");
        var productId = await ImportedProductAsync(Line(first));

        await AssignAsync(productId, first.Id);
        var changed = await AssignAsync(productId, second.Id, "Yenidən baxıldı");

        Assert.Equal(first.Id, changed.PreviousCategoryId);
        Assert.Equal(second.Id, changed.NewCategoryId);
        Assert.Equal(second.Id, await CategoryIdAsync(productId));

        var history = await DecisionsAsync(productId);
        Assert.Equal(2, history.Count);
        Assert.Equal(second.Id, history[0].NewCategoryId);
    }

    [PostgresFact]
    public async Task A_category_that_does_not_exist_is_refused()
    {
        var productId = await BareProductAsync();

        await Assert.ThrowsAsync<ValidationException>(() => AssignAsync(productId, categoryId: -1));
    }

    [PostgresFact]
    public async Task A_category_the_catalogue_no_longer_offers_is_refused()
    {
        var category = await CategoryAsync("Ofis", "Ofis ləvazimatı", "Kağız");
        var productId = await BareProductAsync();

        await using (var db = database.CreateContext())
        {
            var stored = await db.Categories.SingleAsync(item => item.Id == category.Id);
            stored.Deactivate();
            await db.SaveChangesAsync();
        }

        await Assert.ThrowsAsync<ValidationException>(() => AssignAsync(productId, category.Id));
        Assert.Null(await CategoryIdAsync(productId));
    }

    [PostgresFact]
    public async Task A_product_that_does_not_exist_is_refused()
    {
        var category = await CategoryAsync("Ofis", "Ofis ləvazimatı", "Qələm");

        await Assert.ThrowsAsync<NotFoundException>(() => AssignAsync(-1, category.Id));
    }

    [PostgresFact]
    public async Task Putting_a_product_where_it_already_is_is_refused_rather_than_recorded_twice()
    {
        var category = await CategoryAsync("Ofis", "Ofis ləvazimatı", "Qovluq");
        var productId = await ImportedProductAsync(Line(category));
        await AssignAsync(productId, category.Id);

        await Assert.ThrowsAsync<DomainException>(() => AssignAsync(productId, category.Id));

        await using var db = database.CreateContext();
        Assert.Single(await db.ProductCategoryDecisions.Where(item => item.ProductId == productId).ToListAsync());
    }

    [PostgresFact]
    public async Task Nobody_signed_in_may_decide_anything()
    {
        var category = await CategoryAsync("Ofis", "Ofis ləvazimatı", "Zərf");
        var productId = await ImportedProductAsync(Line(category));

        await using var db = database.CreateContext();
        var service = new ProductCategoryService(db, TestCurrentUser.Anonymous());

        await Assert.ThrowsAsync<ForbiddenException>(() => service.ApplySafeAsync(None));
        await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.AssignAsync(productId, new AssignProductCategoryCommand(category.Id), None));
        Assert.Null(await CategoryIdAsync(productId));
    }

    // ---- the history stays as it was ---------------------------------------------------------------

    [PostgresFact]
    public async Task Deciding_a_category_never_rewrites_the_rows_that_suggested_it()
    {
        var evidenced = await CategoryAsync("Təmizlik", "Təmizlik ləvazimatı", "Vedrə");
        var chosen = await CategoryAsync("Ofis", "Ofis ləvazimatı", "Səbət");
        var productId = await ImportedProductAsync(Line(evidenced), Line(evidenced));

        var before = await ImportHistoryAsync(productId);

        await ApplySafeAsync();
        await AssignAsync(productId, chosen.Id, "Yeri dəyişdirildi");

        var after = await ImportHistoryAsync(productId);

        // What the workbook contained, what the review resolved, and which line each row became: untouched.
        Assert.Equal(before, after);
        Assert.Equal(chosen.Id, await CategoryIdAsync(productId));

        // The evidence still reads as it did, and still names the category the workbook actually said.
        var row = await RowAsync(productId);
        Assert.Equal(evidenced.Id, Assert.Single(row.Evidence).CategoryId);
    }

    // ---- searching, filtering, paging, and the summary ----------------------------------------------

    [PostgresFact]
    public async Task Search_matches_the_product_name_or_its_code()
    {
        var category = await CategoryAsync("Ofis", "Ofis ləvazimatı", "Steplər");
        var productId = await ImportedProductAsync(Line(category));

        await using var db = database.CreateContext();
        var product = await db.Products.SingleAsync(item => item.Id == productId);

        var byName = await ListAsync(new ProductCategoryQuery(Search: product.Name));
        Assert.Equal(productId, Assert.Single(byName.Rows.Items).ProductId);

        var byCode = await ListAsync(new ProductCategoryQuery(Search: product.Code));
        Assert.Contains(byCode.Rows.Items, row => row.ProductId == productId);

        var byNothing = await ListAsync(new ProductCategoryQuery(Search: $"yoxdur-{Guid.NewGuid():N}"));
        Assert.Empty(byNothing.Rows.Items);
    }

    [PostgresFact]
    public async Task The_filter_narrows_to_one_state_while_the_summary_keeps_describing_all_of_them()
    {
        var first = await CategoryAsync("Yaşıllıq", "Yaşıllıq ləvazimatı", "Toxum");
        var second = await CategoryAsync("Yaşıllıq", "Yaşıllıq ləvazimatı", "Gübrə");

        var before = await SummaryAsync();
        var safe = await ImportedProductAsync(Line(first), Line(first));
        var conflicted = await ImportedProductAsync(Line(first), Line(second));
        var bare = await BareProductAsync();
        var after = await SummaryAsync();

        Assert.Equal(3, after.TotalProductCount - before.TotalProductCount);
        Assert.Equal(1, after.UniqueEvidenceCount - before.UniqueEvidenceCount);
        Assert.Equal(1, after.AmbiguousCount - before.AmbiguousCount);
        Assert.Equal(1, after.NoEvidenceCount - before.NoEvidenceCount);

        var ambiguous = await ListAsync(new ProductCategoryQuery(Filter: ProductCategoryFilter.Ambiguous, PageSize: 100));
        Assert.Contains(ambiguous.Rows.Items, row => row.ProductId == conflicted);
        Assert.DoesNotContain(ambiguous.Rows.Items, row => row.ProductId == safe || row.ProductId == bare);

        // Narrowing the rows never narrows the summary: it is the whole catalogue either way.
        Assert.Equal(after, ambiguous.Summary);
    }

    [PostgresFact]
    public async Task An_unknown_filter_is_refused()
    {
        await Assert.ThrowsAsync<ValidationException>(() =>
            ListAsync(new ProductCategoryQuery(Filter: (ProductCategoryFilter)99)));
    }

    [PostgresFact]
    public async Task Paging_defaults_to_twenty_five_and_is_capped_at_a_hundred()
    {
        var byDefault = await ListAsync(new ProductCategoryQuery());
        Assert.Equal(ProductCategoryQueries.DefaultPageSize, byDefault.Rows.PageSize);

        var capped = await ListAsync(new ProductCategoryQuery(PageSize: 1000));
        Assert.Equal(ProductCategoryQueries.MaxPageSize, capped.Rows.PageSize);
    }

    // ---- fixture -----------------------------------------------------------------------------------

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];

    /// <summary>One line of a workbook, in the category whose path it should resolve to.</summary>
    private static OrderLine Line(
        CategoryPath category,
        double quantity = 10,
        string? specification = null,
        string? specificationUnit = null) =>
        new(
            Quantity: quantity,
            MainCategory: category.Root,
            MiddleCategory: category.Middle,
            SubCategory: category.Leaf,
            SpecificationValue: specification,
            SpecificationUnit: specificationUnit);

    /// <summary>A three-level path the import matcher can resolve, reusing whatever already exists.</summary>
    private async Task<CategoryPath> CategoryAsync(string root, string middle, string leaf)
    {
        await using var db = database.CreateContext();

        var rootNode = await db.Categories.FirstOrDefaultAsync(item => item.Name == root && item.ParentId == null);
        if (rootNode is null)
        {
            rootNode = Category.CreateRoot(root);
            db.Categories.Add(rootNode);
            await db.SaveChangesAsync();
        }

        var middleNode = await db.Categories.FirstOrDefaultAsync(item => item.Name == middle && item.ParentId == rootNode.Id);
        if (middleNode is null)
        {
            middleNode = rootNode.AddChild(middle);
            await db.SaveChangesAsync();
        }

        var leafNode = await db.Categories.FirstOrDefaultAsync(item => item.Name == leaf && item.ParentId == middleNode.Id);
        if (leafNode is null)
        {
            leafNode = middleNode.AddChild(leaf);
            await db.SaveChangesAsync();
        }

        return new CategoryPath(leafNode.Id, root, middle, leaf);
    }

    /// <summary>A product that really came through an import, so its category evidence is real provenance.</summary>
    private async Task<long> ImportedProductAsync(params OrderLine[] lines)
    {
        await using var db = database.CreateContext();
        var imported = await ImportAsync(db, lines);

        return await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == imported.ImportBatchId && row.MatchedProductId != null)
            .Select(row => row.MatchedProductId!.Value)
            .Distinct()
            .SingleAsync();
    }

    /// <summary>A product somebody added to the catalogue by hand: no workbook ever mentioned it.</summary>
    private async Task<long> BareProductAsync()
    {
        await using var db = database.CreateContext();
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Kataloq malı {Unique()}");
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return product.Id;
    }

    private async Task<TestCurrentUser> UserAsync(bool admin, string displayName)
    {
        await using var db = database.CreateContext();
        return admin
            ? await TestCurrentUser.AdminAsync(db, displayName)
            : await TestCurrentUser.CoordinatorAsync(db, displayName);
    }

    private async Task<ProductCategoryRowDto> RowAsync(long productId)
    {
        await using var db = database.CreateContext();
        var product = await db.Products.AsNoTracking().SingleAsync(item => item.Id == productId);
        var list = await new ProductCategoryQueries(db).GetAsync(
            new ProductCategoryQuery(Search: product.Code, PageSize: 100), None);
        return list.Rows.Items.Single(row => row.ProductId == productId);
    }

    private async Task<ProductCategoryListDto> ListAsync(ProductCategoryQuery query)
    {
        await using var db = database.CreateContext();
        return await new ProductCategoryQueries(db).GetAsync(query, None);
    }

    private async Task<ProductCategorySummaryDto> SummaryAsync()
    {
        await using var db = database.CreateContext();
        return await new ProductCategoryQueries(db).GetSummaryAsync(None);
    }

    private async Task<IReadOnlyList<ProductCategoryDecisionDto>> DecisionsAsync(long productId)
    {
        await using var db = database.CreateContext();
        return await new ProductCategoryQueries(db).GetDecisionsAsync(productId, None);
    }

    private async Task<ApplySafeCategoriesResultDto> ApplySafeAsync(TestCurrentUser? actor = null)
    {
        await using var db = database.CreateContext();
        var user = actor ?? await TestCurrentUser.CoordinatorAsync(db, "Kataloq koordinatoru");
        return await new ProductCategoryService(db, user).ApplySafeAsync(None);
    }

    private async Task<ProductCategoryDecisionDto> AssignAsync(
        long productId, int categoryId, string? reason = null, TestCurrentUser? actor = null)
    {
        await using var db = database.CreateContext();
        var user = actor ?? await TestCurrentUser.AdminAsync(db, "Kataloq administratoru");
        return await new ProductCategoryService(db, user)
            .AssignAsync(productId, new AssignProductCategoryCommand(categoryId, reason), None);
    }

    private async Task<int?> CategoryIdAsync(long productId)
    {
        await using var db = database.CreateContext();
        return await db.Products.AsNoTracking()
            .Where(item => item.Id == productId)
            .Select(item => item.CategoryId)
            .SingleAsync();
    }

    private async Task<int> VariantCountAsync(long productId)
    {
        await using var db = database.CreateContext();
        return await db.ProductVariants.CountAsync(variant => variant.ProductId == productId);
    }

    /// <summary>Everything the import recorded about this product's rows, as one comparable snapshot.</summary>
    private async Task<string> ImportHistoryAsync(long productId)
    {
        await using var db = database.CreateContext();
        var rows = await db.ImportRows.AsNoTracking()
            .Where(row => row.MatchedProductId == productId)
            .OrderBy(row => row.Id)
            .Select(row => new
            {
                row.Id,
                row.MatchedCategoryId,
                row.MatchedProductId,
                row.OriginalMainCategory,
                row.OriginalMiddleCategory,
                row.OriginalSubCategory,
                row.ValidationStatus,
                Materialized = db.ImportRowMaterializations
                    .Where(link => link.ImportRowId == row.Id)
                    .Select(link => (long?)link.OrderRequestItemId)
                    .FirstOrDefault(),
            })
            .ToListAsync();

        return string.Join("|", rows.Select(row =>
            $"{row.Id}:{row.MatchedCategoryId}:{row.MatchedProductId}:{row.OriginalMainCategory}"
            + $"/{row.OriginalMiddleCategory}/{row.OriginalSubCategory}:{row.ValidationStatus}:{row.Materialized}"));
    }

    private sealed record CategoryPath(int Id, string Root, string Middle, string Leaf);
}
