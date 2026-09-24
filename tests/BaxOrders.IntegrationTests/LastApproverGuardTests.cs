using System.Net;
using System.Net.Http.Json;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Users;
using BaxOrders.Infrastructure.Identity;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// No period in which nobody can approve: the last active Rəhbər cannot be disabled or moved to another role,
/// the count of active approvers is right, and startup says so when there is none.
/// </summary>
/// <remarks>
/// Each test has a database of its own, because what is tested is an exact count over every user in it — the
/// shared database holds every other test's Rəhbər accounts. Users go through the real Identity store, the
/// same way the users page creates them. No real user or role is involved anywhere.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class LastApproverGuardTests
{
    private static readonly CancellationToken None = CancellationToken.None;

    [PostgresFact]
    public async Task The_only_active_rehber_can_be_neither_disabled_nor_moved_to_another_role()
    {
        await using var app = await IsolatedApp.StartAsync();
        var rehber = await app.CreateAsync(BaxOrdersRoles.Manager, "Yeganə rəhbər");
        await app.CreateAsync(BaxOrdersRoles.Admin, "Administrator");
        await app.CreateAsync(BaxOrdersRoles.Coordinator, "Koordinator");

        Assert.Equal(1, await app.CountActiveApproversAsync());

        foreach (var change in new UpdateUserCommand[]
        {
            new(IsActive: false),
            new(Role: BaxOrdersRoles.Admin),
            new(Role: BaxOrdersRoles.Coordinator),
            // Nothing in a refused command is applied — not even the part that would have been allowed.
            new(DisplayName: "Yeni ad", IsActive: false),
        })
        {
            var (user, failure) = await app.UpdateAsync(rehber, change);

            Assert.Null(user);
            Assert.Equal(IdentityUserDirectory.LastApproverMessage, failure!.Message);
        }

        var unchanged = (await app.FindAsync(rehber))!;
        Assert.Equal((BaxOrdersRoles.Manager, true, "Yeganə rəhbər"), (unchanged.Role, unchanged.IsActive, unchanged.DisplayName));
        Assert.Equal(1, await app.CountActiveApproversAsync());

        // What leaves the authority where it is stays allowed.
        var renamed = await app.UpdateAsync(rehber, new UpdateUserCommand(DisplayName: "Adı dəyişən rəhbər", Role: BaxOrdersRoles.Manager));
        Assert.Null(renamed.Failure);
    }

    [PostgresFact]
    public async Task With_a_second_active_rehber_either_may_go_and_the_count_follows()
    {
        await using var app = await IsolatedApp.StartAsync();
        var first = await app.CreateAsync(BaxOrdersRoles.Manager, "Birinci rəhbər");
        var second = await app.CreateAsync(BaxOrdersRoles.Manager, "İkinci rəhbər");

        Assert.Equal(2, await app.CountActiveApproversAsync());

        Assert.Null((await app.UpdateAsync(first, new UpdateUserCommand(IsActive: false))).Failure);
        Assert.Equal(1, await app.CountActiveApproversAsync());

        // Now the second is the last one.
        Assert.NotNull((await app.UpdateAsync(second, new UpdateUserCommand(Role: BaxOrdersRoles.Coordinator))).Failure);

        // A disabled Rəhbər counts for nothing, and may be moved freely.
        Assert.Null((await app.UpdateAsync(first, new UpdateUserCommand(Role: BaxOrdersRoles.Coordinator))).Failure);

        // A fresh Rəhbər makes the old one movable.
        await app.CreateAsync(BaxOrdersRoles.Manager, "Üçüncü rəhbər");
        Assert.Null((await app.UpdateAsync(second, new UpdateUserCommand(Role: BaxOrdersRoles.Admin))).Failure);
        Assert.Equal(1, await app.CountActiveApproversAsync());
    }

    [PostgresFact]
    public async Task Administrators_and_coordinators_are_not_approvers()
    {
        await using var app = await IsolatedApp.StartAsync();
        await app.CreateAsync(BaxOrdersRoles.Admin, "Administrator");
        await app.CreateAsync(BaxOrdersRoles.Coordinator, "Koordinator");

        Assert.Equal(0, await app.CountActiveApproversAsync());
    }

    [PostgresFact]
    public async Task Over_http_the_refusal_reaches_the_users_page_and_the_count_is_readable()
    {
        await using var app = await IsolatedApp.StartAsync();
        var admin = await app.CreateAsync(BaxOrdersRoles.Admin, "Administrator");

        using var session = AuthenticatedApi.Anonymous(app.Factory);
        await AuthenticatedApi.SignInAsync(session, admin.UserName, admin.Password);

        Assert.Equal(0, await CountOverHttpAsync(session));

        var rehber = await app.CreateAsync(BaxOrdersRoles.Manager, "Yeganə rəhbər");
        Assert.Equal(1, await CountOverHttpAsync(session));

        var refused = await AuthenticatedApi.PatchAsync(session, $"/api/v1/admin/users/{rehber.Id}", new { isActive = false });
        Assert.Equal(HttpStatusCode.BadRequest, refused.StatusCode);
        Assert.Equal(IdentityUserDirectory.LastApproverMessage,
            (await refused.Content.ReadFromJsonAsync<Microsoft.AspNetCore.Mvc.ProblemDetails>())!.Detail);
        Assert.Equal(1, await CountOverHttpAsync(session));
    }

    [PostgresFact]
    public async Task Startup_warns_when_nobody_can_approve_and_grants_nothing()
    {
        await using var app = await IsolatedApp.StartAsync();
        var admin = await app.CreateAsync(BaxOrdersRoles.Admin, "Administrator");

        var withoutApprover = await app.InitializeAsync();
        Assert.Contains(withoutApprover, entry =>
            entry.Level == LogLevel.Warning && entry.Message.Contains("approval authority", StringComparison.Ordinal));

        // It only said so: nobody was created, and nobody was given the authority.
        Assert.Equal(0, await app.CountActiveApproversAsync());
        Assert.Equal(BaxOrdersRoles.Admin, (await app.FindAsync(admin))!.Role);
        Assert.Single(await app.ListAsync());

        await app.CreateAsync(BaxOrdersRoles.Manager, "Rəhbər");
        var withApprover = await app.InitializeAsync();
        Assert.DoesNotContain(withApprover, entry => entry.Message.Contains("approval authority", StringComparison.Ordinal));
    }

    private static async Task<int> CountOverHttpAsync(HttpClient session)
    {
        var response = await session.GetAsync("/api/v1/admin/users/approval-authority");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ApprovalAuthorityStatusDto>())!.ActiveApproverCount;
    }

    /// <summary>The real application on a database of its own, dropped afterwards.</summary>
    private sealed class IsolatedApp : IAsyncDisposable
    {
        private readonly IsolatedDatabase database;

        private IsolatedApp(IsolatedDatabase database)
        {
            this.database = database;
            Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Testing");
                builder.UseSetting("ConnectionStrings:BaxOrders", database.ConnectionString);
            });
        }

        public WebApplicationFactory<Program> Factory { get; }

        public static async Task<IsolatedApp> StartAsync()
        {
            var app = new IsolatedApp(await IsolatedDatabase.CreateAsync("baxorders_approvers"));

            // Starting the host runs the identity initializer, which brings the roles into existence.
            _ = app.Factory.Services;
            return app;
        }

        public Task<TestAccount> CreateAsync(string role, string displayName) =>
            AuthenticatedApi.CreateUserAsync(Factory, role, displayName);

        public Task<int> CountActiveApproversAsync() => WithDirectoryAsync(directory => directory.CountActiveApproversAsync(None));

        public Task<(UserDto? User, IdentityFailure? Failure)> UpdateAsync(TestAccount account, UpdateUserCommand command) =>
            WithDirectoryAsync(directory => directory.UpdateAsync(account.Id, command, None));

        public Task<UserDto?> FindAsync(TestAccount account) => WithDirectoryAsync(directory => directory.FindAsync(account.Id, None));

        public Task<IReadOnlyList<UserDto>> ListAsync() => WithDirectoryAsync(directory => directory.ListAsync(None));

        /// <summary>Runs the startup initializer again, as a restart would, and returns what it logged.</summary>
        public async Task<List<(LogLevel Level, string Message)>> InitializeAsync()
        {
            await using var scope = Factory.Services.CreateAsyncScope();
            var logger = new CapturingLogger();
            var initializer = new IdentityInitializer(
                scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>(),
                scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>(),
                logger);

            await initializer.InitializeAsync(new BootstrapAdminOptions(), None);
            return logger.Entries;
        }

        public async ValueTask DisposeAsync()
        {
            await Factory.DisposeAsync();
            await database.DisposeAsync();
        }

        private async Task<T> WithDirectoryAsync<T>(Func<IUserDirectory, Task<T>> work)
        {
            await using var scope = Factory.Services.CreateAsyncScope();
            return await work(scope.ServiceProvider.GetRequiredService<IUserDirectory>());
        }
    }

    private sealed class CapturingLogger : ILogger<IdentityInitializer>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Entries.Add((logLevel, formatter(state, exception)));
    }
}
