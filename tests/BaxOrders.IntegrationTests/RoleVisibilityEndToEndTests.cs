using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Orders.Pricing;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// What each role may open and read, over real HTTP with real cookies and real antiforgery tokens (brief 14).
/// </summary>
/// <remarks>
/// <para>
/// A Rəhbər is not offered Excel importları or İstifadəçilər, and typing either address does not open them —
/// not the page and not the API behind it. Təchizatçılar and Qiymət təsnifatı they may read and may not change.
/// </para>
/// <para>
/// The ids used for the refusals exist, so a 403 here can never be a 404 in disguise; the same ids answer 200 to
/// a Koordinator and an administrator.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class RoleVisibilityEndToEndTests(PostgresDatabaseFixture database) : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;

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

    // ---- the sections hidden from a Rəhbər do not open by address either -------------------------------

    [PostgresFact]
    public async Task A_manager_is_refused_every_import_read_and_the_user_list()
    {
        var urls = await ImportReadsAsync();

        using var manager = await SignedInAsync(BaxOrdersRoles.Manager);
        foreach (var url in urls)
        {
            Assert.True(
                (await manager.GetAsync(url)).StatusCode == HttpStatusCode.Forbidden,
                $"GET {url} should answer 403 to a Rəhbər.");
        }

        Assert.Equal(HttpStatusCode.Forbidden, (await manager.GetAsync("/api/v1/admin/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await manager.GetAsync("/api/v1/admin/users/approval-authority")).StatusCode);
    }

    [PostgresFact]
    public async Task A_coordinator_and_an_administrator_still_read_the_same_import()
    {
        var urls = await ImportReadsAsync();

        foreach (var role in new[] { BaxOrdersRoles.Coordinator, BaxOrdersRoles.Admin })
        {
            using var session = await SignedInAsync(role);
            foreach (var url in urls)
            {
                Assert.True(
                    (await session.GetAsync(url)).StatusCode == HttpStatusCode.OK,
                    $"GET {url} should answer 200 to {role}.");
            }
        }
    }

    // ---- read-only for a Rəhbər ----------------------------------------------------------------------

    [PostgresFact]
    public async Task A_manager_reads_the_suppliers_and_the_pricing_queue()
    {
        using var manager = await SignedInAsync(BaxOrdersRoles.Manager);

        Assert.Equal(HttpStatusCode.OK, (await manager.GetAsync("/api/v1/suppliers")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await manager.GetAsync("/api/v1/pricing-mode-review")).StatusCode);
    }

    [PostgresFact]
    public async Task A_manager_changes_nothing_on_either_read_only_page()
    {
        var world = await PricingWorldAsync();

        using var manager = await SignedInAsync(BaxOrdersRoles.Manager);

        var supplier = await AuthenticatedApi.PostAsync(
            manager, $"/api/v1/suppliers/{world.SupplierId}/price-requirement", new { priceRequirement = "NotRequired" });
        var pricing = await AuthenticatedApi.PostAsync(
            manager, "/api/v1/pricing-mode-review",
            new { orderRequestItemIds = new[] { world.First.UnresolvedItemId }, pricingMode = "InternalFreeSupply" });

        Assert.Equal(HttpStatusCode.Forbidden, supplier.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, pricing.StatusCode);

        await using var db = database.CreateContext();
        Assert.Equal(SupplierPriceRequirement.Required, await db.Suppliers.AsNoTracking()
            .Where(item => item.Id == world.SupplierId).Select(item => item.PriceRequirement).SingleAsync(None));
        Assert.Equal(PricingMode.Unresolved, await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.Id == world.First.UnresolvedItemId).Select(item => item.PricingMode).SingleAsync(None));
    }

    // ---- the pricing queue opened from one order's price warning -------------------------------------

    [PostgresFact]
    public async Task Opened_from_an_order_the_queue_lists_that_order_s_unpriced_lines_and_counts_them()
    {
        var world = await PricingWorldAsync();
        using var manager = await SignedInAsync(BaxOrdersRoles.Manager);

        var review = await ReviewAsync(manager, $"orderRequestId={world.First.OrderId}");

        // Every unpriced line of the first order, whatever its state, and nothing of the second.
        Assert.Equal(
            world.First.UnpricedItemIds.Order().ToArray(),
            review.Rows.Select(row => row.OrderRequestItemId).Order().ToArray());
        Assert.All(review.Rows, row => Assert.Equal(world.First.OrderId, row.OrderRequestId));
        Assert.Equal(world.First.UnpricedItemIds.Count, review.TotalCount);

        // The first order: bought-unpriced, no supplier at all, unclassified, and one line from our own store.
        Assert.Equal(1, review.Unresolved);
        Assert.Equal(2, review.MissingRequiredPrice);
        Assert.Equal(1, review.InternalFreeSupply);

        // The two states that are gaps add up to exactly what the order page's warning says.
        var order = await manager.GetFromJsonAsync<JsonElement>($"/api/v1/orders/{world.First.OrderId}", AuthenticatedApi.Json);
        var context = await manager.GetFromJsonAsync<JsonElement>(
            $"/api/v1/orders/{world.First.OrderId}/decision-context", AuthenticatedApi.Json);

        Assert.Equal(3, order.GetProperty("missingPriceItemCount").GetInt32());
        Assert.Equal(
            order.GetProperty("missingPriceItemCount").GetInt32(),
            review.Unresolved + review.MissingRequiredPrice);
        Assert.Equal(
            context.GetProperty("current").GetProperty("missingPriceItemCount").GetInt32(),
            review.Unresolved + review.MissingRequiredPrice);
    }

    [PostgresFact]
    public async Task The_second_order_gets_its_own_lines_and_its_own_totals()
    {
        var world = await PricingWorldAsync();
        using var manager = await SignedInAsync(BaxOrdersRoles.Manager);

        var review = await ReviewAsync(manager, $"orderRequestId={world.Second.OrderId}");

        Assert.Equal(
            world.Second.UnpricedItemIds.Order().ToArray(),
            review.Rows.Select(row => row.OrderRequestItemId).Order().ToArray());
        Assert.Equal(2, review.TotalCount);
        Assert.Equal(2, review.Unresolved);
        Assert.Equal(0, review.MissingRequiredPrice);
        Assert.Equal(0, review.InternalFreeSupply);
    }

    [PostgresFact]
    public async Task A_state_filter_inside_an_order_narrows_the_rows_and_keeps_the_order_s_totals()
    {
        var world = await PricingWorldAsync();
        using var manager = await SignedInAsync(BaxOrdersRoles.Manager);

        var review = await ReviewAsync(manager, $"orderRequestId={world.First.OrderId}&mode=Unresolved");

        Assert.Equal(world.First.UnresolvedItemId, Assert.Single(review.Rows).OrderRequestItemId);
        Assert.Equal(1, review.TotalCount);
        Assert.Equal((1, 2, 1), (review.Unresolved, review.MissingRequiredPrice, review.InternalFreeSupply));
    }

    [PostgresFact]
    public async Task An_order_that_does_not_exist_is_an_empty_queue_rather_than_an_error()
    {
        await PricingWorldAsync();
        using var manager = await SignedInAsync(BaxOrdersRoles.Manager);

        var response = await manager.GetAsync("/api/v1/pricing-mode-review?orderRequestId=-1");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var review = (await response.Content.ReadFromJsonAsync<PricingModeReviewDto>(AuthenticatedApi.Json))!;
        Assert.Empty(review.Rows);
        Assert.Equal((0, 0, 0, 0), (review.TotalCount, review.Unresolved, review.MissingRequiredPrice, review.InternalFreeSupply));
    }

    /// <summary>
    /// Without the order, the page and the endpoint answer exactly as they did: the whole queue, counted over every
    /// unpriced line in the company, and the same response the query built before this task gave.
    /// </summary>
    [PostgresFact]
    public async Task Without_an_order_the_queue_answers_exactly_as_before()
    {
        var world = await PricingWorldAsync();
        using var manager = await SignedInAsync(BaxOrdersRoles.Manager);

        foreach (var (search, mode) in new (string?, PricingMode?)[]
        {
            (null, null),
            (null, PricingMode.Unresolved),
            (world.ProductName, null),
            (world.ProductName, PricingMode.PriceRequired),
        })
        {
            var parameters = new List<string> { "page=1", "pageSize=50" };
            if (mode is not null)
            {
                parameters.Add($"mode={mode}");
            }

            if (search is not null)
            {
                parameters.Add($"search={Uri.EscapeDataString(search)}");
            }

            var overHttp = await ReviewAsync(manager, string.Join('&', parameters));

            await using var db = database.CreateContext();
            // The query exactly as its callers built it before the order filter existed.
            var before = await new PricingModeReviewService(db, TestCurrentUser.Anonymous())
                .GetAsync(new PricingModeReviewQuery(mode, search, 1, 50), None);

            Assert.Equal(Serialize(before), Serialize(overHttp));

            // And the totals are still the whole company's queue, not any one order's.
            var unpriced = db.OrderRequestItems.AsNoTracking().Where(item => item.UnitPrice == null);
            Assert.Equal(await unpriced.CountAsync(item => item.PricingMode == PricingMode.Unresolved, None), overHttp.Unresolved);
            Assert.Equal(await unpriced.CountAsync(item => item.PricingMode == PricingMode.PriceRequired, None), overHttp.MissingRequiredPrice);
            Assert.Equal(await unpriced.CountAsync(item => item.PricingMode == PricingMode.InternalFreeSupply, None), overHttp.InternalFreeSupply);
        }
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private static string Serialize(PricingModeReviewDto review) => JsonSerializer.Serialize(review, AuthenticatedApi.Json);

    private static async Task<PricingModeReviewDto> ReviewAsync(HttpClient client, string query)
    {
        var response = await client.GetAsync($"/api/v1/pricing-mode-review?{query}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<PricingModeReviewDto>(AuthenticatedApi.Json))!;
    }

    /// <summary>
    /// Every read under <c>api/v1/imports</c>, pointed at an import and a row that really exist.
    /// </summary>
    private async Task<string[]> ImportReadsAsync()
    {
        await using var db = database.CreateContext();
        var tag = Unique();
        var batchId = await StageAsync(db, new OrderLine(Product: $"Menyu malı {tag}", Location: $"Menyu obyekti {tag}"));
        var rowId = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId)
            .Select(row => row.Id)
            .FirstAsync(None);

        return
        [
            $"/api/v1/imports/{batchId}",
            $"/api/v1/imports/{batchId}/rows",
            $"/api/v1/imports/{batchId}/rows/{rowId}",
            $"/api/v1/imports/{batchId}/unresolved/summary",
            $"/api/v1/imports/{batchId}/unresolved?kind=Location",
            $"/api/v1/imports/{batchId}/corrections/candidates",
            $"/api/v1/imports/{batchId}/readiness",
            $"/api/v1/imports/{batchId}/confirmation/preview",
            // Brief 16: the review's pricing classification belongs to the import, and is refused with it.
            $"/api/v1/imports/{batchId}/pricing",
        ];
    }

    private sealed record PricingOrder(long OrderId, IReadOnlyList<long> UnpricedItemIds, long UnresolvedItemId);

    private sealed record PricingWorld(int SupplierId, string ProductName, PricingOrder First, PricingOrder Second);

    /// <summary>
    /// Two orders of one object, both with unpriced lines in different states. The first has one line in each
    /// state plus a priced one; the second has only unclassified lines.
    /// </summary>
    private async Task<PricingWorld> PricingWorldAsync()
    {
        await using var db = database.CreateContext();
        var tag = Unique();

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Menyu təsnifat obyekti {tag}");
        db.Locations.Add(location);

        var store = new Supplier($"Menyu anbarı {tag}");
        db.Suppliers.Add(store);
        await db.SaveChangesAsync(None);

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS", None);
        var codes = new PostgresProductCodeGenerator(db);
        var first = new Product(await codes.NextAsync(None), $"Menyu malı A {tag}");
        var second = new Product(await codes.NextAsync(None), $"Menyu malı B {tag}");
        db.Products.AddRange(first, second);
        await db.SaveChangesAsync(None);

        var one = first.AddVariant(null, null, null, pieces);
        var two = second.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync(None);

        var august = new OrderRequest(location, new DateOnly(2026, 8, 1));
        var bought = august.AddItem(one, 5m, null, store);
        var orphan = august.AddItem(two, 3m, null);
        var unresolved = august.AddItem(two, 11m, null, store);
        var free = august.AddItem(one, 9m, null, store);
        august.AddItem(two, 4m, 7.5m, store);

        var september = new OrderRequest(location, new DateOnly(2026, 9, 1));
        var laterOne = september.AddItem(one, 6m, null, store);
        var laterTwo = september.AddItem(two, 2m, null, store);
        september.AddItem(one, 1m, 3m, store);

        db.OrderRequests.AddRange(august, september);
        await db.SaveChangesAsync(None);

        var actor = WorkflowActor.User(Guid.NewGuid(), "Sınaq");
        unresolved.SetPricingMode(PricingMode.Unresolved, actor, null, DateTime.UtcNow);
        free.SetPricingMode(PricingMode.InternalFreeSupply, actor, null, DateTime.UtcNow);
        laterOne.SetPricingMode(PricingMode.Unresolved, actor, null, DateTime.UtcNow);
        laterTwo.SetPricingMode(PricingMode.Unresolved, actor, null, DateTime.UtcNow);
        await db.SaveChangesAsync(None);

        return new PricingWorld(
            store.Id,
            first.Name,
            new PricingOrder(august.Id, [bought.Id, orphan.Id, unresolved.Id, free.Id], unresolved.Id),
            new PricingOrder(september.Id, [laterOne.Id, laterTwo.Id], laterOne.Id));
    }

    private async Task<HttpClient> SignedInAsync(string role)
    {
        var account = await AuthenticatedApi.CreateUserAsync(factory, role, $"Sınaq {role}");
        var client = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(client, account.UserName, account.Password);
        return client;
    }

    /// <summary>The fixture database is shared by the whole run, so every world tags its own rows.</summary>
    private static string Unique() => Guid.NewGuid().ToString("N")[..8];
}
