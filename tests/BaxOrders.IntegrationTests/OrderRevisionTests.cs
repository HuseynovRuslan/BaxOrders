using System.Text.Json;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Common;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Orders.Revisions;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Identity;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Correcting a returned order against a real SQL Server: what a correction copies, what it leaves alone, what
/// the database refuses, and what analytics makes of it.
/// </summary>
/// <remarks>
/// Every request here is synthetic and came through a real import, so its lines carry real workbook rows —
/// which is what a copied line has to lead back to. Each operation runs in a context of its own, the way each
/// web request does. No company request is corrected, edited or moved by a test.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class OrderRevisionTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    /// <summary>A priced line, an unpriced one, and another priced one.</summary>
    private static readonly OrderLine[] ThreeLines =
    [
        new(Quantity: 10, Price: 2),
        new(Quantity: 5, Price: null),
        new(Quantity: 3, Price: 4.5),
    ];

    // ---- making the correction -----------------------------------------------------------------------

    [PostgresFact]
    public async Task A_returned_request_is_corrected_as_the_next_version_with_every_line_copied_exactly()
    {
        var world = await ReturnedAsync();

        var result = await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None));

        Assert.False(result.AlreadyExisted);
        Assert.Equal((2, 3, world.V1, 1), (result.Version, result.ItemCount, result.SourceOrderRequestId, result.SourceVersion));

        await using var db = database.CreateContext();
        var v1 = await RequestAsync(db, world.V1);
        var v2 = await RequestAsync(db, result.OrderRequestId);

        Assert.Equal(OrderRequestStatus.Draft, v2.Status);
        Assert.Equal((v1.LocationId, v1.RequestPeriod, v1.RequestDate), (v2.LocationId, v2.RequestPeriod, v2.RequestDate));
        Assert.Null(v2.RequestDate);
        Assert.Null(v2.SubmittedByUserId);
        Assert.Null(v2.SourceImportBatchId);

        var originals = v1.Items.OrderBy(item => item.Id).ToList();
        var copies = v2.Items.OrderBy(item => item.SourceOrderRequestItemId).ToList();

        // The same business values, line for line, under new identities that lead back to the originals.
        Assert.Equal(originals.Select(Business), copies.Select(Business));
        Assert.Equal(originals.Select(item => (long?)item.Id), copies.Select(item => item.SourceOrderRequestItemId));
        Assert.Empty(copies.Select(item => item.Id).Intersect(originals.Select(item => item.Id)));

        var link = await db.OrderRequestRevisions.SingleAsync(revision => revision.SourceOrderRequestId == world.V1);
        Assert.Equal(v2.Id, link.RevisionOrderRequestId);
        Assert.Equal(world.Coordinator.UserId, link.CreatedByUserId);
        Assert.Equal("Sınaq koordinatoru", link.CreatedByDisplayName);

        var created = await db.OrderRequestEditEvents.SingleAsync(entry => entry.OrderRequestId == v2.Id);
        Assert.Equal(OrderEditAction.RevisionCreated, created.Action);
        Assert.Equal(world.Coordinator.UserId, created.ActorUserId);
    }

    [PostgresFact]
    public async Task The_returned_version_is_left_exactly_as_it_was()
    {
        var world = await ReturnedAsync();
        var before = await SnapshotAsync(world.V1);

        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;
        await EditScenarioAsync(world, v2);

        // Down to the row version: not one byte of the reviewed version was written.
        Assert.Equal(before, await SnapshotAsync(world.V1));
    }

    [PostgresFact]
    public async Task No_workbook_row_is_materialized_twice()
    {
        var world = await ReturnedAsync();
        await using var db = database.CreateContext();
        var linksBefore = await db.ImportRowMaterializations.CountAsync();

        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;

        Assert.Equal(linksBefore, await db.ImportRowMaterializations.CountAsync());
        Assert.False(await db.ImportRowMaterializations.AnyAsync(link => link.OrderRequestItem.OrderRequestId == v2));
    }

    [PostgresFact]
    public async Task A_draft_a_waiting_or_an_approved_request_is_not_corrected()
    {
        var draft = await ImportAsync();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var waiting = await ImportAsync();
        await WorkflowAs(coordinator, service => service.SubmitAsync(waiting, new SubmitForApprovalCommand(), None));

        var approved = await ImportAsync();
        await WorkflowAs(coordinator, service => service.SubmitAsync(approved, new SubmitForApprovalCommand(), None));
        await WorkflowAs(manager, service => service.ApproveAsync(approved, new ApproveOrderCommand(AcknowledgeMissingPrices: true), None));

        foreach (var request in new[] { draft, waiting, approved })
        {
            await Assert.ThrowsAsync<DomainException>(() => RevisingAs(coordinator, service => service.CreateAsync(request, None)));
        }

        await using var db = database.CreateContext();
        Assert.False(await db.OrderRequestRevisions.AnyAsync(revision =>
            revision.SourceOrderRequestId == draft || revision.SourceOrderRequestId == waiting || revision.SourceOrderRequestId == approved));
    }

    [PostgresFact]
    public async Task Asking_again_gets_the_same_correction_rather_than_another()
    {
        var world = await ReturnedAsync();

        var first = await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None));
        var again = await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None));

        Assert.True(again.AlreadyExisted);
        Assert.Equal(first.OrderRequestId, again.OrderRequestId);
        await AssertVersionsAsync(world, 1, 2);
    }

    [PostgresFact]
    public async Task Several_people_correcting_at_once_make_one_correction()
    {
        var world = await ReturnedAsync();
        var admin = await UserAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");

        var attempts = await Task.WhenAll(
            RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None)),
            RevisingAs(admin, service => service.CreateAsync(world.V1, None)),
            RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None)),
            RevisingAs(admin, service => service.CreateAsync(world.V1, None)));

        Assert.Single(attempts.Select(attempt => attempt.OrderRequestId).Distinct());
        Assert.Equal(1, attempts.Count(attempt => !attempt.AlreadyExisted));
        await AssertVersionsAsync(world, 1, 2);

        await using var db = database.CreateContext();
        Assert.Equal(1, await db.OrderRequestRevisions.CountAsync(revision => revision.SourceOrderRequestId == world.V1));
    }

    [PostgresFact]
    public async Task A_version_something_newer_has_overtaken_is_not_the_one_to_correct()
    {
        var world = await ReturnedAsync();

        // A newer version made another way — as a second import would make one.
        await using (var db = database.CreateContext())
        {
            var v1 = await db.OrderRequests.Include(request => request.Location).Include(request => request.Items)
                .SingleAsync(request => request.Id == world.V1);
            var newer = v1.CreateNextVersion();
            var variant = await db.ProductVariants.SingleAsync(item => item.Id == v1.Items.First().ProductVariantId);
            newer.AddItem(variant, 1m, 1m);
            db.OrderRequests.Add(newer);
            await db.SaveChangesAsync();
        }

        await Assert.ThrowsAsync<ConflictException>(() => RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None)));
    }

    [PostgresFact]
    public async Task A_manager_or_nobody_cannot_correct_an_order()
    {
        var world = await ReturnedAsync();

        await Assert.ThrowsAsync<ForbiddenException>(() => RevisingAs(world.Manager, service => service.CreateAsync(world.V1, None)));
        await Assert.ThrowsAsync<ForbiddenException>(() =>
            RevisingAs(TestCurrentUser.Anonymous(), service => service.CreateAsync(world.V1, None)));
    }

    // ---- editing the correction ----------------------------------------------------------------------

    [PostgresFact]
    public async Task Every_kind_of_edit_changes_the_correction_and_is_recorded()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;

        var scenario = await EditScenarioAsync(world, v2);

        await using var db = database.CreateContext();
        var lines = await db.OrderRequestItems.AsNoTracking().Where(item => item.OrderRequestId == v2).ToListAsync();

        Assert.Equal(3, lines.Count);
        Assert.DoesNotContain(lines, item => item.Id == scenario.RemovedItemId);
        Assert.Equal(12.5m, lines.Single(item => item.Id == scenario.QuantityItemId).Quantity);
        var priced = lines.Single(item => item.Id == scenario.PricedItemId);
        Assert.Equal((3.2m, scenario.SupplierId), (priced.UnitPrice, priced.SupplierId));
        var added = lines.Single(item => item.Id == scenario.AddedItemId);
        Assert.Equal((scenario.AddedVariantId, 4m, (decimal?)null, (long?)null),
            (added.ProductVariantId, added.Quantity, added.UnitPrice, added.SourceOrderRequestItemId));

        var history = await db.OrderRequestEditEvents.AsNoTracking()
            .Where(entry => entry.OrderRequestId == v2).OrderBy(entry => entry.Id).ToListAsync();

        Assert.Equal(
            [OrderEditAction.RevisionCreated, OrderEditAction.ItemQuantityChanged, OrderEditAction.ItemPriceChanged,
             OrderEditAction.ItemSupplierChanged, OrderEditAction.ItemAdded, OrderEditAction.ItemRemoved],
            history.Select(entry => entry.Action));
        Assert.All(history, entry => Assert.Equal(world.Coordinator.UserId, entry.ActorUserId));

        var quantity = history.Single(entry => entry.Action == OrderEditAction.ItemQuantityChanged);
        Assert.Equal(("10", "12.5", scenario.QuantityItemId), (quantity.OldValue, quantity.NewValue, quantity.OrderRequestItemId));

        var price = history.Single(entry => entry.Action == OrderEditAction.ItemPriceChanged);
        Assert.Equal(((string?)null, "3.2"), (price.OldValue, price.NewValue));

        var supplier = history.Single(entry => entry.Action == OrderEditAction.ItemSupplierChanged);
        Assert.Null(supplier.OldValue);
        Assert.Equal($$"""{"id":{{scenario.SupplierId}},"name":"{{scenario.SupplierName}}"}""", supplier.NewValue);

        var addedEntry = history.Single(entry => entry.Action == OrderEditAction.ItemAdded);
        Assert.Equal(scenario.AddedItemId, addedEntry.OrderRequestItemId);

        // The removed line is gone from the draft, and its history says exactly what it was.
        var removed = history.Single(entry => entry.Action == OrderEditAction.ItemRemoved);
        Assert.Equal(scenario.RemovedItemId, removed.OrderRequestItemId);
        using var what = JsonDocument.Parse(removed.OldValue!);
        Assert.Equal(3m, what.RootElement.GetProperty("quantity").GetDecimal());
        Assert.Equal(4.5m, what.RootElement.GetProperty("unitPrice").GetDecimal());
    }

    [PostgresFact]
    public async Task The_money_and_the_missing_prices_are_those_of_the_correction()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;

        var before = (await RevisingAs(world.Coordinator, service => service.GetAsync(v2, None)))!;
        Assert.Equal((1, 33.5m, false), (before.MissingPriceItemCount, before.KnownAmountTotal, before.AmountIsComplete));

        await EditScenarioAsync(world, v2);

        // 12.5 × 2 + 5 × 3.2 + the added line, which has no price.
        var after = (await RevisingAs(world.Coordinator, service => service.GetAsync(v2, None)))!;
        Assert.Equal((1, 41m, 3), (after.MissingPriceItemCount, after.KnownAmountTotal, after.ItemCount));

        var reviewed = (await RevisingAs(world.Coordinator, service => service.GetAsync(world.V1, None)))!;
        Assert.Equal((1, 33.5m, 3), (reviewed.MissingPriceItemCount, reviewed.KnownAmountTotal, reviewed.ItemCount));
    }

    [PostgresFact]
    public async Task A_price_or_a_supplier_can_be_cleared_back_to_nothing()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;
        var supplier = await SupplierAsync();
        var line = await LineAsync(v2, quantity: 10m);

        await EditAsync(world.Coordinator, v2, line, new(null, UnitPrice: new(null), SupplierId: new(supplier.Id)));
        await EditAsync(world.Coordinator, v2, line, new(null, SupplierId: new(null)));

        await using var db = database.CreateContext();
        var stored = await db.OrderRequestItems.AsNoTracking().SingleAsync(item => item.Id == line);
        Assert.Equal(((decimal?)null, (int?)null), (stored.UnitPrice, stored.SupplierId));

        var history = await db.OrderRequestEditEvents.AsNoTracking()
            .Where(entry => entry.OrderRequestItemId == line).OrderBy(entry => entry.Id).ToListAsync();
        Assert.Equal(("2", (string?)null), (history[0].OldValue, history[0].NewValue));
        Assert.Null(history[^1].NewValue);
    }

    [PostgresFact]
    public async Task An_edit_made_from_a_stale_copy_is_refused_and_overwrites_nothing()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;
        var line = await LineAsync(v2, quantity: 10m);
        var token = (await RevisingAs(world.Coordinator, service => service.GetAsync(v2, None)))!.RowVersion;

        await RevisingAs(world.Coordinator, service =>
            service.EditItemAsync(v2, line, new EditOrderItemCommand(token, Quantity: new(11m)), None));

        // Somebody else opened it at the same time, and saves second.
        await Assert.ThrowsAsync<ConflictException>(() => RevisingAs(world.Coordinator, service =>
            service.EditItemAsync(v2, line, new EditOrderItemCommand(token, Quantity: new(99m)), None)));
        await Assert.ThrowsAsync<ConflictException>(() => RevisingAs(world.Coordinator, service =>
            service.RemoveItemAsync(v2, line, token, None)));

        await using var db = database.CreateContext();
        Assert.Equal(11m, (await db.OrderRequestItems.SingleAsync(item => item.Id == line)).Quantity);
    }

    [PostgresFact]
    public async Task Only_a_correction_draft_is_edited()
    {
        var world = await ReturnedAsync();
        var imported = await ImportAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;

        // An imported draft — the kind the company's 167 requests are — and the returned version itself.
        foreach (var request in new[] { imported, world.V1 })
        {
            var line = await LineAsync(request, quantity: 10m);
            await Assert.ThrowsAsync<DomainException>(() => EditAsync(world.Coordinator, request, line, new(null, Quantity: new(11m))));
        }

        // The correction once it has been sent for approval.
        await WorkflowAs(world.Coordinator, service => service.SubmitAsync(v2, new SubmitForApprovalCommand(), None));
        var copied = await LineAsync(v2, quantity: 10m);
        await Assert.ThrowsAsync<DomainException>(() => EditAsync(world.Coordinator, v2, copied, new(null, Quantity: new(11m))));
        await Assert.ThrowsAsync<DomainException>(() => RevisingAs(world.Coordinator, async service =>
            await service.RemoveItemAsync(v2, copied, (await service.GetAsync(v2, None))!.RowVersion, None)));
    }

    [PostgresFact]
    public async Task Bad_input_is_refused_before_anything_is_written()
    {
        var world = await ReturnedAsync();
        var other = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;
        var line = await LineAsync(v2, quantity: 10m);
        var strangerLine = await LineAsync(other.V1, quantity: 10m);
        var before = await SnapshotAsync(v2);

        await Assert.ThrowsAsync<DomainException>(() => EditAsync(world.Coordinator, v2, line, new(null, Quantity: new(0m))));
        await Assert.ThrowsAsync<DomainException>(() => EditAsync(world.Coordinator, v2, line, new(null, Quantity: new(-3m))));
        await Assert.ThrowsAsync<DomainException>(() => EditAsync(world.Coordinator, v2, line, new(null, UnitPrice: new(-1m))));
        await Assert.ThrowsAsync<NotFoundException>(() => EditAsync(world.Coordinator, v2, strangerLine, new(null, Quantity: new(2m))));
        await Assert.ThrowsAsync<ValidationException>(() => EditAsync(world.Coordinator, v2, line, new(null, SupplierId: new(int.MaxValue))));
        await Assert.ThrowsAsync<ValidationException>(() => EditAsync(world.Coordinator, v2, line, new(null)));
        await Assert.ThrowsAsync<ValidationException>(() => RevisingAs(world.Coordinator, service =>
            service.EditItemAsync(v2, line, new EditOrderItemCommand(null, Quantity: new(2m)), None)));
        await Assert.ThrowsAsync<ValidationException>(() => RevisingAs(world.Coordinator, async service =>
            await service.AddItemAsync(v2, new AddOrderItemCommand((await service.GetAsync(v2, None))!.RowVersion, long.MaxValue, 1m), None)));

        Assert.Equal(before, await SnapshotAsync(v2));
    }

    [PostgresFact]
    public async Task A_manager_cannot_edit_a_correction()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;
        var line = await LineAsync(v2, quantity: 10m);

        await Assert.ThrowsAsync<ForbiddenException>(() => EditAsync(world.Manager, v2, line, new(null, Quantity: new(11m))));
    }

    [PostgresFact]
    public async Task The_history_keeps_the_name_a_person_had_when_they_acted()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;
        await EditAsync(world.Coordinator, v2, await LineAsync(v2, quantity: 10m), new(null, Quantity: new(11m)));

        await using (var db = database.CreateContext())
        {
            await db.Set<ApplicationUser>().Where(user => user.Id == world.Coordinator.UserId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(user => user.DisplayName, "Yeni ad"));
        }

        var state = (await RevisingAs(world.Manager, service => service.GetAsync(v2, None)))!;
        Assert.All(state.EditHistory, entry => Assert.Equal("Sınaq koordinatoru", entry.ActorDisplayName));
        Assert.Equal("Sınaq koordinatoru", state.RevisedFrom!.CreatedByDisplayName);
    }

    [PostgresFact]
    public async Task Later_edits_add_to_the_history_and_never_rewrite_it()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;
        var line = await LineAsync(v2, quantity: 10m);

        await EditAsync(world.Coordinator, v2, line, new(null, Quantity: new(11m)));
        var early = await HistoryJsonAsync(v2);

        await EditAsync(world.Coordinator, v2, line, new(null, Quantity: new(12m)));
        await EditAsync(world.Coordinator, v2, line, new(null, UnitPrice: new(9m)));
        var late = await HistoryJsonAsync(v2);

        Assert.Equal(early, late.Take(early.Count));
        Assert.Equal(early.Count + 2, late.Count);
    }

    // ---- provenance ----------------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_copied_line_leads_back_through_every_version_to_its_workbook_row()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;
        var v3 = await CorrectAgainAsync(world, v2);

        var v1Line = await LineAsync(world.V1, quantity: 10m);
        var v2Line = await LineAsync(v2, quantity: 10m);
        var v3Line = await LineAsync(v3, quantity: 10m);

        await using var db = database.CreateContext();
        var queries = new OrderRequestQueries(db, TestCurrentUser.Anonymous());
        var imported = await queries.GetItemProvenanceAsync(v1Line, None);
        var throughV2 = await queries.GetItemProvenanceAsync(v2Line, None);
        var throughV3 = await queries.GetItemProvenanceAsync(v3Line, None);

        Assert.NotNull(imported);
        Assert.Equal(OrderItemOrigin.Imported, throughV3!.Origin);

        // One step per version, newest first, and only the oldest carries the workbook row.
        Assert.Equal([v3Line, v2Line, v1Line], throughV3.Lineage.Select(step => step.OrderRequestItemId));
        Assert.Equal([3, 2, 1], throughV3.Lineage.Select(step => step.Version));
        Assert.Equal([false, false, true], throughV3.Lineage.Select(step => step.IsImported));
        Assert.Equal([v2Line, v1Line], throughV2!.Lineage.Select(step => step.OrderRequestItemId));
        Assert.Equal(v3Line, throughV3.OrderRequestItemId);

        var source = throughV3.Source!;
        Assert.Equal((v1Line, imported!.Source!.ImportRowId, world.Order.ImportBatchId),
            (source.OrderRequestItemId, source.ImportRowId, source.ImportBatchId));
    }

    [PostgresFact]
    public async Task A_line_added_by_hand_has_no_workbook_row_and_none_is_made_up()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;
        var scenario = await EditScenarioAsync(world, v2);

        await using var db = database.CreateContext();
        var provenance = await new OrderRequestQueries(db, TestCurrentUser.Anonymous())
            .GetItemProvenanceAsync(scenario.AddedItemId, None);

        // Said plainly, rather than reported as a line nobody can find.
        Assert.Equal(OrderItemOrigin.ManuallyAdded, provenance!.Origin);
        Assert.Null(provenance.Source);
        Assert.Single(provenance.Lineage);
        Assert.False(provenance.Lineage[0].IsImported);
        Assert.False(await db.ImportRowMaterializations.AnyAsync(link => link.OrderRequestItemId == scenario.AddedItemId));
    }

    // ---- the order as it is read ---------------------------------------------------------------------

    [PostgresFact]
    public async Task The_order_says_which_version_it_corrects_and_which_corrects_it()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;

        await using var db = database.CreateContext();
        var queries = new OrderRequestQueries(db, world.Coordinator);
        var v1 = (await queries.GetAsync(world.V1, new OrderItemQuery(), None))!;
        var correction = (await queries.GetAsync(v2, new OrderItemQuery(), None))!;

        Assert.Equal((false, true, v2, 2, false, false),
            (v1.IsRevision, v1.HasRevision, v1.RevisionOrderRequestId, v1.RevisionVersion, v1.CanCreateRevision, v1.CanEditRevision));
        Assert.Equal((true, world.V1, 1, false, false, true),
            (correction.IsRevision, correction.SourceOrderRequestId, correction.SourceVersion, correction.HasRevision,
             correction.CanCreateRevision, correction.CanEditRevision));

        // Line for line in the same order as the version it corrects, each naming the line it was copied from.
        Assert.Equal(v1.Items.Items.Select(item => (long?)item.OrderRequestItemId),
            correction.Items.Items.Select(item => item.SourceOrderRequestItemId));

        var managerView = (await new OrderRequestQueries(db, world.Manager).GetAsync(v2, new OrderItemQuery(), None))!;
        Assert.False(managerView.CanEditRevision);
    }

    [PostgresFact]
    public async Task Before_it_is_corrected_a_returned_version_offers_the_correction()
    {
        var world = await ReturnedAsync();

        await using var db = database.CreateContext();
        var detail = (await new OrderRequestQueries(db, world.Coordinator).GetAsync(world.V1, new OrderItemQuery(), None))!;
        var managerDetail = (await new OrderRequestQueries(db, world.Manager).GetAsync(world.V1, new OrderItemQuery(), None))!;

        Assert.True(detail.CanCreateRevision);
        Assert.False(managerDetail.CanCreateRevision);
    }

    // ---- the correction in the workflow --------------------------------------------------------------

    [PostgresFact]
    public async Task The_correction_goes_through_the_existing_workflow_and_keeps_its_version()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;
        await EditScenarioAsync(world, v2);

        await WorkflowAs(world.Coordinator, service => service.SubmitAsync(v2, new SubmitForApprovalCommand(), None));
        var approved = await WorkflowAs(world.Manager, service =>
            service.ApproveAsync(v2, new ApproveOrderCommand(AcknowledgeMissingPrices: true), None));

        Assert.Equal((OrderRequestStatus.Approved, 2), (approved.Status, approved.Version));

        await using var db = database.CreateContext();
        Assert.Equal(OrderRequestStatus.ReturnedForCorrection, (await db.OrderRequests.SingleAsync(request => request.Id == world.V1)).Status);
        Assert.Equal(6, await db.OrderRequestEditEvents.CountAsync(entry => entry.OrderRequestId == v2));
        Assert.Equal(2, await db.OrderRequestWorkflowEvents.CountAsync(entry => entry.OrderRequestId == v2));
    }

    [PostgresFact]
    public async Task A_corrected_version_is_not_sent_back_unchanged()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;

        var refused = await Assert.ThrowsAsync<DomainException>(() =>
            WorkflowAs(world.Coordinator, service => service.SubmitAsync(world.V1, new SubmitForApprovalCommand(), None)));
        Assert.Contains("version 2", refused.Message);

        var offered = (await WorkflowAs(world.Coordinator, service => service.GetAsync(world.V1, None)))!;
        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false), offered.AllowedActions);

        var correction = (await WorkflowAs(world.Coordinator, service => service.GetAsync(v2, None)))!;
        Assert.True(correction.AllowedActions.CanSubmit);
    }

    [PostgresFact]
    public async Task An_administrator_who_corrects_and_submits_still_cannot_approve_it()
    {
        var world = await ReturnedAsync();
        var admin = await UserAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        var v2 = (await RevisingAs(admin, service => service.CreateAsync(world.V1, None))).OrderRequestId;

        await WorkflowAs(admin, service => service.SubmitAsync(v2, new SubmitForApprovalCommand(), None));

        // 4.3: as an administrator they hold no approval authority at all, and the service refuses that first.
        await Assert.ThrowsAsync<ForbiddenException>(() => WorkflowAs(admin, service =>
            service.ApproveAsync(v2, new ApproveOrderCommand(AcknowledgeMissingPrices: true), None)));

        // Made a Rəhbər, they would hold it — and it is their own submission that stops them then.
        await Assert.ThrowsAsync<SelfApprovalNotAllowedException>(() => WorkflowAs(admin.As(BaxOrdersRoles.Manager), service =>
            service.ApproveAsync(v2, new ApproveOrderCommand(AcknowledgeMissingPrices: true), None)));
    }

    [PostgresFact]
    public async Task Whoever_edited_the_correction_cannot_decide_on_it_and_somebody_else_can()
    {
        var world = await ReturnedAsync();
        var editingManager = await UserAsync(BaxOrdersRoles.Manager, "Düzəliş edən rəhbər");
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;

        // A manager cannot edit a correction, so an administrator is who could have both roles here.
        var admin = await UserAsync(BaxOrdersRoles.Admin, "Düzəliş edən administrator");
        await EditAsync(admin, v2, await LineAsync(v2, quantity: 10m), new(null, Quantity: new(11m)));
        await WorkflowAs(world.Coordinator, service => service.SubmitAsync(v2, new SubmitForApprovalCommand(), None));

        // The administrator edited it, so deciding on it is no longer a second pair of eyes — shown on the same
        // person made a Rəhbər, because as an administrator they hold no approval authority at all (4.3).
        var editorAsRehber = admin.As(BaxOrdersRoles.Manager);
        await Assert.ThrowsAsync<OwnContributionNotApprovableException>(() => WorkflowAs(editorAsRehber, service =>
            service.ApproveAsync(v2, new ApproveOrderCommand(AcknowledgeMissingPrices: true), None)));
        await Assert.ThrowsAsync<OwnContributionNotApprovableException>(() => WorkflowAs(editorAsRehber, service =>
            service.ReturnAsync(v2, new ReturnForCorrectionCommand("Fikrimi dəyişdim"), None)));

        var blocked = (await WorkflowAs(editorAsRehber, service => service.GetAsync(v2, None)))!;
        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false, false, true), blocked.AllowedActions);

        // As the administrator they are, they are refused for the missing authority, and told so.
        await Assert.ThrowsAsync<ForbiddenException>(() => WorkflowAs(admin, service =>
            service.ApproveAsync(v2, new ApproveOrderCommand(AcknowledgeMissingPrices: true), None)));
        var asAdmin = (await WorkflowAs(admin, service => service.GetAsync(v2, None)))!;
        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false, BlockedByMissingAuthority: true), asAdmin.AllowedActions);

        // The coordinator who created and submitted it is offered nothing, and is told no reason: a
        // coordinator never decides, so there is no decision for either rule to be blocking.
        var submitter = (await WorkflowAs(world.Coordinator, service => service.GetAsync(v2, None)))!;
        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false), submitter.AllowedActions);

        // A manager who touched nothing decides as usual.
        var free = (await WorkflowAs(editingManager, service => service.GetAsync(v2, None)))!;
        Assert.True(free.AllowedActions.CanApprove);

        var approved = await WorkflowAs(editingManager, service =>
            service.ApproveAsync(v2, new ApproveOrderCommand(AcknowledgeMissingPrices: true), None));
        Assert.Equal(OrderRequestStatus.Approved, approved.Status);
    }

    [PostgresFact]
    public async Task An_imported_request_is_still_decided_on_the_submitter_rule_alone()
    {
        var request = await ImportAsync();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        await WorkflowAs(coordinator, service => service.SubmitAsync(request, new SubmitForApprovalCommand(), None));
        var approved = await WorkflowAs(manager, service =>
            service.ApproveAsync(request, new ApproveOrderCommand(AcknowledgeMissingPrices: true), None));

        Assert.Equal(OrderRequestStatus.Approved, approved.Status);
    }

    [PostgresFact]
    public async Task A_returned_correction_is_corrected_again_one_version_at_a_time()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;
        await EditScenarioAsync(world, v2);

        var v3 = await CorrectAgainAsync(world, v2);

        await using var db = database.CreateContext();
        var v2Lines = await db.OrderRequestItems.AsNoTracking().Where(item => item.OrderRequestId == v2).ToListAsync();
        var v3Lines = await db.OrderRequestItems.AsNoTracking().Where(item => item.OrderRequestId == v3).ToListAsync();
        var v1Ids = await db.OrderRequestItems.Where(item => item.OrderRequestId == world.V1).Select(item => item.Id).ToListAsync();

        Assert.Equal(3, (await db.OrderRequests.SingleAsync(request => request.Id == v3)).Version);
        Assert.Equal(v2Lines.Select(item => (long?)item.Id).Order(), v3Lines.Select(item => item.SourceOrderRequestItemId).Order());
        Assert.DoesNotContain(v3Lines, item => item.SourceOrderRequestItemId is { } source && v1Ids.Contains(source));
        Assert.Equal(v2Lines.Select(Business).OrderBy(value => value.ToString()),
            v3Lines.Select(Business).OrderBy(value => value.ToString()));

        var chain = await db.OrderRequestRevisions.AsNoTracking()
            .Where(revision => revision.SourceOrderRequestId == world.V1 || revision.SourceOrderRequestId == v2)
            .OrderBy(revision => revision.Id)
            .Select(revision => new { revision.SourceOrderRequestId, revision.RevisionOrderRequestId })
            .ToListAsync();
        Assert.Equal([(world.V1, v2), (v2, v3)], chain.Select(link => (link.SourceOrderRequestId, link.RevisionOrderRequestId)));
    }

    // ---- analytics -----------------------------------------------------------------------------------

    [PostgresFact]
    public async Task Analytics_reads_the_correction_as_soon_as_it_exists()
    {
        var world = await ReturnedAsync();

        var before = await ComparisonAsync(world);
        Assert.Equal((world.V1, 1, OrderRequestStatus.ReturnedForCorrection), (before.CurrentRequestId, before.CurrentVersion, before.CurrentStatus));

        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;

        // The existing policy, unchanged: the newest version counts, whatever its status. A draft included.
        var copied = await ComparisonAsync(world);
        Assert.Equal((v2, 2, OrderRequestStatus.Draft), (copied.CurrentRequestId, copied.CurrentVersion, copied.CurrentStatus));
        Assert.Equal((before.CurrentKnownAmountTotal, before.CurrentMissingPriceItemCount),
            (copied.CurrentKnownAmountTotal, copied.CurrentMissingPriceItemCount));

        await EditScenarioAsync(world, v2);

        var edited = await ComparisonAsync(world);
        Assert.Equal((41m, 1, 3), (edited.CurrentKnownAmountTotal, edited.CurrentMissingPriceItemCount, edited.CurrentItemCount));

        await using var db = database.CreateContext();
        var dashboard = await new ManagementDashboardQueries(db).GetAsync(
            world.Order.Period, new DashboardQuery(Search: world.Order.LocationName, PageSize: 100), None);
        var row = dashboard!.Rows.Items.Single(item => item.LocationId == world.Order.LocationId);
        Assert.Equal((v2, 2, 41m), (row.CurrentRequestId, row.CurrentVersion, row.Current.KnownAmount));
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private sealed record World(ImportedOrder Order, TestCurrentUser Coordinator, TestCurrentUser Manager)
    {
        public long V1 => Order.OrderRequestId;
    }

    private sealed record EditScenario(
        long QuantityItemId, long PricedItemId, long RemovedItemId, long AddedItemId, long AddedVariantId, int SupplierId, string SupplierName);

    /// <summary>An imported version 1, submitted by a coordinator and handed back by a manager.</summary>
    private async Task<World> ReturnedAsync()
    {
        var order = await ImportedOrderAsync();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        await WorkflowAs(coordinator, service => service.SubmitAsync(order.OrderRequestId, new SubmitForApprovalCommand(), None));
        await WorkflowAs(manager, service => service.ReturnAsync(order.OrderRequestId, new ReturnForCorrectionCommand("Miqdarlar yoxlanmalıdır"), None));

        return new World(order, coordinator, manager);
    }

    private async Task<ImportedOrder> ImportedOrderAsync()
    {
        await using var db = database.CreateContext();
        return await ImportedOrders.ImportAsync(db, ThreeLines);
    }

    private async Task<long> ImportAsync() => (await ImportedOrderAsync()).OrderRequestId;

    /// <summary>
    /// The edits of the synthetic scenario: a quantity changed, a missing price filled in and a supplier set on
    /// that line, a new variant added without a price, and a copied line removed.
    /// </summary>
    private async Task<EditScenario> EditScenarioAsync(World world, long v2)
    {
        var supplier = await SupplierAsync();
        var variant = await NewVariantAsync();
        var quantityLine = await LineAsync(v2, quantity: 10m);
        var pricedLine = await LineAsync(v2, quantity: 5m);
        var removedLine = await LineAsync(v2, quantity: 3m);

        await EditAsync(world.Coordinator, v2, quantityLine, new(null, Quantity: new(12.5m)));
        await EditAsync(world.Coordinator, v2, pricedLine, new(null, UnitPrice: new(3.2m)));
        await EditAsync(world.Coordinator, v2, pricedLine, new(null, SupplierId: new(supplier.Id)));

        var added = await RevisingAs(world.Coordinator, async service =>
            await service.AddItemAsync(v2, new AddOrderItemCommand((await service.GetAsync(v2, None))!.RowVersion, variant, 4m), None));

        await RevisingAs(world.Coordinator, async service =>
            await service.RemoveItemAsync(v2, removedLine, (await service.GetAsync(v2, None))!.RowVersion, None));

        return new EditScenario(quantityLine, pricedLine, removedLine, added.OrderRequestItemId!.Value, variant, supplier.Id, supplier.Name);
    }

    /// <summary>Submits the correction, has it returned, and corrects it again.</summary>
    private async Task<long> CorrectAgainAsync(World world, long v2)
    {
        await WorkflowAs(world.Coordinator, service => service.SubmitAsync(v2, new SubmitForApprovalCommand(), None));
        await WorkflowAs(world.Manager, service => service.ReturnAsync(v2, new ReturnForCorrectionCommand("Hələ də səhvdir"), None));
        return (await RevisingAs(world.Coordinator, service => service.CreateAsync(v2, None))).OrderRequestId;
    }

    /// <summary>An edit the way a screen makes one: read the row version, send it back with the change.</summary>
    private Task<RevisionEditResultDto> EditAsync(ICurrentUserContext user, long request, long line, EditOrderItemCommand change) =>
        RevisingAs(user, async service =>
        {
            var current = await service.GetAsync(request, None)
                          ?? throw new InvalidOperationException($"Request #{request} does not exist.");
            return await service.EditItemAsync(request, line, change with { RowVersion = current.RowVersion }, None);
        });

    private async Task<T> RevisingAs<T>(ICurrentUserContext user, Func<OrderRevisionService, Task<T>> work)
    {
        await using var db = database.CreateContext();
        return await work(new OrderRevisionService(db, user, new PostgresOrderRequestLock(db), NullLogger<OrderRevisionService>.Instance));
    }

    private async Task<T> WorkflowAs<T>(ICurrentUserContext user, Func<OrderWorkflowService, Task<T>> work)
    {
        await using var db = database.CreateContext();
        return await work(new OrderWorkflowService(db, user, new PostgresOrderRequestLock(db)));
    }

    private async Task<TestCurrentUser> UserAsync(string role, string displayName)
    {
        await using var db = database.CreateContext();
        return role switch
        {
            BaxOrdersRoles.Coordinator => await TestCurrentUser.CoordinatorAsync(db, displayName),
            BaxOrdersRoles.Manager => await TestCurrentUser.ManagerAsync(db, displayName),
            _ => await TestCurrentUser.AdminAsync(db, displayName),
        };
    }

    // ---- what a line was classified as -----------------------------------------------------------------

    /// <summary>
    /// Moving a line between the monthly plan and the ad-hoc orders, against a real database.
    /// </summary>
    /// <remarks>
    /// This is here because it did not work. The database refuses an edit-history entry whose action is not in
    /// the list of actions that name a field, and the classification was never added to that list, so every
    /// attempt failed at save time with a constraint violation. The unit tests could not see it: they never
    /// reach a database. This one does.
    /// </remarks>
    [PostgresFact]
    public async Task Changing_what_a_line_was_classified_as_is_recorded()
    {
        var world = await ReturnedAsync();
        var v2 = (await RevisingAs(world.Coordinator, service => service.CreateAsync(world.V1, None))).OrderRequestId;
        var line = await LineAsync(v2, 10m);

        await EditAsync(world.Coordinator, v2, line,
            new EditOrderItemCommand(null, OrderLineType: new(OrderLineType.OutsideMonthly)));

        await using var db = database.CreateContext();
        var entry = await db.OrderRequestEditEvents.AsNoTracking()
            .SingleAsync(item => item.OrderRequestId == v2 && item.Action == OrderEditAction.ItemOrderLineTypeChanged, None);
        Assert.Equal(OrderEditField.OrderLineType, entry.Field);
        // Stored as a JSON string, because every value in this column is read back as JSON.
        Assert.Equal(("\"Monthly\"", "\"OutsideMonthly\""), (entry.OldValue, entry.NewValue));
        Assert.Equal(
            OrderLineType.OutsideMonthly,
            await db.OrderRequestItems.AsNoTracking().Where(item => item.Id == line)
                .Select(item => item.OrderLineType).SingleAsync(None));
    }

    private async Task<Supplier> SupplierAsync()
    {
        await using var db = database.CreateContext();
        var supplier = new Supplier($"Sınaq şirkəti {Guid.NewGuid():N}"[..24]);
        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();
        return supplier;
    }

    private async Task<long> NewVariantAsync()
    {
        await using var db = database.CreateContext();
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Product(
            await new PostgresProductCodeGenerator(db).NextAsync(None), $"Əlavə mal {Guid.NewGuid():N}"[..20]);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();
        return variant.Id;
    }

    /// <summary>The line of a request with this quantity — each synthetic line has its own.</summary>
    private async Task<long> LineAsync(long request, decimal quantity)
    {
        await using var db = database.CreateContext();
        return await db.OrderRequestItems
            .Where(item => item.OrderRequestId == request && item.Quantity == quantity)
            .Select(item => item.Id)
            .SingleAsync();
    }

    private static async Task<OrderRequest> RequestAsync(BaxOrdersDbContext db, long id) =>
        await db.OrderRequests.AsNoTracking().Include(request => request.Items).SingleAsync(request => request.Id == id);

    private static object Business(OrderRequestItem item) =>
        (item.ProductVariantId, item.Quantity, item.UnitPrice, item.SupplierId, item.OriginalProductName, item.Notes);

    /// <summary>Everything stored about one request and its lines, the row version included.</summary>
    private async Task<string> SnapshotAsync(long request)
    {
        await using var db = database.CreateContext();
        var header = await db.OrderRequests.AsNoTracking().Where(item => item.Id == request)
            .Select(item => new
            {
                item.Status, item.Version, item.ConcurrencyStamp, item.UpdatedAtUtc, item.RequestDate,
                item.SubmittedByUserId, item.SubmittedAtUtc, item.ReturnedAtUtc, item.ApprovedAtUtc,
            })
            .SingleAsync();
        var lines = await db.OrderRequestItems.AsNoTracking().Where(item => item.OrderRequestId == request).OrderBy(item => item.Id)
            .Select(item => new
            {
                item.Id, item.ProductVariantId, item.Quantity, item.UnitPrice, item.SupplierId,
                item.OriginalProductName, item.Notes, item.SourceOrderRequestItemId,
            })
            .ToListAsync();
        var workflow = await db.OrderRequestWorkflowEvents.CountAsync(item => item.OrderRequestId == request);
        var edits = await db.OrderRequestEditEvents.CountAsync(item => item.OrderRequestId == request);

        return JsonSerializer.Serialize(new { header, lines, workflow, edits });
    }

    private async Task<List<string>> HistoryJsonAsync(long request)
    {
        await using var db = database.CreateContext();
        var entries = await db.OrderRequestEditEvents.AsNoTracking()
            .Where(item => item.OrderRequestId == request).OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.Action, item.Field, item.OldValue, item.NewValue, item.ActorUserId, item.ActorDisplayName, item.OccurredAtUtc })
            .ToListAsync();
        return entries.Select(entry => JsonSerializer.Serialize(entry)).ToList();
    }

    private async Task AssertVersionsAsync(World world, params int[] expected)
    {
        await using var db = database.CreateContext();
        var versions = await db.OrderRequests
            .Where(request => request.LocationId == world.Order.LocationId && request.RequestPeriod == world.Order.Period)
            .OrderBy(request => request.Version)
            .Select(request => request.Version)
            .ToListAsync();
        Assert.Equal(expected, versions);
    }

    private async Task<ComparisonSummaryDto> ComparisonAsync(World world)
    {
        await using var db = database.CreateContext();
        var comparison = await new OrderAnalyticsQueries(db).CompareAsync(
            world.Order.LocationId, world.Order.Period, new ComparisonQuery(PageSize: 200), None);
        return comparison!.Summary;
    }
}
