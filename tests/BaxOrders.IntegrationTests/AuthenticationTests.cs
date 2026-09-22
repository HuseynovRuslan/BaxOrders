using System.Net;
using System.Net.Http.Json;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Users;
using BaxOrders.Infrastructure.Identity;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Signing in for real: the cookie, the antiforgery token, the policies and the lockout, through the actual
/// HTTP pipeline rather than around it.
/// </summary>
/// <remarks>
/// Nothing here is relaxed to make a test pass. The users are created through the real manager, the requests
/// go through the real middleware, and what is asserted is what a browser would meet.
/// </remarks>
[Collection(SqlServerCollection.Name)]
public sealed class AuthenticationTests(SqlServerDatabaseFixture database) : IAsyncLifetime
{
    private WebApplicationFactory<Program> factory = null!;

    public Task InitializeAsync()
    {
        factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");

            // Pointed at the suite's own database through configuration, so the application wires itself up
            // exactly as it does in production rather than having pieces swapped out underneath it.
            builder.UseSetting("ConnectionStrings:BaxOrders", SqlServerDatabaseFixture.ConnectionString);
        });

        return Task.CompletedTask;
    }

    public async Task DisposeAsync() => await factory.DisposeAsync();

    // ---- the door is shut ----------------------------------------------------------------------------

    [SqlServerFact]
    public async Task A_stranger_cannot_read_the_company_s_data()
    {
        using var client = Anonymous();

        foreach (var url in new[]
        {
            "/api/v1/dashboard/periods",
            "/api/v1/locations/orders",
            "/api/v1/analytics/locations/1/periods",
            "/api/v1/admin/users",
        })
        {
            var response = await client.GetAsync(url);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }

    [SqlServerFact]
    public async Task A_stranger_cannot_change_anything()
    {
        using var client = Anonymous();

        var response = await PostAsync(client, "/api/v1/orders/1/workflow/submit", new { });

        // 401, not a redirect to a sign-in page: a fetch() has to be able to tell what happened.
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Null(response.Headers.Location);
    }

    [SqlServerFact]
    public async Task Health_stays_open_so_a_monitor_can_still_ask()
    {
        using var client = Anonymous();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health")).StatusCode);
    }

    // ---- signing in ----------------------------------------------------------------------------------

    [SqlServerFact]
    public async Task A_correct_password_signs_you_in()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        using var client = Anonymous();

        var me = await SignInAsync(client, account.UserName, account.Password);

        Assert.True(me.IsAuthenticated);
        Assert.Equal("Sınaq koordinatoru", me.DisplayName);
        Assert.Equal(BaxOrdersRoles.Coordinator, me.Role);
        Assert.True(me.CanSubmitOrders);
        Assert.False(me.CanDecideOrders);
        Assert.False(me.CanManageUsers);
    }

    [SqlServerFact]
    public async Task A_wrong_password_does_not_say_whether_the_name_exists()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Coordinator);
        using var client = Anonymous();

        var wrongPassword = await PostAsync(client, "/api/v1/auth/login", new { userName = account.UserName, password = "Wrong-Password-1" });
        var noSuchUser = await PostAsync(client, "/api/v1/auth/login", new { userName = "nobody-at-all", password = "Wrong-Password-1" });

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, noSuchUser.StatusCode);
        Assert.Equal(await wrongPassword.Content.ReadAsStringAsync(), await noSuchUser.Content.ReadAsStringAsync());
    }

    [SqlServerFact]
    public async Task Signing_out_ends_the_session()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Manager);
        using var client = Anonymous();
        await SignInAsync(client, account.UserName, account.Password);

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/dashboard/periods")).StatusCode);

        var signOut = await PostAsync(client, "/api/v1/auth/logout", new { });
        Assert.Equal(HttpStatusCode.NoContent, signOut.StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/dashboard/periods")).StatusCode);
    }

    [SqlServerFact]
    public async Task An_anonymous_caller_is_told_so_rather_than_refused()
    {
        using var client = Anonymous();

        var me = await (await client.GetAsync("/api/v1/auth/me")).Content.ReadFromJsonAsync<CurrentUserDto>();

        Assert.False(me!.IsAuthenticated);
        Assert.Null(me.Role);
    }

    [SqlServerFact]
    public async Task Too_many_wrong_passwords_lock_the_account_for_a_while()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Coordinator);
        using var client = Anonymous();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            await PostAsync(client, "/api/v1/auth/login", new { userName = account.UserName, password = "Wrong-Password-1" });
        }

        // The right password now fails too: guessing is not worth the wait.
        var correct = await PostAsync(client, "/api/v1/auth/login", new { userName = account.UserName, password = account.Password });

        Assert.Equal(HttpStatusCode.Unauthorized, correct.StatusCode);

        await using var db = database.CreateContext();
        var stored = await db.Set<ApplicationUser>().SingleAsync(user => user.UserName == account.UserName);
        Assert.NotNull(stored.LockoutEnd);
    }

    [SqlServerFact]
    public async Task A_disabled_account_cannot_sign_in()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Coordinator);
        await WithScopeAsync(async services =>
        {
            var directory = services.GetRequiredService<IUserDirectory>();
            await directory.UpdateAsync(account.Id, new UpdateUserCommand(IsActive: false), CancellationToken.None);
        });

        using var client = Anonymous();
        var response = await PostAsync(client, "/api/v1/auth/login", new { userName = account.UserName, password = account.Password });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ---- what each role may do -----------------------------------------------------------------------

    [SqlServerFact]
    public async Task A_coordinator_may_run_imports_and_submit_but_not_decide()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Coordinator);
        using var client = Anonymous();
        await SignInAsync(client, account.UserName, account.Password);

        // Not 403: the policy lets them through, and the request fails for a business reason instead.
        Assert.NotEqual(HttpStatusCode.Forbidden,
            (await PostAsync(client, "/api/v1/orders/999999/workflow/submit", new { })).StatusCode);

        Assert.Equal(HttpStatusCode.Forbidden,
            (await PostAsync(client, "/api/v1/orders/999999/workflow/approve", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await PostAsync(client, "/api/v1/orders/999999/workflow/return", new { reason = "yox" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/v1/admin/users")).StatusCode);
    }

    [SqlServerFact]
    public async Task A_manager_may_decide_but_not_submit_or_import()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Manager);
        using var client = Anonymous();
        await SignInAsync(client, account.UserName, account.Password);

        Assert.NotEqual(HttpStatusCode.Forbidden,
            (await PostAsync(client, "/api/v1/orders/999999/workflow/approve", new { })).StatusCode);

        Assert.Equal(HttpStatusCode.Forbidden,
            (await PostAsync(client, "/api/v1/orders/999999/workflow/submit", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/v1/admin/users")).StatusCode);

        // A manager reads the imports but changes nothing in them.
        Assert.Equal(HttpStatusCode.Forbidden,
            (await PostAsync(client, "/api/v1/imports/1/rows/1/exclude", new { reason = "yox" })).StatusCode);
    }

    [SqlServerFact]
    public async Task An_administrator_may_do_both_and_manage_users()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Admin);
        using var client = Anonymous();
        await SignInAsync(client, account.UserName, account.Password);

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/admin/users")).StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden,
            (await PostAsync(client, "/api/v1/orders/999999/workflow/submit", new { })).StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden,
            (await PostAsync(client, "/api/v1/orders/999999/workflow/approve", new { })).StatusCode);
    }

    [SqlServerFact]
    public async Task Everybody_signed_in_may_read_the_operational_screens()
    {
        foreach (var role in BaxOrdersRoles.All)
        {
            var account = await CreateUserAsync(role);
            using var client = Anonymous();
            await SignInAsync(client, account.UserName, account.Password);

            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/dashboard/periods")).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/locations/orders")).StatusCode);
        }
    }

    // ---- antiforgery ---------------------------------------------------------------------------------

    [SqlServerFact]
    public async Task A_signed_in_request_without_the_antiforgery_token_is_refused()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Admin);
        using var client = Anonymous();
        await SignInAsync(client, account.UserName, account.Password);

        // Signed in, and still refused: the cookie alone is not proof the request came from our own page.
        var response = await client.PostAsJsonAsync(
            "/api/v1/admin/users", new { userName = "x", displayName = "x", role = "Admin", password = "x" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [SqlServerFact]
    public async Task The_same_request_with_the_token_goes_through()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Admin);
        using var client = Anonymous();
        await SignInAsync(client, account.UserName, account.Password);

        var created = await PostAsync(client, "/api/v1/admin/users", new
        {
            userName = $"yeni-{Guid.NewGuid():N}"[..20],
            displayName = "Yeni İstifadəçi",
            role = BaxOrdersRoles.Coordinator,
            password = "Duzgun-Sifre-1",
        });

        Assert.Equal(HttpStatusCode.OK, created.StatusCode);
    }

    [SqlServerFact]
    public async Task Signing_in_hands_back_a_token_that_works_for_the_session_it_just_created()
    {
        // What a page actually does: ask for a token once, sign in, then write — without asking again. The
        // token is bound to the identity it was issued to, so signing in has to hand back a new one.
        var account = await CreateUserAsync(BaxOrdersRoles.Admin);
        using var client = Anonymous();

        var anonymousToken = AuthenticatedApi.TokenFrom(await client.GetAsync("/api/v1/auth/csrf"));
        Assert.NotNull(anonymousToken);

        var login = await AuthenticatedApi.PostWithTokenAsync(
            client, "/api/v1/auth/login", new { userName = account.UserName, password = account.Password }, anonymousToken);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);

        var afterSignIn = AuthenticatedApi.TokenFrom(login);
        Assert.NotNull(afterSignIn);
        Assert.NotEqual(anonymousToken, afterSignIn);

        var write = await AuthenticatedApi.PostWithTokenAsync(client, "/api/v1/admin/users", new
        {
            userName = $"sonra-{Guid.NewGuid():N}"[..20],
            displayName = "Girişdən sonra",
            role = BaxOrdersRoles.Coordinator,
            password = "Duzgun-Sifre-1",
        }, afterSignIn);

        Assert.Equal(HttpStatusCode.OK, write.StatusCode);

        // And the one from before signing in is no longer good enough, which is why it had to be replaced.
        var stale = await AuthenticatedApi.PostWithTokenAsync(client, "/api/v1/admin/users", new
        {
            userName = $"kohne-{Guid.NewGuid():N}"[..20],
            displayName = "Köhnə token",
            role = BaxOrdersRoles.Coordinator,
            password = "Duzgun-Sifre-1",
        }, anonymousToken);

        Assert.Equal(HttpStatusCode.BadRequest, stale.StatusCode);
    }

    [SqlServerFact]
    public async Task Signing_out_hands_back_a_token_for_the_anonymous_page_that_is_left()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Coordinator);
        using var client = Anonymous();
        await SignInAsync(client, account.UserName, account.Password);

        var signOut = await PostAsync(client, "/api/v1/auth/logout", new { });
        Assert.Equal(HttpStatusCode.NoContent, signOut.StatusCode);

        var afterSignOut = AuthenticatedApi.TokenFrom(signOut);
        Assert.NotNull(afterSignOut);

        // The sign-in form is a write too, so it needs a token that matches the anonymous page it sits on.
        var signInAgain = await AuthenticatedApi.PostWithTokenAsync(
            client, "/api/v1/auth/login", new { userName = account.UserName, password = account.Password }, afterSignOut);

        Assert.Equal(HttpStatusCode.OK, signInAgain.StatusCode);
    }

    // ---- user administration -------------------------------------------------------------------------

    [SqlServerFact]
    public async Task A_name_that_is_already_taken_is_refused()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Admin);
        using var client = Anonymous();
        await SignInAsync(client, account.UserName, account.Password);

        var duplicate = await PostAsync(client, "/api/v1/admin/users", new
        {
            userName = account.UserName,
            displayName = "Təkrar",
            role = BaxOrdersRoles.Coordinator,
            password = "Duzgun-Sifre-1",
        });

        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
    }

    [SqlServerFact]
    public async Task A_role_the_system_does_not_have_is_refused()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Admin);
        using var client = Anonymous();
        await SignInAsync(client, account.UserName, account.Password);

        var response = await PostAsync(client, "/api/v1/admin/users", new
        {
            userName = $"rol-{Guid.NewGuid():N}"[..20],
            displayName = "Naməlum rol",
            role = "SuperUser",
            password = "Duzgun-Sifre-1",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [SqlServerFact]
    public async Task There_is_no_way_to_delete_a_user()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Admin);
        using var client = Anonymous();
        await SignInAsync(client, account.UserName, account.Password);

        // A workflow event names a user forever; disabling is the only way to stop an account working.
        var response = await client.DeleteAsync($"/api/v1/admin/users/{account.Id}");

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
    }

    // ---- passwords -----------------------------------------------------------------------------------

    [SqlServerFact]
    public async Task Changing_your_own_password_needs_the_old_one_and_keeps_you_signed_in()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Coordinator);
        using var client = Anonymous();
        await SignInAsync(client, account.UserName, account.Password);

        var wrongCurrent = await PostAsync(client, "/api/v1/auth/change-password", new
        {
            currentPassword = "Not-The-Password-1",
            newPassword = "Yeni-Sifre-2026",
        });
        Assert.Equal(HttpStatusCode.BadRequest, wrongCurrent.StatusCode);

        var changed = await PostAsync(client, "/api/v1/auth/change-password", new
        {
            currentPassword = account.Password,
            newPassword = "Yeni-Sifre-2026",
        });
        Assert.Equal(HttpStatusCode.NoContent, changed.StatusCode);

        // Still signed in on this device, because the session was refreshed with the new stamp.
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/dashboard/periods")).StatusCode);

        using var fresh = Anonymous();
        Assert.Equal(HttpStatusCode.Unauthorized, (await PostAsync(fresh,
            "/api/v1/auth/login", new { userName = account.UserName, password = account.Password })).StatusCode);

        var me = await SignInAsync(fresh, account.UserName, "Yeni-Sifre-2026");
        Assert.True(me.IsAuthenticated);
    }

    [SqlServerFact]
    public async Task An_administrator_can_reset_somebody_s_password()
    {
        var admin = await CreateUserAsync(BaxOrdersRoles.Admin);
        var person = await CreateUserAsync(BaxOrdersRoles.Coordinator);

        using var adminClient = Anonymous();
        await SignInAsync(adminClient, admin.UserName, admin.Password);

        var reset = await PostAsync(adminClient, $"/api/v1/admin/users/{person.Id}/reset-password",
            new { newPassword = "Sifirlanmis-1" });
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);

        using var personClient = Anonymous();
        Assert.True((await SignInAsync(personClient, person.UserName, "Sifirlanmis-1")).IsAuthenticated);
    }

    [SqlServerFact]
    public async Task A_password_that_is_too_weak_is_refused()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Admin);
        using var client = Anonymous();
        await SignInAsync(client, account.UserName, account.Password);

        var response = await PostAsync(client, "/api/v1/admin/users", new
        {
            userName = $"zeif-{Guid.NewGuid():N}"[..20],
            displayName = "Zəif şifrə",
            role = BaxOrdersRoles.Coordinator,
            password = "abc",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---- the audit trail -----------------------------------------------------------------------------

    [SqlServerFact]
    public async Task Renaming_somebody_does_not_rewrite_what_the_history_says_they_did()
    {
        var account = await CreateUserAsync(BaxOrdersRoles.Coordinator, "Köhnə ad");

        await using var db = database.CreateContext();
        var world = await SeedRequestAsync(db);
        var actor = new TestCurrentUser(account.Id, "Köhnə ad", BaxOrdersRoles.Coordinator);
        await new Application.Orders.Workflow.OrderWorkflowService(db, actor, new SqlServerOrderRequestLock(db))
            .SubmitAsync(world, new Application.Orders.Workflow.SubmitForApprovalCommand(), CancellationToken.None);

        await WithScopeAsync(async services =>
        {
            var directory = services.GetRequiredService<IUserDirectory>();
            await directory.UpdateAsync(account.Id, new UpdateUserCommand(DisplayName: "Yeni ad"), CancellationToken.None);
        });

        await using var check = database.CreateContext();
        var workflowEvent = await check.OrderRequestWorkflowEvents.SingleAsync(item => item.OrderRequestId == world);

        // The id still points at the person; the name is what it read when they acted.
        Assert.Equal(account.Id, workflowEvent.ActorUserId);
        Assert.Equal("Köhnə ad", workflowEvent.ActorDisplayName);
    }

    [SqlServerFact]
    public async Task An_action_recorded_before_sign_in_existed_is_still_readable()
    {
        await using var db = database.CreateContext();
        var world = await SeedRequestAsync(db);

        // What the events written before authentication look like: a name and no user at all.
        var request = await db.OrderRequests.Include(item => item.Items).SingleAsync(item => item.Id == world);
        request.SubmitForApproval(Domain.Orders.WorkflowActor.System("Tarixi import"), null, DateTime.UtcNow);
        await db.SaveChangesAsync();

        await using var check = database.CreateContext();
        var workflowEvent = await check.OrderRequestWorkflowEvents.SingleAsync(item => item.OrderRequestId == world);

        Assert.Null(workflowEvent.ActorUserId);
        Assert.Equal("Tarixi import", workflowEvent.ActorDisplayName);
    }

    // ---- helpers -------------------------------------------------------------------------------------

    private HttpClient Anonymous() => AuthenticatedApi.Anonymous(factory);

    private Task<TestAccount> CreateUserAsync(string role, string displayName = "Sınaq istifadəçisi") =>
        AuthenticatedApi.CreateUserAsync(factory, role, displayName);

    private async Task WithScopeAsync(Func<IServiceProvider, Task> work)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        await work(scope.ServiceProvider);
    }

    private static Task<CurrentUserDto> SignInAsync(HttpClient client, string userName, string password) =>
        AuthenticatedApi.SignInAsync(client, userName, password);

    private static Task<HttpResponseMessage> PostAsync(HttpClient client, string url, object body) =>
        AuthenticatedApi.PostAsync(client, url, body);

    private static async Task<long> SeedRequestAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..6];
        var location = new Domain.Locations.Location(
            await new SqlServerLocationCodeGenerator(db).NextAsync(CancellationToken.None), $"Auth obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Domain.Catalog.Product(
            await new SqlServerProductCodeGenerator(db).NextAsync(CancellationToken.None), $"Auth malı {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var request = new Domain.Orders.OrderRequest(location, new DateOnly(2026, 7, 1));
        request.AddItem(variant, 10m, 5m);
        db.OrderRequests.Add(request);
        await db.SaveChangesAsync();

        return request.Id;
    }
}

