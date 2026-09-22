using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Orders.Revisions;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The things that changed shape when the database changed: the concurrency token, the row locks, the
/// sequences and the constraints that PostgreSQL enforces rather than SQL Server.
/// </summary>
/// <remarks>
/// These are not repeats of the business tests. Each one pins a guarantee the application leans on and that a
/// provider could quietly stop giving — a stale write refused, a race serialised, a unique index that treats
/// nulls the way the model assumes. Nothing here is mocked: that would test the mock.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class PostgresBehaviourTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    // ---- the concurrency token ------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_concurrency_token_moves_whenever_the_row_changes()
    {
        var world = await ReturnedAsync();

        var before = (await RevisionOf(world.Coordinator, service => service.GetAsync(world.V2, None)))!.RowVersion;
        await EditAsync(world, quantity: 11m);
        var after = (await RevisionOf(world.Coordinator, service => service.GetAsync(world.V2, None)))!.RowVersion;

        Assert.NotEqual(before, after);

        // 32 hexadecimal characters: the application's own stamp, not PostgreSQL's xmin and not a byte array
        // whose shape would change with the provider.
        Assert.Equal(32, after.Length);
        Assert.Matches("^[0-9A-F]{32}$", after);
    }

    [PostgresFact]
    public async Task A_write_from_a_copy_that_is_no_longer_current_is_refused()
    {
        var world = await ReturnedAsync();
        var stale = (await RevisionOf(world.Coordinator, service => service.GetAsync(world.V2, None)))!.RowVersion;

        await EditAsync(world, quantity: 11m);

        var refused = await Assert.ThrowsAsync<ConflictException>(() => RevisionOf(world.Coordinator, service =>
            service.EditItemAsync(world.V2, world.LineId, new EditOrderItemCommand(stale, Quantity: new(99m)), None)));

        Assert.Contains("Reload", refused.Message, StringComparison.OrdinalIgnoreCase);

        await using var db = database.CreateContext();
        Assert.Equal(11m, (await db.OrderRequestItems.SingleAsync(item => item.Id == world.LineId)).Quantity);
    }

    [PostgresFact]
    public async Task Two_edits_racing_on_one_line_do_not_both_win()
    {
        var world = await ReturnedAsync();
        var token = (await RevisionOf(world.Coordinator, service => service.GetAsync(world.V2, None)))!.RowVersion;

        // Both read the same token, as two browsers open on the same screen would.
        var outcomes = await Task.WhenAll(
            Attempt(world, token, 21m),
            Attempt(world, token, 22m));

        Assert.Equal(1, outcomes.Count(ok => ok));

        await using var db = database.CreateContext();
        var quantity = (await db.OrderRequestItems.SingleAsync(item => item.Id == world.LineId)).Quantity;
        Assert.Contains(quantity, new[] { 21m, 22m });
    }

    // ---- row locks ------------------------------------------------------------------------------------

    [PostgresFact]
    public async Task Correcting_and_sending_back_the_same_request_cannot_both_happen()
    {
        var world = await ReturnedAsync(correct: false);

        // One takes the lock and wins; the other finds the request already corrected, or already resubmitted.
        var correcting = RevisionOf(world.Coordinator, service => service.CreateAsync(world.V1, None))
            .ContinueWith(task => task.IsCompletedSuccessfully, TaskScheduler.Default);
        var resubmitting = WorkflowOf(world.Coordinator, service =>
                service.SubmitAsync(world.V1, new SubmitForApprovalCommand(), None))
            .ContinueWith(task => task.IsCompletedSuccessfully, TaskScheduler.Default);

        await Task.WhenAll(correcting, resubmitting);

        await using var db = database.CreateContext();
        var corrections = await db.OrderRequestRevisions.CountAsync(revision => revision.SourceOrderRequestId == world.V1);
        var status = (await db.OrderRequests.SingleAsync(request => request.Id == world.V1)).Status;

        // Whichever went first, the outcome is one coherent state rather than both at once.
        Assert.True(corrections <= 1);
        if (corrections == 1)
        {
            Assert.Equal(OrderRequestStatus.ReturnedForCorrection, status);
        }
    }

    [PostgresFact]
    public async Task Several_people_correcting_one_returned_request_make_one_correction()
    {
        var world = await ReturnedAsync(correct: false);

        var attempts = await Task.WhenAll(Enumerable.Range(0, 4).Select(_ =>
            RevisionOf(world.Coordinator, service => service.CreateAsync(world.V1, None))));

        Assert.Single(attempts.Select(attempt => attempt.OrderRequestId).Distinct());
        Assert.Equal(1, attempts.Count(attempt => !attempt.AlreadyExisted));
    }

    [PostgresFact]
    public async Task The_import_lock_serialises_two_decisions_about_one_batch()
    {
        await using var db = database.CreateContext();
        var hash = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
        var batch = new ImportBatch($"lock-{Guid.NewGuid():N}.xlsx", hash, DateTime.UtcNow);
        db.ImportBatches.Add(batch);
        await db.SaveChangesAsync();

        var started = new TaskCompletionSource();
        var holder = Task.Run(async () =>
        {
            await using var first = database.CreateContext();
            await using var transaction = await first.Database.BeginTransactionAsync();
            await new PostgresImportBatchLock(first).AcquireAsync(batch.Id, None);
            started.SetResult();
            await Task.Delay(750);
            await transaction.RollbackAsync();
        });

        await started.Task;

        var waited = System.Diagnostics.Stopwatch.StartNew();
        await using (var second = database.CreateContext())
        {
            await using var transaction = await second.Database.BeginTransactionAsync();
            await new PostgresImportBatchLock(second).AcquireAsync(batch.Id, None);
            await transaction.RollbackAsync();
        }

        waited.Stop();
        await holder;

        // The second caller waited for the first rather than walking straight through.
        Assert.True(waited.ElapsedMilliseconds > 300, $"The lock did not hold: waited {waited.ElapsedMilliseconds} ms.");
    }

    // ---- sequences ------------------------------------------------------------------------------------

    [PostgresFact]
    public async Task Concurrent_code_requests_never_collide()
    {
        var codes = await Task.WhenAll(Enumerable.Range(0, 25).Select(async _ =>
        {
            await using var db = database.CreateContext();
            return await new PostgresProductCodeGenerator(db).NextAsync(None);
        }));

        Assert.Equal(codes.Length, codes.Distinct().Count());
        Assert.All(codes, code => Assert.Matches("^PRD-[0-9]{6}$", code));
    }

    [PostgresFact]
    public async Task The_sequences_carry_on_past_the_codes_that_were_transferred()
    {
        await using var db = database.CreateContext();
        var next = await new PostgresLocationCodeGenerator(db).NextAsync(None);

        // Whatever the transfer left behind, the next code is free: the insert below is the proof.
        var location = new Location(next, $"Ardıcıllıq obyekti {Guid.NewGuid():N}"[..28]);
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        Assert.True(location.Id > 0);
        Assert.False(await db.Locations.AnyAsync(other => other.Code == next && other.Id != location.Id));
    }

    // ---- constraints PostgreSQL enforces --------------------------------------------------------------

    [PostgresFact]
    public async Task A_quantity_of_zero_is_refused_by_the_database_too()
    {
        await using var db = database.CreateContext();
        var world = await SyntheticRequestAsync(db);

        var failure = await Assert.ThrowsAsync<PostgresException>(async () =>
        {
            await db.Database.ExecuteSqlAsync(
                $"""UPDATE "OrderRequestItems" SET "Quantity" = 0 WHERE "Id" = {world.LineId}""");
        });

        Assert.Equal("CK_OrderRequestItems_Quantity", failure.ConstraintName);
    }

    [PostgresFact]
    public async Task A_request_period_that_is_not_a_month_start_is_refused()
    {
        await using var db = database.CreateContext();
        var world = await SyntheticRequestAsync(db);

        var failure = await Assert.ThrowsAsync<PostgresException>(async () =>
        {
            await db.Database.ExecuteSqlAsync(
                $"""UPDATE "OrderRequests" SET "RequestPeriod" = DATE '2026-07-15' WHERE "Id" = {world.RequestId}""");
        });

        Assert.Equal("CK_OrderRequests_RequestPeriodIsMonthStart", failure.ConstraintName);
    }

    [PostgresFact]
    public async Task One_version_per_location_and_month()
    {
        await using var db = database.CreateContext();
        var world = await SyntheticRequestAsync(db);
        var location = await db.Locations.SingleAsync(item => item.Id == world.LocationId);

        var duplicate = new OrderRequest(location, world.Period);
        duplicate.AddItem(await db.ProductVariants.FirstAsync(), 1m, 1m);
        db.OrderRequests.Add(duplicate);

        var failure = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Contains("IX_OrderRequests_LocationId_RequestPeriod_Version", failure.InnerException?.Message ?? failure.Message);
    }

    [PostgresFact]
    public async Task A_unique_index_still_lets_several_rows_have_no_value()
    {
        // The model leans on this: two products may both have no model code, and PostgreSQL — like SQL Server
        // here — must not read two nulls as the same value.
        await using var db = database.CreateContext();
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Boş model {Guid.NewGuid():N}"[..24]);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var unit = await db.UnitsOfMeasure.FirstAsync(item => item.Code == "PCS");
        product.AddVariant("10", unit, null, unit);
        product.AddVariant("20", unit, null, unit);

        await db.SaveChangesAsync();

        Assert.Equal(2, await db.ProductVariants.CountAsync(variant => variant.ProductId == product.Id));
    }

    [PostgresFact]
    public async Task Money_keeps_its_scale_across_the_provider()
    {
        await using var db = database.CreateContext();
        var world = await SyntheticRequestAsync(db);

        await db.Database.ExecuteSqlAsync(
            $"""UPDATE "OrderRequestItems" SET "UnitPrice" = 1.2345, "Quantity" = 3.001 WHERE "Id" = {world.LineId}""");

        await using var check = database.CreateContext();
        var line = await check.OrderRequestItems.SingleAsync(item => item.Id == world.LineId);

        Assert.Equal(1.2345m, line.UnitPrice);
        Assert.Equal(3.001m, line.Quantity);
        Assert.Equal(3.7047345m, line.LineTotal);
    }

    [PostgresFact]
    public async Task Timestamps_come_back_as_the_utc_instants_they_went_in_as()
    {
        await using var db = database.CreateContext();
        var world = await SyntheticRequestAsync(db);

        var stored = await db.OrderRequests.AsNoTracking().SingleAsync(request => request.Id == world.RequestId);

        Assert.Equal(DateTimeKind.Utc, stored.CreatedAtUtc.Kind);
        Assert.Equal(DateTimeKind.Utc, stored.UpdatedAtUtc.Kind);
        Assert.True((DateTime.UtcNow - stored.CreatedAtUtc).Duration() < TimeSpan.FromMinutes(5));
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private sealed record World(long V1, long V2, long LineId, TestCurrentUser Coordinator, TestCurrentUser Manager);

    private sealed record Synthetic(long RequestId, long LineId, int LocationId, DateOnly Period);

    private async Task<World> ReturnedAsync(bool correct = true)
    {
        await using var db = database.CreateContext();
        var synthetic = await SyntheticRequestAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");
        var manager = await TestCurrentUser.ManagerAsync(db, "Sınaq rəhbəri");

        await WorkflowOf(coordinator, service => service.SubmitAsync(synthetic.RequestId, new SubmitForApprovalCommand(), None));
        await WorkflowOf(manager, service => service.ReturnAsync(synthetic.RequestId, new ReturnForCorrectionCommand("Yoxlanmalıdır"), None));

        if (!correct)
        {
            return new World(synthetic.RequestId, 0, 0, coordinator, manager);
        }

        var revision = await RevisionOf(coordinator, service => service.CreateAsync(synthetic.RequestId, None));

        await using var check = database.CreateContext();
        var line = await check.OrderRequestItems
            .Where(item => item.OrderRequestId == revision.OrderRequestId)
            .Select(item => item.Id)
            .FirstAsync();

        return new World(synthetic.RequestId, revision.OrderRequestId, line, coordinator, manager);
    }

    private async Task<bool> Attempt(World world, string token, decimal quantity)
    {
        try
        {
            await RevisionOf(world.Coordinator, service =>
                service.EditItemAsync(world.V2, world.LineId, new EditOrderItemCommand(token, Quantity: new(quantity)), None));
            return true;
        }
        catch (ConflictException)
        {
            return false;
        }
    }

    private Task EditAsync(World world, decimal quantity) =>
        RevisionOf(world.Coordinator, async service =>
        {
            var current = (await service.GetAsync(world.V2, None))!;
            return await service.EditItemAsync(
                world.V2, world.LineId, new EditOrderItemCommand(current.RowVersion, Quantity: new(quantity)), None);
        });

    private async Task<T> RevisionOf<T>(ICurrentUserContext user, Func<OrderRevisionService, Task<T>> work)
    {
        await using var db = database.CreateContext();
        return await work(new OrderRevisionService(
            db, user, new PostgresOrderRequestLock(db), NullLogger<OrderRevisionService>.Instance));
    }

    private async Task<T> WorkflowOf<T>(ICurrentUserContext user, Func<OrderWorkflowService, Task<T>> work)
    {
        await using var db = database.CreateContext();
        return await work(new OrderWorkflowService(db, user, new PostgresOrderRequestLock(db)));
    }

    /// <summary>One location, one product, one priced line: enough to exercise a rule without an import.</summary>
    private static async Task<Synthetic> SyntheticRequestAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..6];
        var location = new Location(await new PostgresLocationCodeGenerator(db).NextAsync(None), $"PG obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"PG malı {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var period = new DateOnly(2026, 7, 1);
        var request = new OrderRequest(location, period);
        var line = request.AddItem(variant, 10m, 2m);
        db.OrderRequests.Add(request);
        await db.SaveChangesAsync();

        return new Synthetic(request.Id, line.Id, location.Id, period);
    }
}
