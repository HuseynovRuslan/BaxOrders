using System.Net;
using System.Net.Http.Json;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Users;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Identity;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// A session someone already holds follows what happens to their account (deploy review, 2026-10-18): the cookie
/// carries the security stamp, and disabling an account, changing its role or setting its password moves it.
/// </summary>
/// <remarks>
/// The real five-minute <c>ValidationInterval</c> is used. Only the clock the sign-in cookie and the stamp validator
/// read is the test's own, so "five minutes later" is one call rather than a wait; nothing else in the application
/// moves with it. Every request here is made with the cookie the person signed in with.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class SessionValidationEndToEndTests(PostgresDatabaseFixture database) : IAsyncLifetime
{
    /// <summary>One step past the longest a session may go without its account being read again.</summary>
    private static readonly TimeSpan PastTheInterval = TimeSpan.FromMinutes(5) + TimeSpan.FromSeconds(1);

    /// <summary>Any signed-in person may read it, whatever their role.</summary>
    private const string ProtectedRead = "/api/v1/dashboard/periods";

    private readonly TestClock clock = new();
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
            builder.ConfigureTestServices(services =>
            {
                services.PostConfigure<CookieAuthenticationOptions>(
                    IdentityConstants.ApplicationScheme, options => options.TimeProvider = clock);
                services.PostConfigure<SecurityStampValidatorOptions>(options => options.TimeProvider = clock);
            });
        });

        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        if (!string.IsNullOrWhiteSpace(PostgresDatabaseFixture.ConnectionString))
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

    [PostgresFact]
    public async Task A_disabled_account_keeps_its_session_no_longer_than_the_interval()
    {
        using var admin = await SignedInAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        var (person, session) = await AccountAndSessionAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        await ExpectAsync(HttpStatusCode.OK, session.GetAsync(ProtectedRead));

        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PatchAsync(admin, $"/api/v1/admin/users/{person.Id}", new { isActive = false }));

        // Inside the interval the account has not been read again: the documented window for reading.
        await ExpectAsync(HttpStatusCode.OK, session.GetAsync(ProtectedRead));

        clock.Advance(PastTheInterval);
        await ExpectAsync(HttpStatusCode.Unauthorized, session.GetAsync(ProtectedRead));
        await ExpectAsync(HttpStatusCode.Unauthorized, session.GetAsync("/api/v1/reports/monthly"));
        Assert.False((await MeAsync(session)).IsAuthenticated);
    }

    [PostgresFact]
    public async Task A_rehber_moved_to_another_role_cannot_decide_on_the_session_they_still_hold()
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        using var admin = await SignedInAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        using var coordinator = await SignedInAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        // A second Rəhbər keeps the company able to approve, so taking the role from the first one is allowed.
        using var otherRehber = await SignedInAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri 2");
        var (rehber, session) = await AccountAndSessionAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        var order = await SyntheticRequestAsync(tag);
        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PostAsync(coordinator, $"/api/v1/orders/{order}/workflow/submit", new { }));

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PatchAsync(admin, $"/api/v1/admin/users/{rehber.Id}", new { role = BaxOrdersRoles.Coordinator }));

        // At once — inside the interval, while the cookie still says Rəhbər — neither decision goes through.
        await ExpectAsync(HttpStatusCode.Forbidden, AuthenticatedApi.PostAsync(session, $"/api/v1/orders/{order}/workflow/approve", new { }));
        await ExpectAsync(HttpStatusCode.Forbidden,
            AuthenticatedApi.PostAsync(session, $"/api/v1/orders/{order}/workflow/return", new { reason = "Yenidən bax" }));

        // Reading the queue is not deciding: it keeps the documented window. A changed role moves the stamp, so past
        // the interval the session ends rather than carrying on — the person signs in again and gets the new role.
        await ExpectAsync(HttpStatusCode.OK, session.GetAsync("/api/v1/approvals/inbox"));
        clock.Advance(PastTheInterval);
        await ExpectAsync(HttpStatusCode.Unauthorized, session.GetAsync("/api/v1/approvals/inbox"));
        Assert.False((await MeAsync(session)).IsAuthenticated);

        using var signedInAgain = AuthenticatedApi.Anonymous(factory);
        var me = await AuthenticatedApi.SignInAsync(signedInAgain, rehber.UserName, rehber.Password);
        Assert.Equal(BaxOrdersRoles.Coordinator, me.Role);
        Assert.False(me.CanDecideOrders);
        await ExpectAsync(HttpStatusCode.Forbidden, signedInAgain.GetAsync("/api/v1/approvals/inbox"));

        // Nothing was decided on the stale session: the order is still waiting, and the Rəhbər who holds the role decides.
        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PostAsync(otherRehber, $"/api/v1/orders/{order}/workflow/approve", new { }));
    }

    [PostgresFact]
    public async Task A_disabled_rehber_cannot_decide_inside_the_interval()
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        using var admin = await SignedInAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        using var coordinator = await SignedInAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        using var otherRehber = await SignedInAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri 2");
        var (rehber, session) = await AccountAndSessionAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        var order = await SyntheticRequestAsync(tag);
        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PostAsync(coordinator, $"/api/v1/orders/{order}/workflow/submit", new { }));

        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PatchAsync(admin, $"/api/v1/admin/users/{rehber.Id}", new { isActive = false }));

        await ExpectAsync(HttpStatusCode.Forbidden, AuthenticatedApi.PostAsync(session, $"/api/v1/orders/{order}/workflow/approve", new { }));

        clock.Advance(PastTheInterval);
        await ExpectAsync(HttpStatusCode.Unauthorized, session.GetAsync(ProtectedRead));
        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PostAsync(otherRehber, $"/api/v1/orders/{order}/workflow/approve", new { }));
    }

    [PostgresFact]
    public async Task A_new_password_ends_the_other_sessions_and_keeps_the_one_that_set_it()
    {
        var (person, first) = await AccountAndSessionAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        using var second = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(second, person.UserName, person.Password);

        await ExpectAsync(HttpStatusCode.NoContent, AuthenticatedApi.PostAsync(first, "/api/v1/auth/change-password", new
        {
            currentPassword = person.Password,
            newPassword = "Teze-sifre-2026",
        }));

        clock.Advance(PastTheInterval);
        await ExpectAsync(HttpStatusCode.Unauthorized, second.GetAsync(ProtectedRead));
        await ExpectAsync(HttpStatusCode.OK, first.GetAsync(ProtectedRead));
    }

    [PostgresFact]
    public async Task A_password_an_administrator_sets_ends_the_session_the_person_held()
    {
        using var admin = await SignedInAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        var (person, session) = await AccountAndSessionAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");

        await ExpectAsync(HttpStatusCode.NoContent,
            AuthenticatedApi.PostAsync(admin, $"/api/v1/admin/users/{person.Id}/reset-password", new { newPassword = "Admin-verdi-2026" }));

        clock.Advance(PastTheInterval);
        await ExpectAsync(HttpStatusCode.Unauthorized, session.GetAsync(ProtectedRead));
    }

    [PostgresFact]
    public async Task An_active_account_keeps_working_across_several_checks_and_a_rehber_still_decides()
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        using var coordinator = await SignedInAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var (_, rehber) = await AccountAndSessionAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        var order = await SyntheticRequestAsync(tag);
        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PostAsync(coordinator, $"/api/v1/orders/{order}/workflow/submit", new { }));

        for (var check = 0; check < 3; check++)
        {
            clock.Advance(PastTheInterval);
            await ExpectAsync(HttpStatusCode.OK, coordinator.GetAsync(ProtectedRead));
            await ExpectAsync(HttpStatusCode.OK, rehber.GetAsync("/api/v1/approvals/inbox"));
        }

        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PostAsync(rehber, $"/api/v1/orders/{order}/workflow/approve", new { }));
    }

    [PostgresFact]
    public async Task Anonymous_requests_are_401_and_a_role_without_the_authority_is_403()
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        using var anonymous = AuthenticatedApi.Anonymous(factory);
        foreach (var url in new[] { ProtectedRead, "/api/v1/reports/monthly", "/api/v1/approvals/inbox", "/api/v1/admin/users" })
        {
            await ExpectAsync(HttpStatusCode.Unauthorized, anonymous.GetAsync(url));
        }

        using var coordinator = await SignedInAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        using var admin = await SignedInAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        using var rehber = await SignedInAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        var order = await SyntheticRequestAsync(tag);
        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PostAsync(coordinator, $"/api/v1/orders/{order}/workflow/submit", new { }));

        // Only a Rəhbər decides; nobody else does on any session (business rule unchanged).
        await ExpectAsync(HttpStatusCode.Forbidden, AuthenticatedApi.PostAsync(coordinator, $"/api/v1/orders/{order}/workflow/approve", new { }));
        await ExpectAsync(HttpStatusCode.Forbidden, AuthenticatedApi.PostAsync(admin, $"/api/v1/orders/{order}/workflow/approve", new { }));
        await ExpectAsync(HttpStatusCode.Forbidden, coordinator.GetAsync("/api/v1/approvals/inbox"));
        await ExpectAsync(HttpStatusCode.Forbidden, coordinator.GetAsync("/api/v1/admin/users"));
        await ExpectAsync(HttpStatusCode.Forbidden, rehber.GetAsync("/api/v1/admin/users"));
        await ExpectAsync(HttpStatusCode.OK, rehber.GetAsync("/api/v1/reports/monthly"));
    }

    // ---- helpers -------------------------------------------------------------------------------------

    private async Task<(TestAccount Account, HttpClient Session)> AccountAndSessionAsync(string role, string displayName)
    {
        var account = await AuthenticatedApi.CreateUserAsync(factory, role, displayName);
        users.Add(account.Id);

        var client = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(client, account.UserName, account.Password);
        return (account, client);
    }

    private async Task<HttpClient> SignedInAsync(string role, string displayName) =>
        (await AccountAndSessionAsync(role, displayName)).Session;

    private static async Task<CurrentUserDto> MeAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/v1/auth/me");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CurrentUserDto>(AuthenticatedApi.Json))!;
    }

    private async Task<long> SyntheticRequestAsync(string tag)
    {
        await using var db = database.CreateContext();

        var location = new Domain.Locations.Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(CancellationToken.None), $"Sessiya obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();
        locations.Add(location.Id);

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Domain.Catalog.Product(
            await new PostgresProductCodeGenerator(db).NextAsync(CancellationToken.None), $"Sessiya malı {tag}");
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

    private static async Task ExpectAsync(HttpStatusCode expected, Task<HttpResponseMessage> call)
    {
        var response = await call;
        Assert.True(response.StatusCode == expected,
            $"Expected {(int)expected}, got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
    }

    /// <summary>A clock that stands still until a test moves it.</summary>
    private sealed class TestClock : TimeProvider
    {
        private DateTimeOffset now = DateTimeOffset.UtcNow;

        public override DateTimeOffset GetUtcNow() => now;

        public void Advance(TimeSpan by) => now += by;
    }
}
