using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Confirmation;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The step that turns reviewed staging rows into permanent orders. Every fixture is synthetic: no company
/// workbook is read, and each test uses its own product and location names so nothing leaks between them.
/// </summary>
[Collection(SqlServerCollection.Name)]
public sealed class ImportConfirmationTests(SqlServerDatabaseFixture database)
{
    [SqlServerFact]
    public async Task The_preview_writes_nothing()
    {
        await using var db = database.CreateContext();
        var fixture = await ReadyAsync(db, Line());

        var before = await CountsAsync(db);
        var preview = await ConfirmationPlanner(db).PreviewAsync(fixture.BatchId, CancellationToken.None);

        Assert.NotNull(preview);
        Assert.True(preview!.CanConfirm);
        Assert.Equal(ImportStatus.ReadyToImport, preview.BatchStatus);

        await using var check = database.CreateContext();
        Assert.Equal(before, await CountsAsync(check));
        Assert.Equal(ImportStatus.ReadyToImport, (await check.ImportBatches.SingleAsync(b => b.Id == fixture.BatchId)).Status);
    }

    [SqlServerFact]
    public async Task One_location_and_period_becomes_one_request_with_one_item_per_row()
    {
        await using var db = database.CreateContext();
        var fixture = await ReadyAsync(db, Line(), Line(), Line());

        var result = await ConfirmationService(db).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None);

        Assert.Equal((1, 3), (result.CreatedRequests, result.CreatedItems));

        await using var check = database.CreateContext();
        var request = Assert.Single(await RequestsAsync(check, fixture));
        Assert.Equal((OrderRequest.InitialVersion, OrderRequestStatus.Draft, 3), (request.Version, request.Status, request.Items.Count));
        Assert.Equal(fixture.BatchId, request.SourceImportBatchId);

