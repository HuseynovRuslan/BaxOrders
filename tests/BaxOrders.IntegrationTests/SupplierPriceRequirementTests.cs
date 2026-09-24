using BaxOrders.Application.Analytics;
using BaxOrders.Application.Approvals;
using BaxOrders.Application.Common;
using BaxOrders.Application.Decisions;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Application.Reports;
using BaxOrders.Application.Suppliers;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// What a blank price means, against a real PostgreSQL.
/// </summary>
/// <remarks>
/// The whole point of this feature is that one database value — a null <c>UnitPrice</c> — now means two
/// different things, and the system must never confuse them. Material bought from outside and not yet priced
/// is a gap somebody has to close. Material issued from the company's own store is a finished line. These
/// tests hold both halves: the gap keeps every warning and block it had, and the internal line loses all of
/// them without any price being invented for it.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class SupplierPriceRequirementTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    // ---- A. external supply with no price is still a gap ----------------------------------------------

    [PostgresFact]
    public async Task An_external_supplier_with_no_price_is_a_missing_price()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var order = await OrderAsync(db, world.ExternalUnpricedId);

        Assert.Equal(1, order.MissingPriceItemCount);
        Assert.Equal(0, order.PriceNotRequiredItemCount);
        Assert.False(order.AmountIsComplete);
    }

    [PostgresFact]
    public async Task Approving_it_still_demands_an_acknowledgement()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var request = await LoadForApprovalAsync(db, world.ExternalUnpricedId);
        request.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);

        Assert.Equal(1, request.MissingRequiredPriceItemCount);
        Assert.Throws<MissingPriceAcknowledgementRequiredException>(() =>
            request.Approve(WorkflowActor.System("Test"), null, missingPricesAcknowledged: false, DateTime.UtcNow));
    }

    // ---- B. internal supply with no price is complete -------------------------------------------------

    [PostgresFact]
    public async Task Material_from_the_companys_own_store_is_not_a_missing_price()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var order = await OrderAsync(db, world.InternalUnpricedId);

        Assert.Equal(0, order.MissingPriceItemCount);
        Assert.Equal(1, order.PriceNotRequiredItemCount);
        Assert.True(order.AmountIsComplete);
        Assert.False(order.RequiresMissingPriceAcknowledgement);
    }

    [PostgresFact]
    public async Task Approving_it_asks_for_no_acknowledgement_at_all()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var request = await LoadForApprovalAsync(db, world.InternalUnpricedId);
        request.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);

        Assert.Equal(0, request.MissingRequiredPriceItemCount);
        // The exception this would once have thrown is the whole complaint this feature answers.
        var approved = request.Approve(WorkflowActor.System("Test"), null, missingPricesAcknowledged: false, DateTime.UtcNow);
        Assert.Equal(OrderRequestStatus.Approved, request.Status);
        Assert.Equal(0, approved.MissingPriceItemCount);
    }

    [PostgresFact]
    public async Task Its_quantity_survives_and_no_price_is_invented_for_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var line = await db.OrderRequestItems.AsNoTracking()
            .SingleAsync(item => item.OrderRequestId == world.InternalUnpricedId);

        Assert.Equal(40m, line.Quantity);
        // Still null in the table. Nothing about this feature writes a zero, or writes anything at all.
        Assert.Null(line.UnitPrice);
        Assert.Equal(world.InternalSupplierId, line.SupplierId);
    }

    // ---- C. internal supply that does carry a price ---------------------------------------------------

    [PostgresFact]
    public async Task An_internal_line_with_a_real_price_keeps_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var order = await OrderAsync(db, world.InternalPricedId);

        Assert.Equal(100m, order.KnownAmountTotal);
        Assert.Equal(0, order.MissingPriceItemCount);
        Assert.True(order.AmountIsComplete);
    }

    // ---- F. a mixed order counts only what is owed ----------------------------------------------------

    [PostgresFact]
    public async Task A_mixed_order_counts_only_the_external_line_that_is_unpriced()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var order = await OrderAsync(db, world.MixedId);

        // Priced external, unpriced external, unpriced internal. Only the middle one is anybody's problem.
        Assert.Equal(1, order.MissingPriceItemCount);
        Assert.Equal(1, order.PriceNotRequiredItemCount);
        Assert.False(order.AmountIsComplete);
    }

    // ---- I. no supplier is never assumed to be internal -----------------------------------------------

    [PostgresFact]
    public async Task A_line_with_no_supplier_at_all_is_still_treated_as_a_missing_price()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var order = await OrderAsync(db, world.NoSupplierId);

        // Nothing has said this is internal, so the cautious reading holds and the gap stays visible.
        Assert.Equal(1, order.MissingPriceItemCount);
        Assert.Equal(0, order.PriceNotRequiredItemCount);
        Assert.False(order.AmountIsComplete);
    }

    // ---- E. the decision context ----------------------------------------------------------------------

    [PostgresFact]
    public async Task Internal_supply_is_its_own_cause_rather_than_an_unknown_price()
    {
        await using var db = database.CreateContext();
        var world = await ComparedWorldAsync(db);

        var context = (await new OrderDecisionContextQueries(db).GetAsync(world.JulyId, new DecisionContextQuery(), None))!;
        var decomposition = context.Decomposition!;

        var driver = decomposition.Drivers.Single(row => row.Variant.ProductVariantId == world.SwitchedVariantId);
        Assert.Equal(CauseCategory.InternalSupply, driver.Category);
        Assert.NotEqual(CauseCategory.UnattributedDueToMissingPrice, driver.Category);
        Assert.True(decomposition.ExplanationIsComplete);
        Assert.Equal(0, decomposition.UnattributedVariantCount);
        // Both of July's products come out of the store: the one that always did, and the one that switched.
        Assert.Equal(2, decomposition.InternalSupplyVariantCount);
    }

    [PostgresFact]
    public async Task The_decision_context_reports_internal_lines_apart_from_missing_ones()
    {
        await using var db = database.CreateContext();
        var world = await ComparedWorldAsync(db);

        var context = (await new OrderDecisionContextQueries(db).GetAsync(world.JulyId, new DecisionContextQuery(), None))!;

        Assert.Equal(0, context.Current.MissingPriceItemCount);
        Assert.Equal(2, context.Current.PriceNotRequiredItemCount);
        Assert.True(context.Current.IsComplete);
    }

    // ---- D. quantity analytics still work over internal supply ----------------------------------------

    [PostgresFact]
    public async Task Quantities_of_internally_supplied_material_are_still_compared()
    {
        await using var db = database.CreateContext();
        var world = await ComparedWorldAsync(db);

        var comparison = (await new OrderAnalyticsQueries(db).CompareAsync(
            world.LocationId, world.July, new ComparisonQuery(), None))!;

        var row = comparison.Rows.Items.Single(item => item.Variant.ProductVariantId == world.InternalVariantId);
        Assert.Equal(20m, row.Baseline.Quantity);
        Assert.Equal(60m, row.Current.Quantity);
        Assert.Equal(ComparisonState.Increased, row.State);
        // Real quantity, no invented money.
        Assert.Null(row.Current.KnownAmount);
        Assert.Null(row.Current.WeightedUnitPrice);
    }

    [PostgresFact]
    public async Task A_month_of_internal_supply_is_complete_rather_than_short_of_prices()
    {
        await using var db = database.CreateContext();
        var world = await ComparedWorldAsync(db);

        var comparison = (await new OrderAnalyticsQueries(db).CompareAsync(
            world.LocationId, world.July, new ComparisonQuery(), None))!;

        Assert.Equal(0, comparison.Summary.CurrentMissingPriceItemCount);
        Assert.True(comparison.Summary.CurrentPriceNotRequiredItemCount > 0);
        Assert.True(comparison.Summary.AmountIsComplete);
    }

    // ---- L. product history ---------------------------------------------------------------------------

    [PostgresFact]
    public async Task Product_history_shows_internal_supply_without_a_fabricated_zero()
    {
        await using var db = database.CreateContext();
        var world = await ComparedWorldAsync(db);

        var trend = (await new OrderAnalyticsQueries(db).GetTrendAsync(
            world.LocationId, world.InternalVariantId, new TrendQuery(), None))!;

        var july = trend.Points.Single(point => point.Period == world.July);
        Assert.Equal(60m, july.Quantity);
        // Neither a zero price nor a zero amount: there is no purchase price, and none is owed.
        Assert.Null(july.WeightedUnitPrice);
        Assert.Null(july.KnownAmount);
        Assert.Equal(0, july.MissingRequiredPriceItemCount);
        Assert.Equal(1, july.PriceNotRequiredItemCount);
    }

    // ---- J / K. the counts every screen shows ---------------------------------------------------------

    [PostgresFact]
    public async Task The_monthly_report_counts_only_the_prices_somebody_owes()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var report = await new MonthlyReportQueries(db).GetAsync(new MonthlyReportQuery(2026), None);
        var row = report.Rows.Single(item => item.LocationId == world.LocationId);

        // Four months: external unpriced, internal unpriced, internal priced, mixed, plus the no-supplier one.
        var internalMonth = row.Months[world.InternalUnpricedPeriod.Month - 1];
        Assert.Equal(0, internalMonth.MissingPriceItemCount);
        Assert.True(internalMonth.AmountIsComplete);

        var externalMonth = row.Months[world.ExternalUnpricedPeriod.Month - 1];
        Assert.Equal(1, externalMonth.MissingPriceItemCount);
        Assert.False(externalMonth.AmountIsComplete);
    }

    [PostgresFact]
    public async Task The_approval_inbox_counts_only_the_prices_somebody_owes()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var manager = await TestCurrentUser.ManagerAsync(db, "Sınaq rəhbəri");

        await SubmitAsync(db, world.InternalUnpricedId);
        await SubmitAsync(db, world.ExternalUnpricedId);

        var inbox = await new ApprovalInboxQueries(db, manager).GetAsync(
            new ApprovalInboxQuery(Search: world.LocationName), None);

        var internalRow = inbox.Rows.Items.Single(row => row.OrderRequestId == world.InternalUnpricedId);
        Assert.Equal(0, internalRow.MissingPriceItemCount);
        Assert.True(internalRow.AmountIsComplete);

        var externalRow = inbox.Rows.Items.Single(row => row.OrderRequestId == world.ExternalUnpricedId);
        Assert.Equal(1, externalRow.MissingPriceItemCount);
        Assert.False(externalRow.AmountIsComplete);
    }

    // ---- G. changing the policy -----------------------------------------------------------------------

    [PostgresFact]
    public async Task Changing_a_suppliers_policy_is_recorded_with_who_did_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");

        var service = new SupplierPricingService(db, coordinator);
        var result = await service.ChangePriceRequirementAsync(
            world.ExternalSupplierId,
            new ChangeSupplierPriceRequirementCommand(SupplierPriceRequirement.NotRequired, "Daxili anbara keçdi"),
            None);

        Assert.True(result.Changed);
        Assert.Equal(SupplierPriceRequirement.NotRequired, result.PriceRequirement);

        var decision = Assert.Single(await service.DecisionsAsync(world.ExternalSupplierId, None));
        Assert.Equal(SupplierPriceRequirement.Required, decision.PreviousRequirement);
        Assert.Equal(SupplierPriceRequirement.NotRequired, decision.NewRequirement);
        Assert.Equal("Sınaq koordinatoru", decision.ActorDisplayName);
        Assert.Equal("Daxili anbara keçdi", decision.Reason);
    }

    [PostgresFact]
    public async Task Setting_the_policy_it_already_has_records_nothing()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");

        var service = new SupplierPricingService(db, coordinator);
        var result = await service.ChangePriceRequirementAsync(
            world.ExternalSupplierId,
            new ChangeSupplierPriceRequirementCommand(SupplierPriceRequirement.Required),
            None);

        Assert.False(result.Changed);
        Assert.Null(result.Decision);
        Assert.Empty(await service.DecisionsAsync(world.ExternalSupplierId, None));
    }

    [PostgresFact]
    public async Task Changing_the_policy_changes_no_order_line()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");

        var before = await FingerprintAsync(db, world.LocationId);
        await new SupplierPricingService(db, coordinator).ChangePriceRequirementAsync(
            world.ExternalSupplierId,
            new ChangeSupplierPriceRequirementCommand(SupplierPriceRequirement.NotRequired),
            None);
        var after = await FingerprintAsync(db, world.LocationId);

        // Prices already recorded stay; prices that were absent stay absent. Only their meaning moved.
        Assert.Equal(before, after);
    }

    [PostgresFact]
    public async Task It_is_the_default_for_new_lines_and_does_not_rewrite_the_ones_already_recorded()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");

        Assert.Equal(1, (await OrderAsync(db, world.ExternalUnpricedId)).MissingPriceItemCount);

        await new SupplierPricingService(db, coordinator).ChangePriceRequirementAsync(
            world.ExternalSupplierId,
            new ChangeSupplierPriceRequirementCommand(SupplierPriceRequirement.NotRequired),
            None);

        // The supplier's setting seeds a line when it is created; it is not a rule the line keeps obeying.
        // One source can be both — Qala anbar buys through Cleanfix and issues free from the same store — so
        // a change here must not reach back and silently reclassify lines somebody already recorded. Those
        // need a decision of their own, which is what the pricing-mode review is for.
        await using var fresh = database.CreateContext();
        var order = await OrderAsync(fresh, world.ExternalUnpricedId);
        Assert.Equal(1, order.MissingPriceItemCount);
        Assert.Equal(0, order.PriceNotRequiredItemCount);
    }

    [PostgresFact]
    public async Task Somebody_who_is_not_signed_in_cannot_change_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            new SupplierPricingService(db, TestCurrentUser.Anonymous()).ChangePriceRequirementAsync(
                world.ExternalSupplierId,
                new ChangeSupplierPriceRequirementCommand(SupplierPriceRequirement.NotRequired),
                None));
    }

    [PostgresFact]
    public async Task The_supplier_list_shows_the_policy_and_the_history_behind_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var coordinator = await TestCurrentUser.CoordinatorAsync(db, "Sınaq koordinatoru");

        var list = await new SupplierPricingService(db, coordinator).ListAsync(
            new SupplierListQuery(Search: world.InternalSupplierName), None);

        var supplier = Assert.Single(list.Suppliers, item => item.SupplierId == world.InternalSupplierId);
        Assert.Equal(SupplierPriceRequirement.NotRequired, supplier.PriceRequirement);
        Assert.True(supplier.OrderLineCount > 0);
        Assert.True(supplier.UnpricedItemCount > 0);
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private static async Task<OrderWorkflowDto> OrderAsync(BaxOrdersDbContext db, long orderRequestId) =>
        (await new OrderWorkflowService(db, TestCurrentUser.Anonymous(), new PostgresOrderRequestLock(db))
            .GetAsync(orderRequestId, None))!;

    private static async Task<OrderRequest> LoadForApprovalAsync(BaxOrdersDbContext db, long orderRequestId) =>
        await db.OrderRequests
            .Include(order => order.Items)
                .ThenInclude(item => item.Supplier)
            .SingleAsync(order => order.Id == orderRequestId);

    private static async Task SubmitAsync(BaxOrdersDbContext db, long orderRequestId)
    {
        var request = await LoadForApprovalAsync(db, orderRequestId);
        request.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);
        await db.SaveChangesAsync();
    }

    private static async Task<string> FingerprintAsync(BaxOrdersDbContext db, int locationId)
    {
        var items = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.OrderRequest.LocationId == locationId)
            .OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.Quantity, item.UnitPrice, item.SupplierId })
            .ToListAsync();

        return string.Join('|', items.Select(item => $"{item.Id}:{item.Quantity}:{item.UnitPrice}:{item.SupplierId}"));
    }

    private sealed record World(
        int LocationId,
        string LocationName,
        int ExternalSupplierId,
        int InternalSupplierId,
        string InternalSupplierName,
        long ExternalUnpricedId,
        DateOnly ExternalUnpricedPeriod,
        long InternalUnpricedId,
        DateOnly InternalUnpricedPeriod,
        long InternalPricedId,
        long MixedId,
        long NoSupplierId);

    /// <summary>One location whose months each isolate a single way a price can be absent, or not.</summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var (location, variant, other) = await CatalogueAsync(db, tag);

        var external = new Supplier($"Kənar təchizatçı {tag}");
        var store = new Supplier($"Daxili anbar {tag}");
        db.Suppliers.AddRange(external, store);
        await db.SaveChangesAsync();

        // Only a person marks a supplier internal. Here that person is the fixture, doing it explicitly.
        store.ChangePriceRequirement(SupplierPriceRequirement.NotRequired);
        await db.SaveChangesAsync();

        var (january, february) = (new DateOnly(2026, 1, 1), new DateOnly(2026, 2, 1));
        var (march, april, may) = (new DateOnly(2026, 3, 1), new DateOnly(2026, 4, 1), new DateOnly(2026, 5, 1));

        var externalUnpriced = new OrderRequest(location, january);
        externalUnpriced.AddItem(variant, 10m, null, external);

        var internalUnpriced = new OrderRequest(location, february);
        internalUnpriced.AddItem(variant, 40m, null, store);

        var internalPriced = new OrderRequest(location, march);
        internalPriced.AddItem(variant, 20m, 5m, store);

        var mixed = new OrderRequest(location, april);
        mixed.AddItem(variant, 5m, 2m, external);
        mixed.AddItem(other, 5m, null, external);
        mixed.AddItem(variant, 7m, null, store);

        var noSupplier = new OrderRequest(location, may);
        noSupplier.AddItem(variant, 3m, null);

        db.OrderRequests.AddRange(externalUnpriced, internalUnpriced, internalPriced, mixed, noSupplier);
        await db.SaveChangesAsync();

        return new World(
            location.Id, location.Name, external.Id, store.Id, store.Name,
            externalUnpriced.Id, january, internalUnpriced.Id, february,
            internalPriced.Id, mixed.Id, noSupplier.Id);
    }

    private sealed record ComparedWorld(
        int LocationId, DateOnly June, DateOnly July, long JulyId, long InternalVariantId, long SwitchedVariantId);

    /// <summary>
    /// Two months with an internal product whose quantity moves, and one that changed hands from a supplier to
    /// the warehouse — the case that must not be read as a price nobody filled in.
    /// </summary>
    private static async Task<ComparedWorld> ComparedWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var (location, internalVariant, switched) = await CatalogueAsync(db, tag);

        var external = new Supplier($"Kənar {tag}");
        var store = new Supplier($"Anbar {tag}");
        db.Suppliers.AddRange(external, store);
        await db.SaveChangesAsync();

        store.ChangePriceRequirement(SupplierPriceRequirement.NotRequired);
        await db.SaveChangesAsync();

        var (june, july) = (new DateOnly(2026, 6, 1), new DateOnly(2026, 7, 1));

        var juneRequest = new OrderRequest(location, june);
        juneRequest.AddItem(internalVariant, 20m, null, store);
        juneRequest.AddItem(switched, 10m, 5m, external);

        var julyRequest = new OrderRequest(location, july);
        julyRequest.AddItem(internalVariant, 60m, null, store);
        julyRequest.AddItem(switched, 10m, null, store);

        db.OrderRequests.AddRange(juneRequest, julyRequest);
        await db.SaveChangesAsync();

        return new ComparedWorld(location.Id, june, july, julyRequest.Id, internalVariant.Id, switched.Id);
    }

    private static async Task<(Location Location, ProductVariant First, ProductVariant Second)> CatalogueAsync(
        BaxOrdersDbContext db, string tag)
    {
        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Qiymət obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var codes = new PostgresProductCodeGenerator(db);
        var first = new Product(await codes.NextAsync(None), $"Anbar malı {tag}");
        var second = new Product(await codes.NextAsync(None), $"Keçid malı {tag}");
        db.Products.AddRange(first, second);
        await db.SaveChangesAsync();

        var firstVariant = first.AddVariant(null, null, null, pieces);
        var secondVariant = second.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        return (location, firstVariant, secondVariant);
    }

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];
}
