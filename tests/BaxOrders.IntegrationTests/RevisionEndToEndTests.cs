using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Orders.Revisions;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Correcting a returned order the whole way through: people sign in on their own sessions and correct,
/// edit, submit and decide over real HTTP, with real cookies and real antiforgery tokens.
/// </summary>
/// <remarks>
/// The version 1 of every scenario is synthetic and came through a real import, so its lines have workbook
/// rows. Everything lives in the throw-away test database, which the fixture drops at the end of the run;
/// no company request is touched, and nothing in the pipeline is relaxed for a test.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class RevisionEndToEndTests(PostgresDatabaseFixture database) : IAsyncLifetime
{
    private WebApplicationFactory<Program> factory = null!;

    public Task InitializeAsync()
    {
        factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:BaxOrders", PostgresDatabaseFixture.ConnectionString);
        });

        return Task.CompletedTask;
    }

    public async Task DisposeAsync() => await factory.DisposeAsync();

    // ---- A: returned, then corrected -----------------------------------------------------------------

    [PostgresFact]
    public async Task A_coordinator_corrects_a_returned_order_and_the_reviewed_version_stays_as_it_was()
    {
        var world = await ReturnedAsync();
        var reviewed = await SnapshotAsync(world.V1);

        var created = await AuthenticatedApi.PostAsync(world.Coordinator.Client, $"/api/v1/orders/{world.V1}/revision", new { });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var result = await ReadAsync<CreateRevisionResultDto>(created);
        Assert.Equal((2, 3, false), (result.Version, result.ItemCount, result.AlreadyExisted));
        Assert.EndsWith($"/api/v1/orders/{result.OrderRequestId}/revision", created.Headers.Location!.ToString());

        // Pressed again: the same correction, not a second one.
        var again = await AuthenticatedApi.PostAsync(world.Coordinator.Client, $"/api/v1/orders/{world.V1}/revision", new { });
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var repeat = await ReadAsync<CreateRevisionResultDto>(again);
        Assert.Equal((result.OrderRequestId, true), (repeat.OrderRequestId, repeat.AlreadyExisted));

        var v2 = await RevisionAsync(world.Coordinator.Client, result.OrderRequestId);
        Assert.Equal((true, world.V1, 1, OrderRequestStatus.Draft), (v2.IsRevision, v2.RevisedFrom!.OrderRequestId, v2.RevisedFrom.Version, v2.Status));
        Assert.True(v2.CanEditRevision);
        Assert.Equal("Sınaq koordinatoru A", v2.RevisedFrom.CreatedByDisplayName);
        Assert.Equal(OrderEditAction.RevisionCreated, Assert.Single(v2.EditHistory).Action);

        var v1 = await RevisionAsync(world.Coordinator.Client, world.V1);
        Assert.Equal((result.OrderRequestId, false), (v1.RevisedInto!.OrderRequestId, v1.CanCreateRevision));

        await using var db = database.CreateContext();
        var originals = await LinesAsync(db, world.V1);
        var copies = await LinesAsync(db, result.OrderRequestId);
        Assert.Equal(originals.Select(Business), copies.OrderBy(line => line.SourceOrderRequestItemId).Select(Business));
        Assert.Equal(originals.Select(line => (long?)line.Id), copies.Select(line => line.SourceOrderRequestItemId).Order());
        Assert.False(await db.ImportRowMaterializations.AnyAsync(link => link.OrderRequestItem.OrderRequestId == result.OrderRequestId));

        Assert.Equal(reviewed, await SnapshotAsync(world.V1));
    }

    // ---- B: the correction is edited -----------------------------------------------------------------

    [PostgresFact]
    public async Task Editing_the_correction_changes_only_the_correction_and_records_every_change()
    {
        var world = await ReturnedAsync();
        var v2 = await CorrectAsync(world.Coordinator, world.V1);
        var reviewed = await SnapshotAsync(world.V1);

        var scenario = await EditScenarioAsync(world.Coordinator, v2);

        var state = await RevisionAsync(world.Coordinator.Client, v2);
        Assert.Equal((3, 1, 41m, false), (state.ItemCount, state.MissingPriceItemCount, state.KnownAmountTotal, state.AmountIsComplete));
        Assert.Equal(
            [OrderEditAction.RevisionCreated, OrderEditAction.ItemQuantityChanged, OrderEditAction.ItemPriceChanged,
             OrderEditAction.ItemSupplierChanged, OrderEditAction.ItemAdded, OrderEditAction.ItemRemoved],
            state.EditHistory.Select(entry => entry.Action).ToArray());
        Assert.All(state.EditHistory, entry => Assert.Equal(world.Coordinator.Account.Id, entry.ActorUserId));
        Assert.All(state.EditHistory, entry => Assert.Equal("Sınaq koordinatoru A", entry.ActorDisplayName));

        // Structured values, readable without parsing prose.
        var quantity = state.EditHistory.Single(entry => entry.Action == OrderEditAction.ItemQuantityChanged);
        Assert.Equal((10m, 12.5m), (quantity.OldValue!.Value.GetDecimal(), quantity.NewValue!.Value.GetDecimal()));
        var price = state.EditHistory.Single(entry => entry.Action == OrderEditAction.ItemPriceChanged);
        Assert.Null(price.OldValue);
        Assert.Equal(3.2m, price.NewValue!.Value.GetDecimal());
        var supplier = state.EditHistory.Single(entry => entry.Action == OrderEditAction.ItemSupplierChanged);
        Assert.Equal(scenario.SupplierName, supplier.NewValue!.Value.GetProperty("name").GetString());
        var removed = state.EditHistory.Single(entry => entry.Action == OrderEditAction.ItemRemoved);
        Assert.Equal(4.5m, removed.OldValue!.Value.GetProperty("unitPrice").GetDecimal());
        Assert.NotNull(removed.ProductName);

        // The reviewed version: not one value changed.
        Assert.Equal(reviewed, await SnapshotAsync(world.V1));
        var original = await DetailAsync(world.Coordinator.Client, world.V1);
        Assert.Equal((3, 33.5m, 1), (original.ItemCount, original.KnownAmountTotal, original.MissingPriceItemCount));
    }

    // ---- C: the correction is approved ---------------------------------------------------------------

    [PostgresFact]
    public async Task The_edited_correction_is_approved_through_the_existing_workflow_and_analytics_reads_it()
    {
        var world = await ReturnedAsync();
        var v2 = await CorrectAsync(world.Coordinator, world.V1);
        await EditScenarioAsync(world.Coordinator, v2);

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(world.Coordinator.Client, $"/api/v1/orders/{v2}/workflow/submit", new { comment = "Düzəldildi" }));
        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(world.Manager.Client, $"/api/v1/orders/{v2}/workflow/approve", new { acknowledgeMissingPrices = true }));

        var approved = await WorkflowAsync(world.Manager.Client, v2);
        Assert.Equal((OrderRequestStatus.Approved, 2), (approved.Status, approved.Version));
        Assert.Equal(
            [(OrderWorkflowAction.SubmittedForApproval, world.Coordinator.Account.Id), (OrderWorkflowAction.Approved, world.Manager.Account.Id)],
            approved.History.Select(entry => (entry.Action, entry.ActorUserId!.Value)).ToArray());

        var reviewed = await WorkflowAsync(world.Manager.Client, world.V1);
        Assert.Equal(OrderRequestStatus.ReturnedForCorrection, reviewed.Status);
        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false), reviewed.AllowedActions);

        var correction = await RevisionAsync(world.Coordinator.Client, v2);
        Assert.Equal((6, false), (correction.EditHistory.Count, correction.CanEditRevision));

        var comparison = await ReadAsync<LocationComparisonDto>(await world.Manager.Client.GetAsync(
            $"/api/v1/analytics/locations/{world.Order.LocationId}/periods/{world.Order.Period:yyyy-MM}/comparison"));
        Assert.Equal((v2, 2, OrderRequestStatus.Approved, 41m),
            (comparison.Summary.CurrentRequestId, comparison.Summary.CurrentVersion, comparison.Summary.CurrentStatus,
             comparison.Summary.CurrentKnownAmountTotal));
    }

    // ---- D: the correction is returned and corrected again -------------------------------------------

    [PostgresFact]
    public async Task A_returned_correction_is_corrected_into_version_three_whose_lines_lead_to_version_two()
    {
        var world = await ReturnedAsync();
        var v2 = await CorrectAsync(world.Coordinator, world.V1);

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(world.Coordinator.Client, $"/api/v1/orders/{v2}/workflow/submit", new { }));
        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(world.Manager.Client, $"/api/v1/orders/{v2}/workflow/return", new { reason = "Hələ də səhvdir" }));

        // Version 2 is not reopened; nor is it edited any more.
        var stillLocked = await EditAsync(world.Coordinator, v2, await LineIdAsync(v2, 10m), new() { ["quantity"] = new { value = 11m } });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, stillLocked.StatusCode);

        var v3 = await CorrectAsync(world.Coordinator, v2);

        var third = await RevisionAsync(world.Coordinator.Client, v3);
        Assert.Equal((3, v2, 2), (third.Version, third.RevisedFrom!.OrderRequestId, third.RevisedFrom.Version));
        var second = await RevisionAsync(world.Coordinator.Client, v2);
        Assert.Equal((world.V1, v3), (second.RevisedFrom!.OrderRequestId, second.RevisedInto!.OrderRequestId));

        await using var db = database.CreateContext();
        var v1Lines = await LinesAsync(db, world.V1);
        var v2Lines = await LinesAsync(db, v2);
        var v3Lines = await LinesAsync(db, v3);
        Assert.Equal(v2Lines.Select(line => (long?)line.Id), v3Lines.Select(line => line.SourceOrderRequestItemId).Order());
        Assert.DoesNotContain(v3Lines, line => v1Lines.Any(original => original.Id == line.SourceOrderRequestItemId));

        // And a line of version 3 still reaches its workbook row, through version 2 and version 1.
        var provenance = await ReadAsync<OrderItemProvenanceDto>(
            await world.Coordinator.Client.GetAsync($"/api/v1/orders/items/{v3Lines[0].Id}/source"));
        Assert.Equal(OrderItemOrigin.Imported, provenance.Origin);
        Assert.Equal([3, 2, 1], provenance.Lineage.Select(step => step.Version));
        Assert.Equal(world.Order.ImportBatchId, provenance.Source!.ImportBatchId);
    }

    // ---- who may do it -------------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_coordinator_or_an_administrator_corrects_and_a_manager_only_looks()
    {
        var world = await ReturnedAsync();
        using var admin = await SignedInAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        using var stranger = AuthenticatedApi.Anonymous(factory);

        // Nobody signed in reads nothing and changes nothing.
        Assert.Equal(HttpStatusCode.Unauthorized, (await stranger.GetAsync($"/api/v1/orders/{world.V1}/revision")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await AuthenticatedApi.PostAsync(stranger, $"/api/v1/orders/{world.V1}/revision", new { })).StatusCode);

        // A manager reads, and is told there is nothing here for them to do.
        var managerView = await RevisionAsync(world.Manager.Client, world.V1);
        Assert.False(managerView.CanCreateRevision);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await AuthenticatedApi.PostAsync(world.Manager.Client, $"/api/v1/orders/{world.V1}/revision", new { })).StatusCode);

        // An administrator may correct.
        var v2 = await CorrectAsync(admin, world.V1);
        var line = await LineIdAsync(v2, 10m);

        Assert.Equal(HttpStatusCode.OK, (await EditAsync(admin, v2, line, new() { ["quantity"] = new { value = 11m } })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await EditAsync(world.Coordinator, v2, line, new() { ["quantity"] = new { value = 12m } })).StatusCode);

        // A manager cannot edit, add or remove, whatever the screen shows.
        var token = (await RevisionAsync(world.Manager.Client, v2)).RowVersion;
        Assert.False((await RevisionAsync(world.Manager.Client, v2)).CanEditRevision);
        Assert.Equal(HttpStatusCode.Forbidden, (await EditAsync(world.Manager, v2, line, new() { ["quantity"] = new { value = 13m } })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await AuthenticatedApi.PostAsync(world.Manager.Client,
            $"/api/v1/orders/{v2}/items", new { rowVersion = token, productVariantId = 1, quantity = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await AuthenticatedApi.DeleteAsync(world.Manager.Client,
            $"/api/v1/orders/{v2}/items/{line}?rowVersion={token}")).StatusCode);

        await using var db = database.CreateContext();
        Assert.Equal(12m, (await db.OrderRequestItems.SingleAsync(item => item.Id == line)).Quantity);
    }

    [PostgresFact]
    public async Task Whoever_edited_the_correction_cannot_decide_on_it_over_http()
    {
        var world = await ReturnedAsync();
        using var editingAdmin = await SignedInAsync(BaxOrdersRoles.Admin, "Düzəliş edən administrator");
        using var freshManager = await SignedInAsync(BaxOrdersRoles.Manager, "Toxunmayan rəhbər");

        var v2 = await CorrectAsync(world.Coordinator, world.V1);
        await ExpectAsync(HttpStatusCode.OK,
            EditAsync(editingAdmin, v2, await LineIdAsync(v2, 10m), new() { ["quantity"] = new { value = 11m } }));
        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(world.Coordinator.Client, $"/api/v1/orders/{v2}/workflow/submit", new { }));

        // The screen would not offer it, and the endpoint refuses it anyway.
        var offered = await WorkflowAsync(editingAdmin.Client, v2);
        Assert.False(offered.AllowedActions.CanApprove);
        Assert.True(offered.AllowedActions.BlockedByOwnContribution);
        Assert.False(offered.AllowedActions.BlockedBySelfApproval);

        var ownApproval = await AuthenticatedApi.PostAsync(editingAdmin.Client,
            $"/api/v1/orders/{v2}/workflow/approve", new { acknowledgeMissingPrices = true });
        var ownReturn = await AuthenticatedApi.PostAsync(editingAdmin.Client,
            $"/api/v1/orders/{v2}/workflow/return", new { reason = "Yenidən bax" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, ownApproval.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, ownReturn.StatusCode);
        Assert.Contains("OwnContributionNotApprovable", await ownApproval.Content.ReadAsStringAsync());

        // Somebody who touched nothing still decides.
        var free = await WorkflowAsync(freshManager.Client, v2);
        Assert.True(free.AllowedActions.CanApprove);
        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PostAsync(freshManager.Client,
            $"/api/v1/orders/{v2}/workflow/approve", new { acknowledgeMissingPrices = true }));

        Assert.Equal(OrderRequestStatus.Approved, (await WorkflowAsync(freshManager.Client, v2)).Status);
    }

    [PostgresFact]
    public async Task An_administrator_who_corrects_and_submits_cannot_approve_it()
    {
        var world = await ReturnedAsync();
        using var admin = await SignedInAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        var v2 = await CorrectAsync(admin, world.V1);

        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PostAsync(admin.Client, $"/api/v1/orders/{v2}/workflow/submit", new { }));

        var ownApproval = await AuthenticatedApi.PostAsync(admin.Client, $"/api/v1/orders/{v2}/workflow/approve", new { acknowledgeMissingPrices = true });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, ownApproval.StatusCode);
        Assert.True((await WorkflowAsync(admin.Client, v2)).AllowedActions.BlockedBySelfApproval);
    }

    // ---- the contract --------------------------------------------------------------------------------

    [PostgresFact]
    public async Task What_cannot_be_read_unambiguously_or_applied_safely_is_refused()
    {
        var world = await ReturnedAsync();
        var v2 = await CorrectAsync(world.Coordinator, world.V1);
        var line = await LineIdAsync(v2, 10m);
        var client = world.Coordinator.Client;

        // "unitPrice": null could mean "unchanged" or "clear it": refused, rather than guessed.
        Assert.Equal(HttpStatusCode.BadRequest, (await EditAsync(world.Coordinator, v2, line, new() { ["unitPrice"] = null })).StatusCode);

        // A line's product is not edited; a different product is a different line.
        Assert.Equal(HttpStatusCode.BadRequest,
            (await EditAsync(world.Coordinator, v2, line, new() { ["productVariantId"] = 1 })).StatusCode);

        // Nothing to change, or no row version at all.
        Assert.Equal(HttpStatusCode.BadRequest, (await EditAsync(world.Coordinator, v2, line, new())).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await AuthenticatedApi.PatchAsync(client,
            $"/api/v1/orders/{v2}/items/{line}", new { quantity = new { value = 2m } })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await AuthenticatedApi.DeleteAsync(client, $"/api/v1/orders/{v2}/items/{line}")).StatusCode);

        // A copy read before somebody else's change is refused, not applied on top of it.
        var stale = (await RevisionAsync(client, v2)).RowVersion;
        Assert.Equal(HttpStatusCode.OK, (await EditAsync(world.Coordinator, v2, line, new() { ["quantity"] = new { value = 11m } })).StatusCode);
        var late = await AuthenticatedApi.PatchAsync(client, $"/api/v1/orders/{v2}/items/{line}",
            new Dictionary<string, object?> { ["rowVersion"] = stale, ["quantity"] = new { value = 99m } });
        Assert.Equal(HttpStatusCode.Conflict, late.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,
            (await AuthenticatedApi.DeleteAsync(client, $"/api/v1/orders/{v2}/items/{line}?rowVersion={stale}")).StatusCode);

        // Out of range, or not an editable correction at all.
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await EditAsync(world.Coordinator, v2, line, new() { ["quantity"] = new { value = 0m } })).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await EditAsync(world.Coordinator, world.V1, await LineIdAsync(world.V1, 10m), new() { ["quantity"] = new { value = 2m } })).StatusCode);

        // A line that is not this request's.
        var elsewhere = await ReturnedAsync();
        Assert.Equal(HttpStatusCode.NotFound,
            (await EditAsync(world.Coordinator, v2, await LineIdAsync(elsewhere.V1, 10m), new() { ["quantity"] = new { value = 2m } })).StatusCode);

        // A draft that is not a correction — the company's 167 are all this kind — is not corrected either.
        var draft = await ImportAsync();
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await AuthenticatedApi.PostAsync(client, $"/api/v1/orders/{draft.OrderRequestId}/revision", new { })).StatusCode);

        await using var db = database.CreateContext();
        Assert.Equal(11m, (await db.OrderRequestItems.SingleAsync(item => item.Id == line)).Quantity);
    }

    [PostgresFact]
    public async Task Correcting_and_editing_need_the_antiforgery_token_like_every_other_write()
    {
        var world = await ReturnedAsync();
        var client = world.Coordinator.Client;

        var withoutToken = await client.PostAsJsonAsync($"/api/v1/orders/{world.V1}/revision", new { });
        Assert.Equal(HttpStatusCode.BadRequest, withoutToken.StatusCode);

        var v2 = await CorrectAsync(world.Coordinator, world.V1);
        var line = await LineIdAsync(v2, 10m);
        var token = (await RevisionAsync(client, v2)).RowVersion;

        var patchWithoutToken = await client.PatchAsJsonAsync($"/api/v1/orders/{v2}/items/{line}",
            new Dictionary<string, object?> { ["rowVersion"] = token, ["quantity"] = new { value = 2m } });
        Assert.Equal(HttpStatusCode.BadRequest, patchWithoutToken.StatusCode);

        await using var db = database.CreateContext();
        Assert.Equal(10m, (await db.OrderRequestItems.SingleAsync(item => item.Id == line)).Quantity);
        Assert.Equal(1, await db.OrderRequestRevisions.CountAsync(revision => revision.SourceOrderRequestId == world.V1));
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private sealed class Session(HttpClient client, TestAccount account) : IDisposable
    {
        public HttpClient Client { get; } = client;

        public TestAccount Account { get; } = account;

        public void Dispose() => Client.Dispose();
    }

    private sealed record World(ImportedOrder Order, Session Coordinator, Session Manager)
    {
        public long V1 => Order.OrderRequestId;
    }

    private sealed record EditScenario(long AddedItemId, string SupplierName);

    private async Task<Session> SignedInAsync(string role, string displayName)
    {
        var account = await AuthenticatedApi.CreateUserAsync(factory, role, displayName);
        var client = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(client, account.UserName, account.Password);
        return new Session(client, account);
    }

    private async Task<ImportedOrder> ImportAsync()
    {
        await using var db = database.CreateContext();
        return await ImportedOrders.ImportAsync(db,
            new OrderLine(Quantity: 10, Price: 2),
            new OrderLine(Quantity: 5, Price: null),
            new OrderLine(Quantity: 3, Price: 4.5));
    }

    /// <summary>An imported version 1, submitted by one person and handed back by another, over HTTP.</summary>
    private async Task<World> ReturnedAsync()
    {
        var order = await ImportAsync();
        var coordinator = await SignedInAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru A");
        var manager = await SignedInAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri B");

        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(coordinator.Client, $"/api/v1/orders/{order.OrderRequestId}/workflow/submit", new { }));
        await ExpectAsync(HttpStatusCode.OK,
            AuthenticatedApi.PostAsync(manager.Client, $"/api/v1/orders/{order.OrderRequestId}/workflow/return",
                new { reason = "Miqdarlar yoxlanmalıdır" }));

        return new World(order, coordinator, manager);
    }

    private static async Task<long> CorrectAsync(Session session, long returned)
    {
        var response = await AuthenticatedApi.PostAsync(session.Client, $"/api/v1/orders/{returned}/revision", new { });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await ReadAsync<CreateRevisionResultDto>(response)).OrderRequestId;
    }

    /// <summary>
    /// A quantity changed, a missing price filled in, a supplier set, a new variant added without a price,
    /// and a copied line removed — each with the row version just read, as a screen would send it.
    /// </summary>
    private async Task<EditScenario> EditScenarioAsync(Session session, long v2)
    {
        var (supplierId, supplierName) = await SupplierAsync();
        var variant = await NewVariantAsync();
        var client = session.Client;

        await ExpectAsync(HttpStatusCode.OK, EditAsync(session, v2, await LineIdAsync(v2, 10m), new() { ["quantity"] = new { value = 12.5m } }));
        await ExpectAsync(HttpStatusCode.OK, EditAsync(session, v2, await LineIdAsync(v2, 5m), new() { ["unitPrice"] = new { value = 3.2m } }));
        await ExpectAsync(HttpStatusCode.OK, EditAsync(session, v2, await LineIdAsync(v2, 5m), new() { ["supplierId"] = new { value = supplierId } }));

        var add = await AuthenticatedApi.PostAsync(client, $"/api/v1/orders/{v2}/items",
            new { rowVersion = (await RevisionAsync(client, v2)).RowVersion, productVariantId = variant, quantity = 4m });
        Assert.Equal(HttpStatusCode.Created, add.StatusCode);
        var added = await ReadAsync<RevisionEditResultDto>(add);

        var removed = await AuthenticatedApi.DeleteAsync(client,
            $"/api/v1/orders/{v2}/items/{await LineIdAsync(v2, 3m)}?rowVersion={(await RevisionAsync(client, v2)).RowVersion}");
        Assert.Equal(HttpStatusCode.OK, removed.StatusCode);

        return new EditScenario(added.OrderRequestItemId!.Value, supplierName);
    }

    /// <summary>Reads the row version, then sends it with the change — the way a screen edits a line.</summary>
    private static async Task<HttpResponseMessage> EditAsync(
        Session session, long request, long line, Dictionary<string, object?> change)
    {
        var body = new Dictionary<string, object?>(change)
        {
            ["rowVersion"] = (await RevisionAsync(session.Client, request)).RowVersion,
        };

        return await AuthenticatedApi.PatchAsync(session.Client, $"/api/v1/orders/{request}/items/{line}", body);
    }

    private static async Task<OrderRevisionDto> RevisionAsync(HttpClient client, long request) =>
        await ReadAsync<OrderRevisionDto>(await client.GetAsync($"/api/v1/orders/{request}/revision"));

    private static async Task<OrderWorkflowDto> WorkflowAsync(HttpClient client, long request) =>
        await ReadAsync<OrderWorkflowDto>(await client.GetAsync($"/api/v1/orders/{request}/workflow"));

    private static async Task<OrderRequestDetailDto> DetailAsync(HttpClient client, long request) =>
        await ReadAsync<OrderRequestDetailDto>(await client.GetAsync($"/api/v1/orders/{request}"));

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response)
    {
        Assert.True(response.IsSuccessStatusCode,
            $"{(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<T>(AuthenticatedApi.Json))!;
    }

    private static async Task ExpectAsync(HttpStatusCode expected, Task<HttpResponseMessage> call)
    {
        var response = await call;
        Assert.True(response.StatusCode == expected,
            $"Expected {(int)expected}, got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
    }

    private async Task<long> LineIdAsync(long request, decimal quantity)
    {
        await using var db = database.CreateContext();
        return await db.OrderRequestItems
            .Where(item => item.OrderRequestId == request && item.Quantity == quantity)
            .Select(item => item.Id)
            .SingleAsync();
    }

    private static Task<List<OrderRequestItem>> LinesAsync(BaxOrdersDbContext db, long request) =>
        db.OrderRequestItems.AsNoTracking().Where(item => item.OrderRequestId == request).OrderBy(item => item.Id).ToListAsync();

    private static object Business(OrderRequestItem item) =>
        (item.ProductVariantId, item.Quantity, item.UnitPrice, item.SupplierId, item.OriginalProductName, item.Notes);

    private async Task<(int Id, string Name)> SupplierAsync()
    {
        await using var db = database.CreateContext();
        var supplier = new Supplier($"Sınaq şirkəti {Guid.NewGuid():N}"[..24]);
        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();
        return (supplier.Id, supplier.Name);
    }

    private async Task<long> NewVariantAsync()
    {
        await using var db = database.CreateContext();
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Product(
            await new PostgresProductCodeGenerator(db).NextAsync(CancellationToken.None), $"Əlavə mal {Guid.NewGuid():N}"[..20]);
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();
        return variant.Id;
    }

    /// <summary>Everything stored about one request and its lines, the row version included.</summary>
    private async Task<string> SnapshotAsync(long request)
    {
        await using var db = database.CreateContext();
        var header = await db.OrderRequests.AsNoTracking().Where(item => item.Id == request)
            .Select(item => new { item.Status, item.Version, item.ConcurrencyStamp, item.UpdatedAtUtc, item.SubmittedByUserId, item.ReturnedAtUtc })
            .SingleAsync();
        var lines = await db.OrderRequestItems.AsNoTracking().Where(item => item.OrderRequestId == request).OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.ProductVariantId, item.Quantity, item.UnitPrice, item.SupplierId, item.SourceOrderRequestItemId })
            .ToListAsync();
        return JsonSerializer.Serialize(new { header, lines });
    }
}
