using System.Net;
using System.Net.Http.Json;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Approvals;
using BaxOrders.Application.Orders.Revisions;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Identity;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The approval inbox the whole way through: real sign-ins, real cookies, real antiforgery tokens, and the
/// same workflow and revision endpoints Tasks 8–9 already proved — this page only reads what they decide.
/// </summary>
/// <remarks>
/// Everything is made by the test and removed afterwards. No company request is touched, and where a test
/// expects a refusal, the refusal comes from the real authorization policy, not from anything relaxed here.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ApprovalInboxEndToEndTests(PostgresDatabaseFixture database) : IAsyncLifetime
{
    private WebApplicationFactory<Program> factory = null!;
    private readonly List<long> requests = [];
    private readonly List<int> locations = [];
    private readonly List<long> products = [];
    private readonly List<Guid> users = [];

    public Task InitializeAsync()
    {
        factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:BaxOrders", PostgresDatabaseFixture.ConnectionString);
        });

        return Task.CompletedTask;
    }

    /// <summary>Removes everything these scenarios created, children first: no synthetic row outlives them.</summary>
    public async Task DisposeAsync()
    {
        if (!string.IsNullOrWhiteSpace(PostgresDatabaseFixture.ConnectionString))
        {
            await using var db = database.CreateContext();
            await db.OrderRequestEditEvents.Where(item => requests.Contains(item.OrderRequestId)).ExecuteDeleteAsync();
            await db.OrderRequestRevisions
                .Where(item => requests.Contains(item.SourceOrderRequestId) || requests.Contains(item.RevisionOrderRequestId))
                .ExecuteDeleteAsync();
            await db.OrderRequestWorkflowEvents.Where(item => requests.Contains(item.OrderRequestId)).ExecuteDeleteAsync();
            await db.OrderRequestItems.Where(item => requests.Contains(item.OrderRequestId)).ExecuteDeleteAsync();
            await db.OrderRequests.Where(item => requests.Contains(item.Id)).ExecuteDeleteAsync();
            await db.ProductVariants.Where(item => products.Contains(item.ProductId)).ExecuteDeleteAsync();
            await db.Products.Where(item => products.Contains(item.Id)).ExecuteDeleteAsync();
            await db.Locations.Where(item => locations.Contains(item.Id)).ExecuteDeleteAsync();
            await db.Set<ApplicationUser>().Where(item => users.Contains(item.Id)).ExecuteDeleteAsync();
        }

        await factory.DisposeAsync();
    }

    // ---- access -------------------------------------------------------------------------------------

    [PostgresFact]
    public async Task Manager_and_administrator_may_read_the_inbox_a_coordinator_may_not_and_neither_may_a_stranger()
    {
        var manager = await AccountAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        var admin = await AccountAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        var coordinator = await AccountAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");

        using var managerSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(managerSession, manager.UserName, manager.Password);
        Assert.Equal(HttpStatusCode.OK, (await managerSession.GetAsync("/api/v1/approvals/inbox")).StatusCode);

        using var adminSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(adminSession, admin.UserName, admin.Password);
        Assert.Equal(HttpStatusCode.OK, (await adminSession.GetAsync("/api/v1/approvals/inbox")).StatusCode);

        using var coordinatorSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(coordinatorSession, coordinator.UserName, coordinator.Password);
        Assert.Equal(HttpStatusCode.Forbidden, (await coordinatorSession.GetAsync("/api/v1/approvals/inbox")).StatusCode);

        using var anonymous = AuthenticatedApi.Anonymous(factory);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/approvals/inbox")).StatusCode);
    }

    [PostgresFact]
    public async Task An_unknown_sort_value_is_refused_with_a_400_rather_than_silently_ignored()
    {
        var manager = await AccountAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        using var session = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(session, manager.UserName, manager.Password);

        var response = await session.GetAsync("/api/v1/approvals/inbox?sort=NotARealSort");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---- scenario A: submitted, approved, gone -------------------------------------------------------

    [PostgresFact]
    public async Task Scenario_A_a_coordinator_submits_a_manager_approves_and_the_request_leaves_the_inbox()
    {
        var tag = Tag();
        var coordinator = await AccountAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await AccountAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        var request = await SyntheticRequestAsync(tag);

        using var coordinatorSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(coordinatorSession, coordinator.UserName, coordinator.Password);
        using var managerSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(managerSession, manager.UserName, manager.Password);

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(coordinatorSession, $"/api/v1/orders/{request}/workflow/submit", new { }));

        var before = Assert.Single((await InboxAsync(managerSession, tag)).Rows.Items);
        Assert.Equal(request, before.OrderRequestId);
        Assert.True(before.CanApprove);

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(managerSession, $"/api/v1/orders/{request}/workflow/approve", new { }));

        Assert.Empty((await InboxAsync(managerSession, tag)).Rows.Items);
    }

    // ---- scenario B: submitted, returned, gone -------------------------------------------------------

    [PostgresFact]
    public async Task Scenario_B_a_coordinator_submits_a_manager_returns_and_the_request_leaves_the_inbox()
    {
        var tag = Tag();
        var coordinator = await AccountAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await AccountAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        var request = await SyntheticRequestAsync(tag);

        using var coordinatorSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(coordinatorSession, coordinator.UserName, coordinator.Password);
        using var managerSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(managerSession, manager.UserName, manager.Password);

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(coordinatorSession, $"/api/v1/orders/{request}/workflow/submit", new { }));
        Assert.Single((await InboxAsync(managerSession, tag)).Rows.Items);

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(managerSession, $"/api/v1/orders/{request}/workflow/return", new { reason = "Miqdar yanlışdır" }));

        // Returned for correction, not pending any more -- it leaves the queue even though nobody decided "yes".
        Assert.Empty((await InboxAsync(managerSession, tag)).Rows.Items);
    }

    // ---- scenario C: a self-submission is blocked, a colleague decides --------------------------------

    [PostgresFact]
    public async Task Scenario_C_an_administrators_own_submission_is_blocked_for_them_but_another_manager_can_decide_it()
    {
        var tag = Tag();
        var admin = await AccountAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        var manager = await AccountAsync(BaxOrdersRoles.Manager, "Kənar rəhbər");
        var request = await SyntheticRequestAsync(tag);

        using var adminSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(adminSession, admin.UserName, admin.Password);
        using var managerSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(managerSession, manager.UserName, manager.Password);

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(adminSession, $"/api/v1/orders/{request}/workflow/submit", new { }));

        var ownRow = Assert.Single((await InboxAsync(adminSession, tag)).Rows.Items);
        Assert.False(ownRow.CanApprove);
        Assert.False(ownRow.CanReturn);
        Assert.True(ownRow.BlockedBySelfApproval);
        Assert.False(ownRow.BlockedByOwnContribution);

        var othersRow = Assert.Single((await InboxAsync(managerSession, tag)).Rows.Items);
        Assert.True(othersRow.CanApprove);
        Assert.False(othersRow.BlockedBySelfApproval);

        // The server refuses the admin's own attempt exactly as the existing workflow endpoint always has.
        var ownAttempt = await AuthenticatedApi.PostAsync(adminSession, $"/api/v1/orders/{request}/workflow/approve", new { });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, ownAttempt.StatusCode);

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(managerSession, $"/api/v1/orders/{request}/workflow/approve", new { }));

        Assert.Empty((await InboxAsync(adminSession, tag)).Rows.Items);
        Assert.Empty((await InboxAsync(managerSession, tag)).Rows.Items);
    }

    // ---- scenario D: whoever edited the correction is blocked, an untouched manager decides -----------

    [PostgresFact]
    public async Task Scenario_D_whoever_edited_the_correction_is_blocked_but_an_untouched_manager_can_decide_it()
    {
        var tag = Tag();
        var coordinator = await AccountAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var editingAdmin = await AccountAsync(BaxOrdersRoles.Admin, "Düzəliş edən administrator");
        var freshManager = await AccountAsync(BaxOrdersRoles.Manager, "Toxunmayan rəhbər");

        var v1 = await SyntheticRequestAsync(tag, quantity: 10m);

        using var coordinatorSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(coordinatorSession, coordinator.UserName, coordinator.Password);
        using var editingAdminSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(editingAdminSession, editingAdmin.UserName, editingAdmin.Password);
        using var freshManagerSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(freshManagerSession, freshManager.UserName, freshManager.Password);

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(coordinatorSession, $"/api/v1/orders/{v1}/workflow/submit", new { }));
        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(freshManagerSession, $"/api/v1/orders/{v1}/workflow/return", new { reason = "Yenidən bax" }));

        var created = await AuthenticatedApi.PostAsync(coordinatorSession, $"/api/v1/orders/{v1}/revision", new { });
        var revision = (await created.Content.ReadFromJsonAsync<CreateRevisionResultDto>(AuthenticatedApi.Json))!;
        var v2 = revision.OrderRequestId;
        requests.Add(v2);

        var lineId = await LineIdAsync(v2, 10m);
        var currentRowVersion = await RowVersionAsync(editingAdminSession, v2);
        // A manager literally cannot reach this endpoint (CanReviseOrders is Coordinator/Admin only), so the
        // contributor here is necessarily an administrator -- the same shape Task 9's own tests already prove.
        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PatchAsync(editingAdminSession, $"/api/v1/orders/{v2}/items/{lineId}",
            new { rowVersion = currentRowVersion, quantity = new { value = 11m } }));

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(coordinatorSession, $"/api/v1/orders/{v2}/workflow/submit", new { }));

        var editorsRow = Assert.Single((await InboxAsync(editingAdminSession, tag)).Rows.Items);
        Assert.False(editorsRow.CanApprove);
        Assert.False(editorsRow.CanReturn);
        Assert.False(editorsRow.BlockedBySelfApproval);
        Assert.True(editorsRow.BlockedByOwnContribution);
        Assert.True(editorsRow.IsRevision);

        var freshRow = Assert.Single((await InboxAsync(freshManagerSession, tag)).Rows.Items);
        Assert.True(freshRow.CanApprove);
        Assert.False(freshRow.BlockedByOwnContribution);

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(freshManagerSession, $"/api/v1/orders/{v2}/workflow/approve", new { }));

        Assert.Empty((await InboxAsync(freshManagerSession, tag)).Rows.Items);
    }

    // ---- scenario E: missing prices are shown, and still gate approval --------------------------------

    [PostgresFact]
    public async Task Scenario_E_missing_prices_are_shown_as_incomplete_and_still_require_acknowledgement_to_approve()
    {
        var tag = Tag();
        var coordinator = await AccountAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await AccountAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        var request = await SyntheticRequestAsync(tag, unitPrice: null);

        using var coordinatorSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(coordinatorSession, coordinator.UserName, coordinator.Password);
        using var managerSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(managerSession, manager.UserName, manager.Password);

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(coordinatorSession, $"/api/v1/orders/{request}/workflow/submit", new { }));

        var row = Assert.Single((await InboxAsync(managerSession, tag)).Rows.Items);
        Assert.False(row.AmountIsComplete);
        Assert.Equal(1, row.MissingPriceItemCount);
        Assert.Null(row.KnownAmount);
        Assert.True(row.CanApprove);

        // The existing rule, not a new one: approving without acknowledging the missing price is refused.
        var withoutAcknowledgement = await AuthenticatedApi.PostAsync(managerSession, $"/api/v1/orders/{request}/workflow/approve", new { });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, withoutAcknowledgement.StatusCode);
        Assert.Single((await InboxAsync(managerSession, tag)).Rows.Items);

        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PostAsync(managerSession,
            $"/api/v1/orders/{request}/workflow/approve", new { acknowledgeMissingPrices = true }));

        Assert.Empty((await InboxAsync(managerSession, tag)).Rows.Items);
    }

    // ---- helpers --------------------------------------------------------------------------------------

    private static string Tag() => Guid.NewGuid().ToString("N")[..8];

    private async Task<TestAccount> AccountAsync(string role, string displayName)
    {
        var account = await AuthenticatedApi.CreateUserAsync(factory, role, displayName);
        users.Add(account.Id);
        return account;
    }

    /// <summary>An object, a product and one draft request of its own, so no company data is anywhere near this.</summary>
    private async Task<long> SyntheticRequestAsync(string tag, decimal quantity = 10m, decimal? unitPrice = 5m)
    {
        await using var db = database.CreateContext();

        var location = new Domain.Locations.Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(CancellationToken.None), $"Təsdiq obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();
        locations.Add(location.Id);

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Domain.Catalog.Product(
            await new PostgresProductCodeGenerator(db).NextAsync(CancellationToken.None), $"Təsdiq malı {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync();
        products.Add(product.Id);

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var request = new OrderRequest(location, new DateOnly(2026, 7, 1));
        request.AddItem(variant, quantity, unitPrice);
        db.OrderRequests.Add(request);
        await db.SaveChangesAsync();
        requests.Add(request.Id);

        return request.Id;
    }

    private async Task<long> LineIdAsync(long request, decimal quantity)
    {
        await using var db = database.CreateContext();
        return await db.OrderRequestItems
            .Where(item => item.OrderRequestId == request && item.Quantity == quantity)
            .Select(item => item.Id)
            .SingleAsync();
    }

    private static async Task<string> RowVersionAsync(HttpClient client, long request)
    {
        var response = await client.GetAsync($"/api/v1/orders/{request}/revision");
        response.EnsureSuccessStatusCode();
        var dto = (await response.Content.ReadFromJsonAsync<OrderRevisionDto>(AuthenticatedApi.Json))!;
        return dto.RowVersion;
    }

    private static async Task<ApprovalInboxDto> InboxAsync(HttpClient client, string search)
    {
        var response = await client.GetAsync($"/api/v1/approvals/inbox?search={Uri.EscapeDataString(search)}");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ApprovalInboxDto>(AuthenticatedApi.Json))!;
    }

    private static async Task ExpectAsync(HttpStatusCode expected, Task<HttpResponseMessage> call)
    {
        var response = await call;
        Assert.True(response.StatusCode == expected,
            $"Expected {(int)expected}, got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
    }
}
