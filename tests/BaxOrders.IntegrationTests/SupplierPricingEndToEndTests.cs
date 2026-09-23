using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Suppliers;
using BaxOrders.Domain.Suppliers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Who may see which suppliers are the company's own stores, and who may say so, over real HTTP with real
/// cookies and real antiforgery tokens.
/// </summary>
/// <remarks>
/// This one property decides what the whole system calls a missing price, so the refusal a manager gets comes
/// from the real authorization policy rather than from a screen hiding a button.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class SupplierPricingEndToEndTests(PostgresDatabaseFixture database) : IAsyncLifetime
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

    [PostgresFact]
    public async Task Everybody_signed_in_may_see_which_suppliers_need_a_price()
    {
        foreach (var role in new[] { BaxOrdersRoles.Coordinator, BaxOrdersRoles.Manager, BaxOrdersRoles.Admin })
        {
            using var session = await SignedInAsync(role);
            Assert.Equal(HttpStatusCode.OK, (await session.GetAsync("/api/v1/suppliers")).StatusCode);
        }

        using var anonymous = AuthenticatedApi.Anonymous(factory);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/suppliers")).StatusCode);
    }

    // ---- H. a manager may read it and may not change it ------------------------------------------------

    [PostgresFact]
    public async Task A_manager_may_not_change_a_suppliers_pricing_policy()
    {
        var supplierId = await SupplierAsync();

        using var manager = await SignedInAsync(BaxOrdersRoles.Manager);
        var response = await AuthenticatedApi.PostAsync(
            manager,
            $"/api/v1/suppliers/{supplierId}/price-requirement",
            new { priceRequirement = "NotRequired" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(SupplierPriceRequirement.Required, await RequirementAsync(supplierId));
    }

    [PostgresFact]
    public async Task A_stranger_may_not_change_it_at_all()
    {
        var supplierId = await SupplierAsync();

        using var anonymous = AuthenticatedApi.Anonymous(factory);
        var response = await AuthenticatedApi.PostAsync(
            anonymous,
            $"/api/v1/suppliers/{supplierId}/price-requirement",
            new { priceRequirement = "NotRequired" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(SupplierPriceRequirement.Required, await RequirementAsync(supplierId));
    }

    // ---- G. a coordinator may, and it is written down --------------------------------------------------

    [PostgresFact]
    public async Task A_coordinator_may_change_it_and_the_decision_is_recorded()
    {
        var supplierId = await SupplierAsync();

        using var coordinator = await SignedInAsync(BaxOrdersRoles.Coordinator);
        var response = await AuthenticatedApi.PostAsync(
            coordinator,
            $"/api/v1/suppliers/{supplierId}/price-requirement",
            new { priceRequirement = "NotRequired", reason = "Öz anbarımızdır" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(SupplierPriceRequirement.NotRequired, await RequirementAsync(supplierId));

        var decisions = await coordinator.GetFromJsonAsync<List<SupplierPricingDecisionDto>>(
            $"/api/v1/suppliers/{supplierId}/pricing-decisions", Json);

        var decision = Assert.Single(decisions!);
        Assert.Equal(SupplierPriceRequirement.Required, decision.PreviousRequirement);
        Assert.Equal(SupplierPriceRequirement.NotRequired, decision.NewRequirement);
        Assert.Equal("Öz anbarımızdır", decision.Reason);
        Assert.False(string.IsNullOrWhiteSpace(decision.ActorDisplayName));
    }

    [PostgresFact]
    public async Task A_requirement_this_api_does_not_know_is_refused()
    {
        var supplierId = await SupplierAsync();

        using var coordinator = await SignedInAsync(BaxOrdersRoles.Coordinator);
        var response = await AuthenticatedApi.PostAsync(
            coordinator,
            $"/api/v1/suppliers/{supplierId}/price-requirement",
            new { priceRequirement = "Whenever" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(SupplierPriceRequirement.Required, await RequirementAsync(supplierId));
    }

    [PostgresFact]
    public async Task A_supplier_that_does_not_exist_is_answered_with_not_found()
    {
        using var coordinator = await SignedInAsync(BaxOrdersRoles.Coordinator);
        var response = await AuthenticatedApi.PostAsync(
            coordinator,
            "/api/v1/suppliers/-1/price-requirement",
            new { priceRequirement = "NotRequired" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ---- fixture -------------------------------------------------------------------------------------

    /// <summary>The API writes enums as names, the way a reader of the wire would expect; so does this.</summary>
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<int> SupplierAsync()
    {
        await using var db = database.CreateContext();
        var supplier = new Supplier($"Sınaq təchizatçısı {Guid.NewGuid():N}"[..40]);
        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();
        return supplier.Id;
    }

    private async Task<SupplierPriceRequirement> RequirementAsync(int supplierId)
    {
        await using var db = database.CreateContext();
        return await db.Suppliers.AsNoTracking()
            .Where(supplier => supplier.Id == supplierId)
            .Select(supplier => supplier.PriceRequirement)
            .SingleAsync();
    }

    private async Task<HttpClient> SignedInAsync(string role)
    {
        var account = await AuthenticatedApi.CreateUserAsync(factory, role, $"Sınaq {role}");
        var client = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(client, account.UserName, account.Password);
        return client;
    }
}
