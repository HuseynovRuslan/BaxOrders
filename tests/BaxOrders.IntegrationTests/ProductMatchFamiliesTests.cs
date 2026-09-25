using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Catalog.ProductMatches;
using BaxOrders.Application.Imports;
using BaxOrders.Domain.Catalog;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Task 13b, criterion 8's API half: "Məhsullar və variantlar" — each base product with the products an administrator
/// approved as its variants. A view of the live variant links and nothing else; every product in it stays a product of
/// its own (13.1, "bir mala birləşmir").
/// </summary>
/// <remarks>
/// Each test builds a database of its own holding the brief's example (<see cref="ProductMatchFixture"/>), because an
/// approval must be a current suggestion and the suggestion rule reads the whole catalogue.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ProductMatchFamiliesTests : IAsyncLifetime
{
    private const string Base = "/api/v1/catalog/product-matches";
    private static readonly CancellationToken None = CancellationToken.None;

    private IsolatedDatabase? _database;
    private WebApplicationFactory<Program> _factory = null!;
    private ProductMatchFixture _fixture = null!;

    /// <summary>Acceptance 2: after approval the two are separate variants of one base, and the undo takes it back.</summary>
    [PostgresFact]
    public async Task The_sabun_family_appears_after_approval_with_its_label_actor_and_usage_and_goes_after_undo()
    {
        await using var db = _database!.CreateContext();
        var admin = await TestCurrentUser.AdminAsync(db, "Sınaq administratoru");
        var queries = new ProductMatchQueries(db);
        var catalogueBefore = await CatalogueAsync(db);

        Assert.Equal(0, (await queries.GetFamiliesAsync(new ProductFamilyQuery(), None)).TotalCount);

        var started = DateTime.UtcNow;
        var approved = await Service(db, admin).ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.Variant, _fixture.Product("Sabun elano lavanda ətirli"), _fixture.Product("Sabun elano")), None);

        // A rejected link and a spelling match are not families.
        await Service(db, admin).RejectAsync(
            new RejectProductMatchCommand(ProductMatchKind.Variant, _fixture.Product("Qab yuma limon"), _fixture.Product("Qab")), None);
        await Service(db, admin).ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.SameItem, _fixture.Variant("Lampa 15 W"), _fixture.Variant("Lampa 15W")), None);

        var families = await queries.GetFamiliesAsync(new ProductFamilyQuery(), None);
        var family = Assert.Single(families.Items);
        Assert.Equal((_fixture.Product("Sabun elano"), "Sabun elano"), (family.ProductId, family.ProductName));
        Assert.Equal(new MatchUsage(1, 1, ProductMatchFixture.August, ProductMatchFixture.August), family.Usage);

        var member = Assert.Single(family.Variants);
        Assert.Equal(
            (approved.Id, _fixture.Product("Sabun elano lavanda ətirli"), "Sabun elano lavanda ətirli", "lavanda ətirli", "Sınaq administratoru"),
            (member.DecisionId, member.ProductId, member.ProductName, member.VariantLabel, member.DecidedByDisplayName));
        Assert.InRange(member.DecidedAtUtc, started.AddSeconds(-5), DateTime.UtcNow.AddSeconds(5));
        Assert.Equal(new MatchUsage(1, 1, ProductMatchFixture.September, ProductMatchFixture.September), member.Usage);

        // Two products, each with its own variant and its own line, exactly as before: the family is a view.
        Assert.Equal(catalogueBefore, await CatalogueAsync(db));
        Assert.Equal(2, await db.Products.CountAsync(product => product.Name == "Sabun elano" || product.Name == "Sabun elano lavanda ətirli"));

        await Service(db, admin).UndoAsync(approved.Id, new UndoProductMatchCommand(), None);
        Assert.Equal(0, (await queries.GetFamiliesAsync(new ProductFamilyQuery(), None)).TotalCount);
    }

    [PostgresFact]
    public async Task Families_are_found_by_the_base_or_a_variant_ordered_by_name_and_label_and_paged_by_family()
    {
        await using var db = _database!.CreateContext();
        var service = Service(db, await TestCurrentUser.AdminAsync(db));
        foreach (var (variant, baseProduct) in new[] { ("Sabun elano lavanda ətirli", "Sabun elano"), ("Qab yuma nanə", "Qab"), ("Qab yuma", "Qab") })
        {
            await service.ApproveAsync(
                new ApproveProductMatchCommand(ProductMatchKind.Variant, _fixture.Product(variant), _fixture.Product(baseProduct)), None);
        }

        var queries = new ProductMatchQueries(db);
        var all = await queries.GetFamiliesAsync(new ProductFamilyQuery(), None);
        Assert.Equal(
            [("Qab", new[] { "yuma", "yuma nanə" }), ("Sabun elano", new[] { "lavanda ətirli" })],
            all.Items.Select(family => (family.ProductName, family.Variants.Select(member => member.VariantLabel).ToArray())));

        var byBase = await queries.GetFamiliesAsync(new ProductFamilyQuery(Search: "SABUN"), None);
        var byVariant = await queries.GetFamiliesAsync(new ProductFamilyQuery(Search: "nanə"), None);
        Assert.Equal(["Sabun elano"], byBase.Items.Select(family => family.ProductName));
        Assert.Equal(["Qab"], byVariant.Items.Select(family => family.ProductName));
        // Found by one variant, a family is still shown whole.
        Assert.Equal(2, byVariant.Items[0].Variants.Count);

        var second = await queries.GetFamiliesAsync(new ProductFamilyQuery(Page: 2, PageSize: 1), None);
        Assert.Equal((2, 1, 2), (second.Page, second.PageSize, second.TotalCount));
        Assert.Equal(["Sabun elano"], second.Items.Select(family => family.ProductName));
    }

    /// <summary>Over real HTTP: reading the families is open to everybody signed in, like the rest of the catalogue.</summary>
    [PostgresFact]
    public async Task Everybody_signed_in_reads_the_families_and_nobody_else_does()
    {
        await using (var db = _database!.CreateContext())
        {
            await Service(db, await TestCurrentUser.AdminAsync(db)).ApproveAsync(
                new ApproveProductMatchCommand(ProductMatchKind.Variant, _fixture.Product("Sabun elano lavanda ətirli"), _fixture.Product("Sabun elano")), None);
        }

        foreach (var role in new[] { BaxOrdersRoles.Manager, BaxOrdersRoles.Coordinator, BaxOrdersRoles.Admin })
        {
            var account = await AuthenticatedApi.CreateUserAsync(_factory, role, $"Sınaq {role}");
            using var client = AuthenticatedApi.Anonymous(_factory);
            await AuthenticatedApi.SignInAsync(client, account.UserName, account.Password);

            var response = await client.GetAsync($"{Base}/families?search=lavanda");
            Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
            var families = (await response.Content.ReadFromJsonAsync<PagedResult<ProductFamilyDto>>(AuthenticatedApi.Json))!;
            Assert.Equal(("Sabun elano", "lavanda ətirli"), (families.Items.Single().ProductName, families.Items.Single().Variants.Single().VariantLabel));
        }

        using var anonymous = AuthenticatedApi.Anonymous(_factory);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"{Base}/families")).StatusCode);
    }

    public async Task InitializeAsync()
    {
        if (!PostgresDatabaseFixture.IsConfigured)
        {
            return;
        }

        _database = await IsolatedDatabase.CreateAsync("baxorders_families");
        await using (var db = _database.CreateContext())
        {
            _fixture = await ProductMatchFixture.CreateAsync(db);
        }

        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:BaxOrders", _database.ConnectionString);
        });
    }

    public async Task DisposeAsync()
    {
        if (_database is null)
        {
            return;
        }

        await _factory.DisposeAsync();
        await _database.DisposeAsync();
    }

    private static ProductMatchService Service(BaxOrdersDbContext db, ICurrentUserContext user) =>
        new(db, user, new PostgresProductMatchLock(db));

    /// <summary>Every product, variant, alias and line, as a string that changes if any field of any row does.</summary>
    private static async Task<string> CatalogueAsync(BaxOrdersDbContext db)
    {
        var products = await db.Products.AsNoTracking().OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.Code, item.Name, item.NormalizedName, item.CategoryId, item.IsActive, item.UpdatedAtUtc })
            .ToListAsync();
        var variants = await db.ProductVariants.AsNoTracking().OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.ProductId, item.NormalizedVariantKey, item.OrderUnitId, item.IsActive, item.UpdatedAtUtc })
            .ToListAsync();
        var aliases = await db.ProductAliases.AsNoTracking().OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.ProductId, item.NormalizedAlias })
            .ToListAsync();
        var lines = await db.OrderRequestItems.AsNoTracking().OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.OrderRequestId, item.ProductVariantId, item.Quantity, item.UnitPrice, item.PricingMode })
            .ToListAsync();

        return JsonSerializer.Serialize(new { products, variants, aliases, lines });
    }
}
