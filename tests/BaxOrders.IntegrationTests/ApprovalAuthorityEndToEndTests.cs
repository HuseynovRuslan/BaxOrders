using System.Net;
using System.Net.Http.Json;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Approvals;
using BaxOrders.Application.Orders.Revisions;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Application.Users;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Identity;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Task 04a over real HTTP, with real cookies and real antiforgery tokens: only the Rəhbər role decides, an
/// administrator sees the queue without deciding, and the decision panel's facts travel to the browser.
/// </summary>
/// <remarks>
/// Everything is made by the test and removed afterwards. No company request is touched, and every refusal
/// comes from the production pipeline — nothing is relaxed for a test.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ApprovalAuthorityEndToEndTests(PostgresDatabaseFixture database) : IAsyncLifetime
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

    [PostgresFact]
    public async Task Only_a_rehber_decides_an_administrator_looks_and_the_panel_facts_follow_the_whole_cycle()
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        using var coordinator = await SignedInAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        using var rehber = await SignedInAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        using var admin = await SignedInAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        var v1 = await SyntheticRequestAsync(tag);

        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PostAsync(coordinator, $"/api/v1/orders/{v1}/workflow/submit", new { }));

        // The administrator opens the queue and sees the order, with the reason nothing is offered.
        var adminRow = Assert.Single((await InboxAsync(admin, tag)).Rows.Items);
        Assert.Equal(v1, adminRow.OrderRequestId);
        Assert.False(adminRow.CanApprove);
        Assert.False(adminRow.CanReturn);
        Assert.True(adminRow.BlockedByMissingAuthority);

        // ...and cannot decide it, whatever they post.
        Assert.Equal(HttpStatusCode.Forbidden,
            (await AuthenticatedApi.PostAsync(admin, $"/api/v1/orders/{v1}/workflow/approve", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await AuthenticatedApi.PostAsync(admin, $"/api/v1/orders/{v1}/workflow/return", new { reason = "Yenidən bax" })).StatusCode);

        // A coordinator does not get the queue at all.
        Assert.Equal(HttpStatusCode.Forbidden, (await coordinator.GetAsync("/api/v1/approvals/inbox")).StatusCode);

        // The Rəhbər sees it decidable.
        Assert.True(Assert.Single((await InboxAsync(rehber, tag)).Rows.Items).CanApprove);

        // 4.2: no reason, no correction request — refused, and nothing written.
        var withoutReason = await AuthenticatedApi.PostAsync(rehber, $"/api/v1/orders/{v1}/workflow/return", new { reason = "  " });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, withoutReason.StatusCode);
        await using (var check = database.CreateContext())
        {
            Assert.Equal(OrderRequestStatus.PendingApproval, (await check.OrderRequests.SingleAsync(item => item.Id == v1)).Status);
            Assert.Single(await check.OrderRequestWorkflowEvents.Where(item => item.OrderRequestId == v1).ToListAsync());
        }

        var returned = await SendAsync(rehber, $"/api/v1/orders/{v1}/workflow/return", new { reason = "Zibil paketi sayı çoxdur" });
        Assert.Equal(OrderRequestStatus.ReturnedForCorrection, returned.Status);
        Assert.Equal(("Sınaq rəhbəri", "Zibil paketi sayı çoxdur"),
            (returned.DecisionFacts.Decision!.ActorDisplayName, returned.DecisionFacts.Decision.Reason));

        // The coordinator corrects it and sends it again.
        var created = await AuthenticatedApi.PostAsync(coordinator, $"/api/v1/orders/{v1}/revision", new { });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var v2 = (await created.Content.ReadFromJsonAsync<CreateRevisionResultDto>(AuthenticatedApi.Json))!.OrderRequestId;
        requests.Add(v2);
        await SendAsync(coordinator, $"/api/v1/orders/{v2}/workflow/submit", new { });

        // What the Rəhbər reads before deciding: the second time, after their own request, by whom and when.
        var waiting = await ReadWorkflowAsync(rehber, v2);
        Assert.Equal(2, waiting.DecisionFacts.SubmissionNumber);
        Assert.Equal("Sınaq koordinatoru", waiting.DecisionFacts.SubmittedByDisplayName);
        Assert.NotNull(waiting.DecisionFacts.SubmittedAtUtc);
        Assert.Equal("Zibil paketi sayı çoxdur", waiting.DecisionFacts.PreviousReturn!.Reason);
        Assert.Equal("Sınaq rəhbəri", waiting.DecisionFacts.PreviousReturn.ActorDisplayName);
        Assert.Equal(returned.History.Last().OccurredAtUtc, waiting.DecisionFacts.PreviousReturn.OccurredAtUtc);

        var approved = await SendAsync(rehber, $"/api/v1/orders/{v2}/workflow/approve", new { });
        Assert.Equal(OrderRequestStatus.Approved, approved.Status);
        Assert.Equal(OrderWorkflowAction.Approved, approved.DecisionFacts.Decision!.Action);
        Assert.Equal("Sınaq rəhbəri", approved.DecisionFacts.Decision.ActorDisplayName);
        Assert.Equal(approved.History.Last().OccurredAtUtc, approved.DecisionFacts.Decision.OccurredAtUtc);

        Assert.Empty((await InboxAsync(admin, tag)).Rows.Items);
    }

    [PostgresFact]
    public async Task Only_an_administrator_reads_whether_anybody_can_approve()
    {
        using var admin = await SignedInAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        using var rehber = await SignedInAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        using var coordinator = await SignedInAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");

        var response = await admin.GetAsync("/api/v1/admin/users/approval-authority");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        // The shared database holds this test's own Rəhbər at least.
        Assert.True((await response.Content.ReadFromJsonAsync<ApprovalAuthorityStatusDto>())!.ActiveApproverCount >= 1);

        Assert.Equal(HttpStatusCode.Forbidden, (await rehber.GetAsync("/api/v1/admin/users/approval-authority")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await coordinator.GetAsync("/api/v1/admin/users/approval-authority")).StatusCode);
    }

    // ---- helpers --------------------------------------------------------------------------------------

    private async Task<HttpClient> SignedInAsync(string role, string displayName)
    {
        var account = await AuthenticatedApi.CreateUserAsync(factory, role, displayName);
        users.Add(account.Id);

        var client = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(client, account.UserName, account.Password);
        return client;
    }

    private async Task<long> SyntheticRequestAsync(string tag)
    {
        await using var db = database.CreateContext();

        var location = new Domain.Locations.Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(CancellationToken.None), $"Səlahiyyət obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();
        locations.Add(location.Id);

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Domain.Catalog.Product(
            await new PostgresProductCodeGenerator(db).NextAsync(CancellationToken.None), $"Səlahiyyət malı {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync();
        products.Add(product.Id);

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var request = new OrderRequest(location, new DateOnly(2026, 7, 1));
        request.AddItem(variant, 10m, 5m);
        db.OrderRequests.Add(request);
        await db.SaveChangesAsync();
        requests.Add(request.Id);

        return request.Id;
    }

    private static async Task<OrderWorkflowDto> SendAsync(HttpClient client, string url, object body)
    {
        var response = await AuthenticatedApi.PostAsync(client, url, body);
        Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<OrderWorkflowDto>(AuthenticatedApi.Json))!;
    }

    private static async Task<OrderWorkflowDto> ReadWorkflowAsync(HttpClient client, long request)
    {
        var response = await client.GetAsync($"/api/v1/orders/{request}/workflow");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<OrderWorkflowDto>(AuthenticatedApi.Json))!;
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
