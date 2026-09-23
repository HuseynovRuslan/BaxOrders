using System.Net;
using System.Net.Http.Json;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Catalog;
using BaxOrders.Domain.Catalog;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportedOrders;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Who may look at the catalogue's categories and who may change them, over real HTTP with real cookies and
/// real antiforgery tokens.
/// </summary>
/// <remarks>
/// Reading is open to everybody signed in, because a manager has every reason to see which products the
/// catalogue cannot yet speak for. Changing what it claims is a coordinator's or an administrator's work, and
/// the refusal a manager gets comes from the real authorization policy, not from a screen hiding a button.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ProductCategoryEndToEndTests(PostgresDatabaseFixture database) : IAsyncLifetime
{
    private WebApplicationFactory<Program> factory = null!;

    public Task InitializeAsync()
    {
        factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:BaxOrders", PostgresDatabaseFixture.ConnectionString);
        });

        return Task.CompletedTask;
    }

    public async Task DisposeAsync() => await factory.DisposeAsync();

    // ---- reading -----------------------------------------------------------------------------------

    [PostgresFact]
    public async Task Everybody_signed_in_may_read_the_catalogue_and_a_stranger_may_not()
    {
        foreach (var role in new[] { BaxOrdersRoles.Coordinator, BaxOrdersRoles.Manager, BaxOrdersRoles.Admin })
        {
            using var session = await SignedInAsync(role);
            Assert.Equal(HttpStatusCode.OK, (await session.GetAsync("/api/v1/catalog/product-categories")).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await session.GetAsync("/api/v1/catalog/product-categories/summary")).StatusCode);
        }

        using var anonymous = AuthenticatedApi.Anonymous(factory);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/catalog/product-categories")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/catalog/product-categories/summary")).StatusCode);
    }

    [PostgresFact]
    public async Task A_product_reads_with_its_evidence_and_the_whole_category_path()
    {
        var category = await CategoryAsync("Təmizlik", "Təmizlik ləvazimatı", "Mop");
        var productId = await ImportedProductAsync(Line(category), Line(category));

        using var session = await SignedInAsync(BaxOrdersRoles.Manager);
        var row = await RowAsync(session, productId);

        Assert.Equal(ProductCategoryState.UniqueEvidence, row.State);
        Assert.Equal(["Təmizlik", "Təmizlik ləvazimatı", "Mop"], Assert.Single(row.Evidence).Path);
        Assert.Equal(2, row.Evidence[0].Occurrences);
    }

    // ---- writing -----------------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_manager_may_not_apply_safe_matches_nor_choose_a_category()
    {
        var category = await CategoryAsync("Ofis", "Ofis ləvazimatı", "Marker");
        var productId = await ImportedProductAsync(Line(category));

        using var manager = await SignedInAsync(BaxOrdersRoles.Manager);

        var applied = await AuthenticatedApi.PostAsync(manager, "/api/v1/catalog/product-categories/apply-safe", new { });
        var assigned = await AuthenticatedApi.PostAsync(
            manager, $"/api/v1/catalog/products/{productId}/category", new { categoryId = category.Id });

        Assert.Equal(HttpStatusCode.Forbidden, applied.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, assigned.StatusCode);
        Assert.Null(await CategoryIdAsync(productId));
    }

    [PostgresFact]
    public async Task A_stranger_may_not_write_at_all()
    {
        var category = await CategoryAsync("Ofis", "Ofis ləvazimatı", "Kalkulyator");
        var productId = await ImportedProductAsync(Line(category));

        using var anonymous = AuthenticatedApi.Anonymous(factory);

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await AuthenticatedApi.PostAsync(anonymous, "/api/v1/catalog/product-categories/apply-safe", new { })).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await AuthenticatedApi.PostAsync(anonymous, $"/api/v1/catalog/products/{productId}/category", new { categoryId = category.Id })).StatusCode);
        Assert.Null(await CategoryIdAsync(productId));
    }

    [PostgresFact]
    public async Task A_coordinator_applies_the_safe_matches_and_the_record_names_them()
    {
        var category = await CategoryAsync("Yaşıllıq", "Yaşıllıq ləvazimatı", "Şitil");
        var productId = await ImportedProductAsync(Line(category), Line(category));

        var coordinator = await AuthenticatedApi.CreateUserAsync(factory, BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        using var session = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(session, coordinator.UserName, coordinator.Password);

        var response = await AuthenticatedApi.PostAsync(session, "/api/v1/catalog/product-categories/apply-safe", new { });
        response.EnsureSuccessStatusCode();
        var result = (await response.Content.ReadFromJsonAsync<ApplySafeCategoriesResultDto>(AuthenticatedApi.Json))!;

        Assert.True(result.AssignedCount >= 1);
        Assert.Equal(category.Id, await CategoryIdAsync(productId));

        await using var db = database.CreateContext();
        var decision = await db.ProductCategoryDecisions.SingleAsync(item => item.ProductId == productId);
        Assert.Equal(ProductCategoryDecisionType.AutoUniqueEvidence, decision.DecisionType);
        Assert.Equal(coordinator.Id, decision.ActorUserId);
        Assert.Equal("Sınaq koordinatoru", decision.ActorDisplayName);
    }

    [PostgresFact]
    public async Task An_administrator_settles_an_ambiguous_product_and_it_leaves_the_conflicted_list()
    {
        var cloth = await CategoryAsync("Təmizlik", "Təmizlik ləvazimatı", "Salfet");
        var chemical = await CategoryAsync("Təmizlik", "Təmizlik kimyəvi maddələr", "Sabun");
        var productId = await ImportedProductAsync(Line(cloth), Line(chemical));

        var admin = await AuthenticatedApi.CreateUserAsync(factory, BaxOrdersRoles.Admin, "Sınaq administratoru");
        using var session = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(session, admin.UserName, admin.Password);

        Assert.Equal(ProductCategoryState.Ambiguous, (await RowAsync(session, productId)).State);

        var response = await AuthenticatedApi.PostAsync(
            session,
            $"/api/v1/catalog/products/{productId}/category",
            new { categoryId = chemical.Id, reason = "Anbar təsdiqlədi" });
        response.EnsureSuccessStatusCode();

        var decision = (await response.Content.ReadFromJsonAsync<ProductCategoryDecisionDto>(AuthenticatedApi.Json))!;
        Assert.Equal(ProductCategoryDecisionType.Manual, decision.DecisionType);
        Assert.Equal(admin.Id, decision.ActorUserId);
        Assert.Equal("Anbar təsdiqlədi", decision.Reason);

        var settled = await RowAsync(session, productId);
        Assert.Equal(ProductCategoryState.Assigned, settled.State);
        Assert.Equal(chemical.Id, settled.CurrentCategoryId);
        // The history it was settled against is still both categories; the decision did not rewrite it.
        Assert.Equal(2, settled.Evidence.Count);
    }

    [PostgresFact]
    public async Task A_category_the_catalogue_does_not_have_is_refused_with_a_400()
    {
        var category = await CategoryAsync("Ofis", "Ofis ləvazimatı", "Dəftər");
        var productId = await ImportedProductAsync(Line(category));

        using var session = await SignedInAsync(BaxOrdersRoles.Admin);
        var response = await AuthenticatedApi.PostAsync(
            session, $"/api/v1/catalog/products/{productId}/category", new { categoryId = -1 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Null(await CategoryIdAsync(productId));
    }

    [PostgresFact]
    public async Task A_product_the_catalogue_does_not_have_is_refused_with_a_404()
    {
        var category = await CategoryAsync("Ofis", "Ofis ləvazimatı", "Cetvel");

        using var session = await SignedInAsync(BaxOrdersRoles.Admin);
        var response = await AuthenticatedApi.PostAsync(
            session, "/api/v1/catalog/products/-1/category", new { categoryId = category.Id });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ---- fixture -----------------------------------------------------------------------------------

    private static OrderLine Line(CategoryPath category) =>
        new(MainCategory: category.Root, MiddleCategory: category.Middle, SubCategory: category.Leaf);

    private async Task<HttpClient> SignedInAsync(string role)
    {
        var account = await AuthenticatedApi.CreateUserAsync(factory, role, $"Sınaq {role}");
        var client = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(client, account.UserName, account.Password);
        return client;
    }

    private async Task<ProductCategoryRowDto> RowAsync(HttpClient client, long productId)
    {
        await using var db = database.CreateContext();
        var code = await db.Products.AsNoTracking()
            .Where(item => item.Id == productId).Select(item => item.Code).SingleAsync();

        var response = await client.GetAsync(
            $"/api/v1/catalog/product-categories?search={Uri.EscapeDataString(code)}&pageSize=100");
        response.EnsureSuccessStatusCode();
        var list = (await response.Content.ReadFromJsonAsync<ProductCategoryListDto>(AuthenticatedApi.Json))!;
        return list.Rows.Items.Single(row => row.ProductId == productId);
    }

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

    private async Task<int?> CategoryIdAsync(long productId)
    {
        await using var db = database.CreateContext();
        return await db.Products.AsNoTracking()
            .Where(item => item.Id == productId).Select(item => item.CategoryId).SingleAsync();
    }

    private sealed record CategoryPath(int Id, string Root, string Middle, string Leaf);
}
