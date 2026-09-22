using System.Net;
using System.Net.Http.Json;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Application.Users;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Identity;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The whole way through: two people sign in on two separate sessions and move one request between them,
/// over real HTTP, with real cookies and real antiforgery tokens.
/// </summary>
/// <remarks>
/// Everything these tests touch is made by them and removed afterwards. No company request is submitted,
/// approved or returned here, and nothing weakens the production pipeline to let a test through — where a
/// test expects a refusal, the refusal comes from the same code that refuses a browser.
/// </remarks>
[Collection(SqlServerCollection.Name)]
public sealed class RoleWorkflowEndToEndTests(SqlServerDatabaseFixture database) : IAsyncLifetime
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
            builder.UseSetting("ConnectionStrings:BaxOrders", SqlServerDatabaseFixture.ConnectionString);
        });

        return Task.CompletedTask;
    }

    /// <summary>Removes everything these scenarios created, children first: no synthetic row outlives them.</summary>
    public async Task DisposeAsync()
    {
        if (!string.IsNullOrWhiteSpace(SqlServerDatabaseFixture.ConnectionString))
        {
            await using var db = database.CreateContext();
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

    // ---- 57: a coordinator submits, a manager approves -----------------------------------------------

    [SqlServerFact]
    public async Task A_coordinator_submits_and_a_manager_approves()
    {
        var coordinator = await AccountAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru A");
        var manager = await AccountAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri B");
        var request = await SyntheticRequestAsync();

        using var coordinatorSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(coordinatorSession, coordinator.UserName, coordinator.Password);
        var submitted = await SendAsync(coordinatorSession, $"/api/v1/orders/{request}/workflow/submit", new { });

        Assert.Equal(OrderRequestStatus.PendingApproval, submitted.Status);
        Assert.Equal(coordinator.Id, submitted.SubmittedByUserId);

        using var managerSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(managerSession, manager.UserName, manager.Password);
        var approved = await SendAsync(managerSession, $"/api/v1/orders/{request}/workflow/approve", new { });

        Assert.Equal(OrderRequestStatus.Approved, approved.Status);

        await using var db = database.CreateContext();
        var events = await EventsAsync(db, request);

        Assert.Equal(
            [(OrderWorkflowAction.SubmittedForApproval, coordinator.Id, "Sınaq koordinatoru A"),
             (OrderWorkflowAction.Approved, manager.Id, "Sınaq rəhbəri B")],
            events.Select(item => (item.Action, item.ActorUserId, item.ActorDisplayName)).ToArray());

        var stored = await db.OrderRequests.SingleAsync(item => item.Id == request);
        Assert.Equal(coordinator.Id, stored.SubmittedByUserId);
    }

    // ---- 58: nobody approves their own submission ----------------------------------------------------

    [SqlServerFact]
    public async Task An_administrator_cannot_approve_what_they_submitted_themselves()
    {
        // An administrator may both submit and decide, which is exactly why this has to be proved on one.
        var first = await AccountAsync(BaxOrdersRoles.Admin, "Sınaq administratoru A");
        var second = await AccountAsync(BaxOrdersRoles.Admin, "Sınaq administratoru B");
        var request = await SyntheticRequestAsync();

        using var firstSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(firstSession, first.UserName, first.Password);
        await SendAsync(firstSession, $"/api/v1/orders/{request}/workflow/submit", new { });

        // The screen would not offer it, and the server refuses it anyway.
        var offered = await ReadWorkflowAsync(firstSession, request);
        Assert.False(offered.AllowedActions.CanApprove);
        Assert.False(offered.AllowedActions.CanReturn);
        Assert.True(offered.AllowedActions.BlockedBySelfApproval);

        var ownApproval = await AuthenticatedApi.PostAsync(firstSession, $"/api/v1/orders/{request}/workflow/approve", new { });
        var ownReturn = await AuthenticatedApi.PostAsync(firstSession, $"/api/v1/orders/{request}/workflow/return",
            new { reason = "Özüm göndərmişəm" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, ownApproval.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, ownReturn.StatusCode);

        await using var afterRefusal = database.CreateContext();
        Assert.Equal(OrderRequestStatus.PendingApproval,
            (await afterRefusal.OrderRequests.SingleAsync(item => item.Id == request)).Status);
        Assert.Single(await EventsAsync(afterRefusal, request));

        // Somebody else may.
        using var secondSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(secondSession, second.UserName, second.Password);
        var approved = await SendAsync(secondSession, $"/api/v1/orders/{request}/workflow/approve", new { });

        Assert.Equal(OrderRequestStatus.Approved, approved.Status);

        await using var db = database.CreateContext();
        var approval = (await EventsAsync(db, request)).Last();
        Assert.Equal(second.Id, approval.ActorUserId);
        Assert.Equal("Sınaq administratoru B", approval.ActorDisplayName);
    }

    // ---- 59: returned, corrected, submitted again, approved ------------------------------------------

    [SqlServerFact]
    public async Task A_returned_request_goes_round_again_and_the_history_keeps_all_four_steps()
    {
        var coordinator = await AccountAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru A");
        var manager = await AccountAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri B");
        var request = await SyntheticRequestAsync();

        using var coordinatorSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(coordinatorSession, coordinator.UserName, coordinator.Password);
        using var managerSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(managerSession, manager.UserName, manager.Password);

        var first = await SendAsync(coordinatorSession, $"/api/v1/orders/{request}/workflow/submit", new { });
        var returned = await SendAsync(managerSession, $"/api/v1/orders/{request}/workflow/return",
            new { reason = "Miqdarlar yoxlanmalıdır" });
        var again = await SendAsync(coordinatorSession, $"/api/v1/orders/{request}/workflow/submit",
            new { comment = "Düzəldildi" });
        var approved = await SendAsync(managerSession, $"/api/v1/orders/{request}/workflow/approve", new { });

        Assert.Equal(OrderRequestStatus.ReturnedForCorrection, returned.Status);
        Assert.Equal(OrderRequestStatus.Approved, approved.Status);

        // A decision is not a new version of the order: the lines never changed.
        Assert.Equal(first.Version, again.Version);
        Assert.Equal(first.Version, approved.Version);

        await using var db = database.CreateContext();
        var events = await EventsAsync(db, request);

        Assert.Equal(
            [(OrderWorkflowAction.SubmittedForApproval, coordinator.Id),
             (OrderWorkflowAction.ReturnedForCorrection, manager.Id),
             (OrderWorkflowAction.SubmittedForApproval, coordinator.Id),
             (OrderWorkflowAction.Approved, manager.Id)],
            events.Select(item => (item.Action, item.ActorUserId)).ToArray());

        Assert.All(events.Where(item => item.ActorUserId == coordinator.Id),
            item => Assert.Equal("Sınaq koordinatoru A", item.ActorDisplayName));
        Assert.All(events.Where(item => item.ActorUserId == manager.Id),
            item => Assert.Equal("Sınaq rəhbəri B", item.ActorDisplayName));

        // The resubmission, not the first submission, is the cycle that was approved.
        var stored = await db.OrderRequests.SingleAsync(item => item.Id == request);
        Assert.Equal(coordinator.Id, stored.SubmittedByUserId);
        Assert.Equal("Miqdarlar yoxlanmalıdır", events[1].Comment);
        Assert.Equal("Düzəldildi", events[2].Comment);
    }

    // ---- 60: a password changes, and an account is stopped -------------------------------------------

    [SqlServerFact]
    public async Task An_administrator_creates_an_account_the_person_then_changes_and_the_administrator_stops()
    {
        var administrator = await AccountAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        using var adminSession = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(adminSession, administrator.UserName, administrator.Password);

        var userName = $"coordinator-{Guid.NewGuid():N}"[..24];
        const string firstPassword = "Ilkin-Sifre-2026";
        const string chosenPassword = "Secilmis-Sifre-2026";

        var created = await AuthenticatedApi.PostAsync(adminSession, "/api/v1/admin/users", new
        {
            userName,
            displayName = "Sınaq koordinatoru C",
            role = BaxOrdersRoles.Coordinator,
            password = firstPassword,
        });

        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
        var person = (await created.Content.ReadFromJsonAsync<UserDto>())!;
        users.Add(person.Id);

        using var personSession = AuthenticatedApi.Anonymous(factory);
        Assert.True((await AuthenticatedApi.SignInAsync(personSession, userName, firstPassword)).IsAuthenticated);

        var changed = await AuthenticatedApi.PostAsync(personSession, "/api/v1/auth/change-password", new
        {
            currentPassword = firstPassword,
            newPassword = chosenPassword,
        });
        Assert.Equal(HttpStatusCode.NoContent, changed.StatusCode);

        using var withOld = AuthenticatedApi.Anonymous(factory);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await AuthenticatedApi.TrySignInAsync(withOld, userName, firstPassword)).StatusCode);

        using var withNew = AuthenticatedApi.Anonymous(factory);
        Assert.True((await AuthenticatedApi.SignInAsync(withNew, userName, chosenPassword)).IsAuthenticated);

        // Stopping the account: the next request refuses, and so does a fresh sign-in.
        var disabled = await AuthenticatedApi.PatchAsync(adminSession, $"/api/v1/admin/users/{person.Id}", new { isActive = false });
        Assert.Equal(HttpStatusCode.OK, disabled.StatusCode);

        using var afterDisable = AuthenticatedApi.Anonymous(factory);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await AuthenticatedApi.TrySignInAsync(afterDisable, userName, chosenPassword)).StatusCode);

        // The session they already held stops working too, once the stamp is re-checked.
        await using var scope = factory.Services.CreateAsyncScope();
        var stored = await scope.ServiceProvider.GetRequiredService<BaxOrdersDbContext>()
            .Set<ApplicationUser>().AsNoTracking().SingleAsync(item => item.Id == person.Id);
        Assert.False(stored.IsActive);
    }

    // ---- helpers -------------------------------------------------------------------------------------

    private async Task<TestAccount> AccountAsync(string role, string displayName)
    {
        var account = await AuthenticatedApi.CreateUserAsync(factory, role, displayName);
        users.Add(account.Id);
        return account;
    }

    private static async Task<OrderWorkflowDto> SendAsync(HttpClient client, string url, object body)
    {
        var response = await AuthenticatedApi.PostAsync(client, url, body);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<OrderWorkflowDto>(AuthenticatedApi.Json))!;
    }

    private static async Task<OrderWorkflowDto> ReadWorkflowAsync(HttpClient client, long request)
    {
        var response = await client.GetAsync($"/api/v1/orders/{request}/workflow");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<OrderWorkflowDto>(AuthenticatedApi.Json))!;
    }

    private static async Task<List<OrderRequestWorkflowEvent>> EventsAsync(BaxOrdersDbContext db, long request) =>
        await db.OrderRequestWorkflowEvents.AsNoTracking()
            .Where(item => item.OrderRequestId == request)
            .OrderBy(item => item.Id)
            .ToListAsync();

    /// <summary>An object, a product and one order of its own, so no company data is anywhere near this.</summary>
    private async Task<long> SyntheticRequestAsync()
    {
        await using var db = database.CreateContext();
        var tag = Guid.NewGuid().ToString("N")[..6];

        var location = new Domain.Locations.Location(
            await new SqlServerLocationCodeGenerator(db).NextAsync(CancellationToken.None), $"Sınaq obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();
        locations.Add(location.Id);

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Domain.Catalog.Product(
            await new SqlServerProductCodeGenerator(db).NextAsync(CancellationToken.None), $"Sınaq malı {tag}");
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
}