        // The workbook states a month, not a day: nothing invents a request date.
        Assert.Null(request.RequestDate);
        Assert.Null(request.ResponsiblePersonId);
    }

    [SqlServerFact]
    public async Task Two_periods_and_two_locations_become_four_requests()
    {
        await using var db = database.CreateContext();
        var second = $"Obyekt {Unique()}";
        var fixture = await ReadyAsync(
            db,
            Line(date: new DateTime(2026, 5, 1)),
            Line(date: new DateTime(2026, 6, 1)),
            Line(date: new DateTime(2026, 5, 1), location: second),
            Line(date: new DateTime(2026, 6, 1), location: second));

        var result = await ConfirmationService(db).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None);

        Assert.Equal((4, 4), (result.CreatedRequests, result.CreatedItems));

        await using var check = database.CreateContext();
        var requests = await RequestsAsync(check, fixture);
        Assert.Equal(4, requests.Count);
        Assert.All(requests, request => Assert.Single(request.Items));
    }

    [SqlServerFact]
    public async Task An_excluded_row_becomes_no_item()
    {
        await using var db = database.CreateContext();
        var fixture = await ReadyAsync(db, Line(), Line());
        var rows = await StagedRowsAsync(db, fixture.BatchId);
        await CorrectionService(db).ExcludeAsync(
            new ExcludeRowCommand(fixture.BatchId, rows[1].Id, "Excel yekun cəm sətri — sifariş sətri deyil"), CancellationToken.None);

        var result = await ConfirmationService(db).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None);

        Assert.Equal(1, result.CreatedItems);

        await using var check = database.CreateContext();
        Assert.Empty(await check.ImportRowMaterializations.Where(item => item.ImportRowId == rows[1].Id).ToListAsync());

        // The row itself stays staged, with its exclusion reason, as the audit trail of what was left out.
        var excluded = await check.ImportRows.SingleAsync(row => row.Id == rows[1].Id);
        Assert.True(excluded.IsExcluded);
    }

    [SqlServerFact]
    public async Task Rows_that_look_identical_become_two_items()
    {
        await using var db = database.CreateContext();
        var fixture = await ReadyAsync(db, Line(), Line());

        await using var staged = database.CreateContext();
        var duplicates = await staged.ImportRows
            .Include(row => row.Issues)
            .Where(row => row.ImportBatchId == fixture.BatchId)
            .ToListAsync();
        Assert.All(duplicates, row => Assert.Contains(row.Issues, issue => issue.IssueType == ImportIssueType.DuplicateRow));

        var result = await ConfirmationService(db).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None);

        // Two identical lines are two lines. Nothing is merged, summed or suppressed.
        Assert.Equal(2, result.CreatedItems);
        Assert.Equal(2, result.PossibleDuplicateItems);

        await using var check = database.CreateContext();
        var request = Assert.Single(await RequestsAsync(check, fixture));
        Assert.Equal(2, request.Items.Count);
    }

    [SqlServerFact]
    public async Task An_unknown_price_stays_unknown_and_an_unresolved_supplier_stays_empty()
    {
        await using var db = database.CreateContext();
        // A supplier no decision points at, so it stays unresolved however the rest of the suite is ordered.
        var fixture = await ReadyAsync(db, Line(price: null), Line(price: 2.5, supplier: $"Bilinməyən {Unique()}"));

        var result = await ConfirmationService(db).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None);

        Assert.Equal(1, result.MissingPriceItems);
        Assert.Equal(2, result.MissingSupplierItems);

        await using var check = database.CreateContext();
        var request = Assert.Single(await RequestsAsync(check, fixture));
        var items = request.Items.OrderBy(item => item.UnitPrice ?? -1).ToList();

        // Never zero: an unknown price is unknown, and quantity is imported all the same.
        Assert.Null(items[0].UnitPrice);
        Assert.Equal(10m, items[0].Quantity);
        Assert.Equal(2.5m, items[1].UnitPrice);
        Assert.All(items, item => Assert.Null(item.SupplierId));
    }

    [SqlServerFact]
    public async Task A_resolved_supplier_is_copied_onto_the_item()
    {
        await using var db = database.CreateContext();
        var supplier = $"Cleanfix {Unique()}";
        var fixture = await ReadyAsync(db, Line(supplier: supplier));
        var created = await ResolutionService(db).CreateSupplierAsync(
            new CreateSupplierCommand(fixture.BatchId, TextNormalizer.Normalize(supplier), supplier, null, ResolutionScope.BatchOnly),
            CancellationToken.None);

        var result = await ConfirmationService(db).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None);

        Assert.Equal(0, result.MissingSupplierItems);

        await using var check = database.CreateContext();
        var request = Assert.Single(await RequestsAsync(check, fixture));
        Assert.Equal<long?>(created.TargetId, Assert.Single(request.Items).SupplierId);
    }

    [SqlServerFact]
    public async Task Every_item_points_back_at_the_row_it_came_from()
    {
        await using var db = database.CreateContext();
        var fixture = await ReadyAsync(db, Line(quantity: 3), Line(quantity: 7));
        var rows = await StagedRowsAsync(db, fixture.BatchId);

        await ConfirmationService(db).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None);

        await using var check = database.CreateContext();
        var links = await check.ImportRowMaterializations
            .Include(link => link.OrderRequestItem)
            .Where(link => rows.Select(row => row.Id).Contains(link.ImportRowId))
            .ToListAsync();

        Assert.Equal(2, links.Count);
        foreach (var row in rows)
        {
            var link = Assert.Single(links, item => item.ImportRowId == row.Id);
            Assert.Equal(row.ParsedQuantity, link.OrderRequestItem.Quantity);
        }
    }

    [SqlServerFact]
    public async Task The_batch_becomes_imported_and_stops_accepting_review_decisions()
    {
        await using var db = database.CreateContext();
        var fixture = await ReadyAsync(db, Line());

        var result = await ConfirmationService(db).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None);

        Assert.Equal(ImportStatus.Imported, result.BatchStatus);

        await using var check = database.CreateContext();
        Assert.Equal(ImportStatus.Imported, (await check.ImportBatches.SingleAsync(b => b.Id == fixture.BatchId)).Status);

        var rows = await StagedRowsAsync(check, fixture.BatchId);
        await Assert.ThrowsAsync<DomainException>(() => CorrectionService(check).ExcludeAsync(
            new ExcludeRowCommand(fixture.BatchId, rows[0].Id, "gec qaldı"), CancellationToken.None));
    }

    [SqlServerFact]
    public async Task A_batch_that_is_not_ready_cannot_be_confirmed()
    {
        await using var db = database.CreateContext();
        // No product decision, so the batch stays in review.
        var batchId = await StageAsync(db, Line());

        await Assert.ThrowsAsync<ConflictException>(() =>
            ConfirmationService(db).ConfirmAsync(batchId, Confirm(), CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Empty(await check.OrderRequests.Where(request => request.SourceImportBatchId == batchId).ToListAsync());
    }

    [SqlServerFact]
    public async Task Confirming_twice_creates_nothing_the_second_time()
    {
        await using var db = database.CreateContext();
        var fixture = await ReadyAsync(db, Line(), Line());

        var first = await ConfirmationService(db).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None);
        var second = await ConfirmationService(db).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None);

        Assert.False(first.AlreadyImported);
        Assert.True(second.AlreadyImported);
        Assert.Equal((first.CreatedRequests, first.CreatedItems), (second.CreatedRequests, second.CreatedItems));

        await using var check = database.CreateContext();
        Assert.Single(await RequestsAsync(check, fixture));
        Assert.Single(await check.ImportMaterializations.Where(item => item.ImportBatchId == fixture.BatchId).ToListAsync());
    }

    [SqlServerFact]
    public async Task An_existing_request_is_never_touched_without_a_decision()
    {
        await using var db = database.CreateContext();
        var fixture = await ReadyAsync(db, Line());
        await SubmittedRequestAsync(db, fixture);

        var preview = await ConfirmationPlanner(db).PreviewAsync(fixture.BatchId, CancellationToken.None);
        var group = Assert.Single(preview!.Groups);

        Assert.True(group.ExistingRequest);
        Assert.Equal(GroupConflictState.ExistingRequest, group.ConflictState);
        Assert.Equal(GroupDecisionAction.CreateNewVersion, group.RequiredDecision);
        Assert.Null(group.ProposedVersion);
        Assert.False(preview.CanConfirm);

        await Assert.ThrowsAsync<ConflictException>(() =>
            ConfirmationService(db).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Single(await check.OrderRequests.Where(request => request.LocationId == fixture.LocationId).ToListAsync());
        Assert.Equal(ImportStatus.ReadyToImport, (await check.ImportBatches.SingleAsync(b => b.Id == fixture.BatchId)).Status);
    }

    [SqlServerFact]
    public async Task A_new_version_leaves_the_earlier_one_untouched()
    {
        await using var db = database.CreateContext();
        var fixture = await ReadyAsync(db, Line());
        var existing = await SubmittedRequestAsync(db, fixture);

        var result = await ConfirmationService(db).ConfirmAsync(
            fixture.BatchId,
            Confirm(new ConfirmationGroupDecision(fixture.LocationId, fixture.Period, GroupDecisionAction.CreateNewVersion)),
            CancellationToken.None);

        Assert.Equal(1, result.CreatedRequests);

        await using var check = database.CreateContext();
        var requests = await check.OrderRequests
            .Include(request => request.Items)
            .Where(request => request.LocationId == fixture.LocationId && request.RequestPeriod == fixture.Period)
            .OrderBy(request => request.Version)
            .ToListAsync();

        Assert.Equal(2, requests.Count);
        // Version 1 keeps its own status and its own single item; the import added nothing to it.
        Assert.Equal((1, OrderRequestStatus.PendingApproval, 1), (requests[0].Version, requests[0].Status, requests[0].Items.Count));
        Assert.Equal((2, OrderRequestStatus.Draft, 1), (requests[1].Version, requests[1].Status, requests[1].Items.Count));
        Assert.Equal(existing.Id, requests[0].Id);
    }

    [SqlServerFact]
    public async Task A_skipped_group_creates_nothing_and_says_why()
    {
        await using var db = database.CreateContext();
        var second = $"Obyekt {Unique()}";
        var fixture = await ReadyAsync(db, Line(), Line(location: second));

        var result = await ConfirmationService(db).ConfirmAsync(
            fixture.BatchId,
            Confirm(new ConfirmationGroupDecision(fixture.LocationId, fixture.Period, GroupDecisionAction.Skip, "bu obyekt ayrıca göndəriləcək")),
            CancellationToken.None);

        Assert.Equal((1, 1, 1, 1), (result.CreatedRequests, result.CreatedItems, result.SkippedGroups, result.SkippedRows));

        await using var check = database.CreateContext();
        Assert.Empty(await check.OrderRequests
            .Where(request => request.LocationId == fixture.LocationId && request.SourceImportBatchId == fixture.BatchId)
            .ToListAsync());

        var skipped = Assert.Single(await check.ImportMaterializationGroups
            .Where(group => group.Action == MaterializationAction.Skipped && group.LocationId == fixture.LocationId)
            .ToListAsync());
        Assert.Equal("bu obyekt ayrıca göndəriləcək", skipped.SkipReason);
    }

    [SqlServerFact]
    public async Task Skipping_without_a_reason_is_refused()
    {
        await using var db = database.CreateContext();
        var fixture = await ReadyAsync(db, Line());

        await Assert.ThrowsAsync<ValidationException>(() => ConfirmationService(db).ConfirmAsync(
            fixture.BatchId,
            Confirm(new ConfirmationGroupDecision(fixture.LocationId, fixture.Period, GroupDecisionAction.Skip, "   ")),
            CancellationToken.None));
    }

    [SqlServerFact]
    public async Task A_stale_preview_is_refused_instead_of_imported()
    {
        await using var db = database.CreateContext();
        var fixture = await ReadyAsync(db, Line(), Line());

        // The operator read a preview of three rows; the batch holds two.
        var command = new ImportConfirmationCommand([], ExpectedRowsToImport: 3);

        await Assert.ThrowsAsync<ConflictException>(() =>
            ConfirmationService(db).ConfirmAsync(fixture.BatchId, command, CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Empty(await RequestsAsync(check, fixture));
        Assert.Equal(ImportStatus.ReadyToImport, (await check.ImportBatches.SingleAsync(b => b.Id == fixture.BatchId)).Status);
    }

    [SqlServerFact]
    public async Task A_failure_part_way_through_leaves_no_company_data_behind()
    {
        await using var db = database.CreateContext();
        var second = $"Obyekt {Unique()}";
        var fixture = await ReadyAsync(db, Line(), Line(location: second));

        var before = await CountsAsync(db);

        // The second group names a location that no longer exists by the time the plan is rebuilt.
        await using (var meddler = database.CreateContext())
        {
            var location = await meddler.Locations.SingleAsync(item => item.Name == second);
            location.Deactivate();
            await meddler.SaveChangesAsync();
        }

        // A fresh context, as a real request would have, so it reads the location as it now is.
        await using var confirming = database.CreateContext();
        await Assert.ThrowsAnyAsync<Exception>(() =>
            ConfirmationService(confirming).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Equal(before, await CountsAsync(check));
        Assert.Equal(ImportStatus.ReadyToImport, (await check.ImportBatches.SingleAsync(b => b.Id == fixture.BatchId)).Status);
    }

    [SqlServerFact]
    public async Task The_permanent_amount_equals_the_staged_amount()
    {
        await using var db = database.CreateContext();
        var fixture = await ReadyAsync(db, Line(quantity: 3, price: 4.25), Line(quantity: 1.5, price: 10.1), Line(price: null));

        var result = await ConfirmationService(db).ConfirmAsync(fixture.BatchId, Confirm(), CancellationToken.None);

        await using var check = database.CreateContext();
        var staged = await check.ImportRows
            .Where(row => row.ImportBatchId == fixture.BatchId && !row.IsExcluded && row.ParsedUnitPrice != null)
            .Select(row => row.ParsedQuantity!.Value * row.ParsedUnitPrice!.Value)
            .ToListAsync();

        var permanent = await check.OrderRequestItems
            .Where(item => item.OrderRequest.SourceImportBatchId == fixture.BatchId && item.UnitPrice != null)
            .Select(item => item.Quantity * item.UnitPrice!.Value)
            .ToListAsync();

        Assert.Equal(staged.Sum(), permanent.Sum());
        Assert.Equal(staged.Sum(), result.KnownAmountTotal);
        Assert.Equal(1, result.MissingPriceItems);
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private sealed record Fixture(long BatchId, int LocationId, DateOnly Period, string Product);

    /// <param name="location">Null means the test's own location, so no two tests share a request group.</param>
    private static OrderLine Line(
        double? quantity = 10, double? price = 2, string? supplier = null, string? location = null, DateTime? date = null) =>
        new(Product: null, Quantity: quantity, Price: price, Supplier: supplier, Location: location, Date: date);

    /// <summary>
    /// Stages the lines and takes the batch to ReadyToImport through the normal review services. Each test gets
    /// its own product and its own location, so one test's permanent orders never become another's "existing
    /// request".
    /// </summary>
    private async Task<Fixture> ReadyAsync(BaxOrdersDbContext db, params OrderLine[] lines)
    {
        var product = $"Test malı {Unique()}";
        var home = $"Obyekt {Unique()}";
        lines = [.. lines.Select(line => line with { Product = product, Location = line.Location ?? home })];

        var batchId = await StageAsync(db, lines);
        var service = ResolutionService(db);

        foreach (var name in lines.Select(line => line.Location!).Distinct())
        {
            await service.CreateLocationAsync(
                new CreateLocationCommand(batchId, TextNormalizer.Normalize(name), name, ResolutionScope.BatchOnly), CancellationToken.None);
        }

        await service.CreateProductAsync(
            new CreateProductCommand(batchId, TextNormalizer.Normalize(product), product, null, ResolutionScope.BatchOnly),
            CancellationToken.None);

        foreach (var key in await VariantKeysAsync(db, batchId))
        {
            await service.CreateProductVariantAsync(new CreateProductVariantCommand(batchId, key), CancellationToken.None);
        }

        var batch = await db.ImportBatches.AsNoTracking().SingleAsync(item => item.Id == batchId);
        Assert.Equal(ImportStatus.ReadyToImport, batch.Status);

        var sample = await db.ImportRows.AsNoTracking()
            .FirstAsync(row => row.ImportBatchId == batchId && !row.IsExcluded && row.OriginalLocationName == home);
        return new Fixture(batchId, sample.MatchedLocationId!.Value, sample.ParsedRequestPeriod!.Value, product);
    }

    private static async Task<List<string>> VariantKeysAsync(BaxOrdersDbContext db, long batchId) =>
        await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId && !row.IsExcluded && row.VariantSourceKey != null && row.MatchedProductVariantId == null)
            .Select(row => row.VariantSourceKey!)
            .Distinct()
            .ToListAsync();

    /// <summary>An existing, already submitted request for the fixture's group, so a new version is possible.</summary>
    private static async Task<OrderRequest> SubmittedRequestAsync(BaxOrdersDbContext db, Fixture fixture)
    {
        var location = await db.Locations.SingleAsync(item => item.Id == fixture.LocationId);
        var variant = await db.ProductVariants.FirstAsync(item => item.Product.Name == fixture.Product);

        var request = new OrderRequest(location, fixture.Period);
        request.AddItem(variant, 1m, 1m);
        request.Submit(DateTime.UtcNow);
        db.OrderRequests.Add(request);
        await db.SaveChangesAsync();
        return request;
    }

    private static ImportConfirmationCommand Confirm(params ConfirmationGroupDecision[] decisions) => new(decisions);

    private static Task<List<OrderRequest>> RequestsAsync(BaxOrdersDbContext db, Fixture fixture) =>
        db.OrderRequests.Include(request => request.Items)
            .Where(request => request.SourceImportBatchId == fixture.BatchId)
            .ToListAsync();

    private static Task<List<ImportRow>> StagedRowsAsync(BaxOrdersDbContext db, long batchId) =>
        db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId)
            .OrderBy(row => row.RowNumber)
            .ToListAsync();

    private static async Task<(int Requests, int Items, int Links)> CountsAsync(BaxOrdersDbContext db) =>
        (await db.OrderRequests.CountAsync(),
            await db.OrderRequestItems.CountAsync(),
            await db.ImportRowMaterializations.CountAsync());

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];
}
