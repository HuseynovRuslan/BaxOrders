using BaxOrders.ApprovalSandbox;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Approvals;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Identity;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Task 4b: what the sandbox tool makes, and what it refuses to do, against a throw-away sandbox of its own.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class ApprovalSandboxToolTests : IAsyncLifetime
{
    private const string Password = AuthenticatedApi.Password;
    private static readonly CancellationToken None = CancellationToken.None;

    private readonly SandboxTarget target = SandboxForTests.NewTarget();

    public Task InitializeAsync() => Task.CompletedTask;

    public Task DisposeAsync() => SandboxForTests.DropAsync(target);

    /// <summary>
    /// Synthetic data only, and all of it there: three accounts, two test objects, the test order waiting, the
    /// draft unsent, and history carried in the way the real history was.
    /// </summary>
    [PostgresFact]
    public async Task Create_builds_the_sandbox_from_the_migrations_with_the_scenario_and_nothing_else()
    {
        var seeded = await SandboxLifecycle.CreateAsync(target, Password, None);
        await using var db = SandboxForTests.Context(target);

        // Built from the application's own migrations: none is pending.
        Assert.Empty(await db.Database.GetPendingMigrationsAsync(None));

        Assert.Equal(
            ["sinaq.admin|Sınaq Administratoru|Admin|True", "sinaq.koordinator|Sınaq Koordinatoru|Coordinator|True", "sinaq.rehber|Sınaq Rəhbəri|Manager|True"],
            await AccountsAsync(db));

        // Every object that holds an order, and every product, is a test one.
        var orderedAt = await db.OrderRequests.AsNoTracking().Select(order => order.Location.Code).Distinct().OrderBy(code => code).ToListAsync(None);
        Assert.Equal(["SINAQ-01", "SINAQ-02"], orderedAt);
        Assert.All(await db.Products.AsNoTracking().Select(product => product.Name).ToListAsync(None),
            name => Assert.StartsWith("Sınaq məhsulu", name, StringComparison.Ordinal));

        Assert.Equal(4, await db.OrderRequests.CountAsync(None));

        var test = await OrderAsync(db, seeded.TestOrderId);
        Assert.Equal((OrderRequestStatus.PendingApproval, "Sınaq obyekti 1", new DateOnly(2026, 9, 1), 5, 1),
            (test.Status, test.Location.Name, test.RequestPeriod, test.Items.Count, test.Items.Count(item => item.UnitPrice is null)));
        Assert.Equal(seeded.AccountIds["sinaq.koordinator"], test.SubmittedByUserId);
        var sent = Assert.Single(test.WorkflowEvents);
        Assert.Equal((OrderWorkflowAction.SubmittedForApproval, "Sınaq Koordinatoru", (Guid?)seeded.AccountIds["sinaq.koordinator"]),
            (sent.Action, sent.ActorDisplayName, sent.ActorUserId));

        var draft = await OrderAsync(db, seeded.DraftOrderId);
        Assert.Equal((OrderRequestStatus.Draft, "Sınaq obyekti 2", 4), (draft.Status, draft.Location.Name, draft.Items.Count));
        Assert.Empty(draft.WorkflowEvents);

        Assert.Equal([new DateOnly(2026, 7, 1), new DateOnly(2026, 8, 1)],
            await db.OrderRequests.AsNoTracking().Where(order => seeded.HistoricalOrderIds.Contains(order.Id))
                .OrderBy(order => order.RequestPeriod).Select(order => order.RequestPeriod).ToListAsync(None));
        foreach (var id in seeded.HistoricalOrderIds)
        {
            // Exactly as the real migration left the company's history.
            var historical = await OrderAsync(db, id);
            Assert.Equal(OrderRequestStatus.Approved, historical.Status);
            Assert.NotNull(historical.SourceImportBatchId);
            Assert.Null(historical.SubmittedAtUtc);
            Assert.Null(historical.ApprovedAtUtc);
            Assert.Null(historical.SubmittedByUserId);
            var carried = Assert.Single(historical.WorkflowEvents);
            Assert.Equal(
                (OrderWorkflowAction.ImportedAsApproved, OrderRequestStatus.Draft, OrderRequestStatus.Approved, (Guid?)null, "Sistem", SandboxScenario.HistoricalComment, false),
                (carried.Action, carried.FromStatus, carried.ToStatus, carried.ActorUserId, carried.ActorDisplayName, carried.Comment, carried.MissingPricesAcknowledged));
        }

        // "Test mühitində 'Təsdiq gözləyənlər'də bir test sifarişi görürəm."
        var inbox = await InboxAsync(db, seeded);
        Assert.Equal(seeded.TestOrderId, Assert.Single(inbox.Rows.Items).OrderRequestId);
    }

    [PostgresFact]
    public async Task Create_refuses_a_sandbox_that_already_exists_and_leaves_it_as_it_was()
    {
        var seeded = await SandboxLifecycle.CreateAsync(target, Password, None);
        var before = await StateAsync(seeded);

        var refused = await Assert.ThrowsAsync<SandboxRefusedException>(() => SandboxLifecycle.CreateAsync(target, Password, None));
        Assert.Contains("already exists", refused.Message, StringComparison.Ordinal);

        Assert.Equal(before, await StateAsync(seeded));
    }

    /// <summary>Guard 4: seeding writes only into a database that holds no order at all.</summary>
    [PostgresFact]
    public async Task Seeding_refuses_a_database_that_already_holds_orders_and_writes_nothing()
    {
        var seeded = await SandboxLifecycle.CreateAsync(target, Password, None);
        var before = await StateAsync(seeded);
        int users;
        await using (var db = SandboxForTests.Context(target))
        {
            users = await db.Set<ApplicationUser>().CountAsync(None);
        }

        await using (var services = SandboxLifecycle.Services(SandboxForTests.ConnectionString(target)))
        await using (var scope = services.CreateAsyncScope())
        {
            var refused = await Assert.ThrowsAsync<SandboxRefusedException>(() =>
                SandboxSeed.SeedAsync(scope.ServiceProvider, target.DatabaseName!, Password, None));
            Assert.Contains("already holds order requests", refused.Message, StringComparison.Ordinal);
        }

        Assert.Equal(before, await StateAsync(seeded));
        await using (var db = SandboxForTests.Context(target))
        {
            Assert.Equal(users, await db.Set<ApplicationUser>().CountAsync(None));
        }
    }

    /// <summary>
    /// Reset is how Task 12 and Task 15 get the test order fresh again: whatever was done in the sandbox, two
    /// resets give the same accounts, the same test order in the queue, the same draft and the same history.
    /// </summary>
    [PostgresFact]
    public async Task Reset_gives_the_same_seeded_state_every_time_whatever_was_done_before()
    {
        var seeded = await SandboxLifecycle.CreateAsync(target, Password, None);
        var fresh = await StateAsync(seeded);

        // Somebody used it: the draft was sent.
        await using (var db = SandboxForTests.Context(target))
        {
            var coordinator = new TestCurrentUser(seeded.AccountIds["sinaq.koordinator"], "Sınaq Koordinatoru", BaxOrdersRoles.Coordinator);
            await new OrderWorkflowService(db, coordinator, new PostgresOrderRequestLock(db))
                .SubmitAsync(seeded.DraftOrderId, new SubmitForApprovalCommand(), None);
        }

        Assert.NotEqual(fresh, await StateAsync(seeded));

        var first = await SandboxLifecycle.ResetAsync(target, Password, None);
        var afterFirst = await StateAsync(first);
        var second = await SandboxLifecycle.ResetAsync(target, Password, None);
        var afterSecond = await StateAsync(second);

        Assert.Equal(fresh, afterFirst);
        Assert.Equal(afterFirst, afterSecond);
    }

    // ---- helpers --------------------------------------------------------------------------------------

    /// <summary>
    /// The seeded state in words: the accounts, what waits in the Rəhbər's queue, and every order with its
    /// lines and its history. Ids and moments are left out — they are new each time; the content is not.
    /// </summary>
    private async Task<List<string>> StateAsync(SandboxContents seeded)
    {
        await using var db = SandboxForTests.Context(target);
        var state = new List<string>();
        state.AddRange(await AccountsAsync(db));

        state.AddRange((await InboxAsync(db, seeded)).Rows.Items.Select(row =>
            $"inbox: {row.LocationName} {row.RequestPeriod:yyyy-MM} v{row.Version} by {row.SubmittedByDisplayName}, "
            + $"{row.ItemCount} lines, {row.MissingPriceItemCount} unpriced, {row.KnownAmount}"));

        var orders = await db.OrderRequests.AsNoTracking()
            .Include(order => order.Location)
            .Include(order => order.Items).ThenInclude(item => item.ProductVariant).ThenInclude(variant => variant.Product)
            .Include(order => order.WorkflowEvents)
            .OrderBy(order => order.Location.Code).ThenBy(order => order.RequestPeriod).ThenBy(order => order.Version)
            .ToListAsync(None);

        state.AddRange(orders.Select(order =>
            $"order: {order.Location.Code} {order.RequestPeriod:yyyy-MM} v{order.Version} {order.Status} "
            + $"import={order.SourceImportBatchId is not null} "
            + $"lines=[{string.Join("; ", order.Items.OrderBy(item => item.ProductVariant.Product.Name).Select(item => $"{item.ProductVariant.Product.Name} {item.Quantity:0.###}×{item.UnitPrice?.ToString("0.####") ?? "—"}"))}] "
            + $"events=[{string.Join(", ", order.WorkflowEvents.OrderBy(entry => entry.Id).Select(entry => $"{entry.Action} by {entry.ActorDisplayName}"))}]"));

        return state;
    }

    private static async Task<List<string>> AccountsAsync(BaxOrdersDbContext db)
    {
        var accounts = await (
                from user in db.Set<ApplicationUser>().AsNoTracking()
                join link in db.UserRoles on user.Id equals link.UserId
                join role in db.Roles on link.RoleId equals role.Id
                select new { user.UserName, user.DisplayName, role.Name, user.IsActive })
            .ToListAsync(None);

        return [.. accounts.Select(account => $"{account.UserName}|{account.DisplayName}|{account.Name}|{account.IsActive}").Order(StringComparer.Ordinal)];
    }

    private static Task<ApprovalInboxDto> InboxAsync(BaxOrdersDbContext db, SandboxContents seeded) =>
        new ApprovalInboxQueries(db, new TestCurrentUser(seeded.AccountIds["sinaq.rehber"], "Sınaq Rəhbəri", BaxOrdersRoles.Manager))
            .GetAsync(new ApprovalInboxQuery(), None);

    private static Task<OrderRequest> OrderAsync(BaxOrdersDbContext db, long id) =>
        db.OrderRequests.AsNoTracking()
            .Include(order => order.Location)
            .Include(order => order.Items)
            .Include(order => order.WorkflowEvents)
            .SingleAsync(order => order.Id == id, None);
}
