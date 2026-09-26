using System.Text.Json;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Catalog.ProductMatches;
using BaxOrders.Application.Decisions;
using BaxOrders.Application.Reports;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Task 13c against a real PostgreSQL: once an administrator approves "Sabun elano lavanda ətirli" as a variant of
/// "Sabun elano", Heydər Əliyev's September order tells the switch as one "Variant dəyişib" line in "Niyə dəyişib?"
/// (13.1a) — and no amount, no product count and no other screen moves, before, after or after the undo.
/// </summary>
/// <remarks>
/// Each test builds a database of its own and drops it afterwards: an approval must be a current suggestion, and the
/// suggestion rule reads the whole catalogue, so a product another test left behind would change what it finds.
/// Every approval goes through <see cref="ProductMatchService"/> as the administrator, as it does on the Products page.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class VariantTransitionAnalyticsTests : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;

    private static readonly AnalyticsComparisonBasis[] Bases =
    [
        AnalyticsComparisonBasis.PreviousMonth,
        AnalyticsComparisonBasis.Previous3MonthAverage,
        AnalyticsComparisonBasis.Previous6MonthAverage,
        AnalyticsComparisonBasis.AllPriorMonths,
    ];

    private IsolatedDatabase? _database;

    // ---- acceptance 3: the brief's example ---------------------------------------------------------------

    /// <summary>
    /// Criterion 1, acceptance 3: after the approval, on every standard basis, one "Variant dəyişib" line for "Sabun
    /// elano" of 0.00 (750.00 − 750.00); "Yeni məhsullar" and "Bu ay yazılmayan məhsullar" are each 750.00 smaller.
    /// </summary>
    [PostgresFact]
    public async Task After_approval_Heyder_Aliyev_September_has_one_variant_change_line_for_Sabun_elano_at_nothing()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);

        foreach (var basis in Bases)
        {
            var before = await ContextAsync(db, fixture.SeptemberOrderId, basis);
            Assert.Empty(before.Decomposition!.VariantTransitions);
            Assert.Equal((750.00m, 1), Cause(before, CauseCategory.NewOrders));
            Assert.Equal((-750.00m, 1), Cause(before, CauseCategory.NoLongerOrdered));
            Assert.DoesNotContain(before.Decomposition.Categories, cause => cause.Category == CauseCategory.VariantChange);
        }

        await ApproveSabunAsync(Service(db, await TestCurrentUser.AdminAsync(db)), fixture);

        foreach (var basis in Bases)
        {
            var context = await ContextAsync(db, fixture.SeptemberOrderId, basis);
            Assert.Equal((750.00m, 750.00m, 0.00m), (context.Current.KnownAmount, context.Primary.BaselineKnownAmount, context.Primary.DeltaAmount));

            var transition = Assert.Single(context.Decomposition!.VariantTransitions);
            Assert.Equal((fixture.Product("Sabun elano"), "Sabun elano"), (transition.BaseProductId, transition.BaseProductName));
            Assert.Equal(
                [(fixture.Variant("Sabun elano"), fixture.Product("Sabun elano"), "Sabun elano", (string?)null)],
                transition.From.Select(Side));
            Assert.Equal(
                [(fixture.Variant("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano lavanda ətirli"), "Sabun elano lavanda ətirli", (string?)"lavanda ətirli")],
                transition.To.Select(Side));
            Assert.Equal((0.00m, 750.00m, 750.00m), (transition.AmountImpact, transition.BaselineKnownAmount, transition.CurrentKnownAmount));

            // Each 750.00 smaller: +750.00 → 0.00 and −750.00 → 0.00. The line is there at 0.00 too.
            Assert.Equal((0.00m, 0), Cause(context, CauseCategory.NewOrders));
            Assert.Equal((0.00m, 0), Cause(context, CauseCategory.NoLongerOrdered));
            Assert.Equal((0.00m, 2), Cause(context, CauseCategory.VariantChange));
            Assert.Equal(context.Primary.DeltaAmount, context.Decomposition.Categories.Sum(cause => cause.Amount));
        }
    }

    /// <summary>
    /// Criterion 6, 13.1: the two products stay two. Each keeps its own row, state, figures and history; only the row's
    /// category says where its money is told. The product counts, the dashboard's state counts and the comparison
    /// endpoint are as they were.
    /// </summary>
    [PostgresFact]
    public async Task After_approval_the_two_products_are_still_two_products_everywhere()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var hem = await HemAsync(db);

        var before = await ContextAsync(db, fixture.SeptemberOrderId);
        var rowBefore = await DashboardRowAsync(db, hem);
        await ApproveSabunAsync(Service(db, await TestCurrentUser.AdminAsync(db)), fixture);
        var after = await ContextAsync(db, fixture.SeptemberOrderId);
        var rowAfter = await DashboardRowAsync(db, hem);

        Assert.Equal(
            [
                ("Sabun elano", ComparisonState.NoLongerOrdered, -750.00m, CauseCategory.VariantChange),
                ("Sabun elano lavanda ətirli", ComparisonState.New, 750.00m, CauseCategory.VariantChange),
            ],
            after.Decomposition!.Drivers
                .Select(driver => (driver.Variant.ProductName, driver.State, driver.AmountImpact, driver.Category))
                .OrderBy(driver => driver.ProductName, StringComparer.Ordinal));
        Assert.Equal(
            before.Decomposition!.Drivers.Select(driver => driver with { Category = CauseCategory.VariantChange }).OrderBy(driver => driver.Variant.ProductVariantId).Select(Json),
            after.Decomposition.Drivers.OrderBy(driver => driver.Variant.ProductVariantId).Select(Json));
        Assert.Equal(before.Decomposition.Products, after.Decomposition.Products);
        Assert.Equal((1, 1), (after.Decomposition.Products.NewCount, after.Decomposition.Products.NoLongerOrderedCount));

        Assert.Equal((1, 1), (rowAfter.NewVariantCount, rowAfter.NoLongerOrderedVariantCount));
        Assert.Equal(
            (rowBefore.NewVariantCount, rowBefore.NoLongerOrderedVariantCount, rowBefore.IncreasedVariantCount, rowBefore.DecreasedVariantCount, rowBefore.ComparedVariantCount),
            (rowAfter.NewVariantCount, rowAfter.NoLongerOrderedVariantCount, rowAfter.IncreasedVariantCount, rowAfter.DecreasedVariantCount, rowAfter.ComparedVariantCount));

        var comparison = (await new OrderAnalyticsQueries(db).CompareAsync(hem, ProductMatchFixture.September, new ComparisonQuery(), None))!;
        Assert.Equal(
            [("Sabun elano", ComparisonState.NoLongerOrdered), ("Sabun elano lavanda ətirli", ComparisonState.New)],
            comparison.Rows.Items.Select(item => (item.Variant.ProductName, item.State)).OrderBy(item => item.ProductName, StringComparer.Ordinal));

        foreach (var name in new[] { "Sabun elano", "Sabun elano lavanda ətirli" })
        {
            var history = (await new OrderAnalyticsQueries(db).GetTrendAsync(hem, fixture.Variant(name), new TrendQuery(), None))!;
            Assert.Equal((fixture.Variant(name), name), (history.Variant.ProductVariantId, history.Variant.ProductName));
        }
    }

    // ---- acceptance 4: separate until approved ----------------------------------------------------------

    /// <summary>
    /// Criterion 4, acceptance 4: before the approval, after a rejection, after the rejection's undo and after an undone
    /// approval there is no line and no "Variant dəyişib" at all — every response is the one before.
    /// </summary>
    [PostgresFact]
    public async Task Before_approval_after_a_rejection_and_after_an_undone_approval_there_is_no_line()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var service = Service(db, await TestCurrentUser.AdminAsync(db));

        var before = await HemResponsesAsync(db, fixture);
        foreach (var basis in Bases)
        {
            AssertNoLine(await ContextAsync(db, fixture.SeptemberOrderId, basis));
        }

        var rejected = await service.RejectAsync(
            new RejectProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano")), None);
        Assert.Equal(before, await HemResponsesAsync(db, fixture));
        AssertNoLine(await ContextAsync(db, fixture.SeptemberOrderId));

        await service.UndoAsync(rejected.Id, new UndoProductMatchCommand(), None);
        Assert.Equal(before, await HemResponsesAsync(db, fixture));

        var approved = await ApproveSabunAsync(service, fixture);
        Assert.NotEqual(before, await HemResponsesAsync(db, fixture));

        await service.UndoAsync(approved, new UndoProductMatchCommand("səhv təsdiq"), None);
        Assert.Equal(before, await HemResponsesAsync(db, fixture));
        AssertNoLine(await ContextAsync(db, fixture.SeptemberOrderId));
    }

    // ---- acceptance 7 and 8: no amount moves, and the undo restores -------------------------------------

    /// <summary>
    /// Criterion 5, acceptance 7, on the brief's example: every money figure, every count, the comparison endpoint, both
    /// histories and the 2026 monthly report are identical before the approval, after it and after its undo.
    /// </summary>
    [PostgresFact]
    public async Task No_amount_moves_on_the_briefs_example_before_approval_after_it_and_after_its_undo()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var service = Service(db, await TestCurrentUser.AdminAsync(db));
        var hem = await HemAsync(db);
        long[] histories = [fixture.Variant("Sabun elano"), fixture.Variant("Sabun elano lavanda ətirli")];

        var before = await MoneyAsync(db, fixture.SeptemberOrderId, hem, ProductMatchFixture.September, histories);
        var approved = await ApproveSabunAsync(service, fixture);
        var afterApproval = await MoneyAsync(db, fixture.SeptemberOrderId, hem, ProductMatchFixture.September, histories);
        await service.UndoAsync(approved, new UndoProductMatchCommand(), None);
        var afterUndo = await MoneyAsync(db, fixture.SeptemberOrderId, hem, ProductMatchFixture.September, histories);

        Assert.Equal(before, afterApproval);
        Assert.Equal(before, afterUndo);
    }

    /// <summary>
    /// Criterion 7, acceptance 8: undoing the variant approval restores the decision contexts, the dashboard, the
    /// comparison, both histories and the monthly report, byte for byte.
    /// </summary>
    [PostgresFact]
    public async Task Undoing_the_variant_approval_restores_every_response_byte_for_byte()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var service = Service(db, await TestCurrentUser.AdminAsync(db));

        var before = await EveryResponseAsync(db, fixture);
        var approved = await ApproveSabunAsync(service, fixture);
        var afterApproval = await EveryResponseAsync(db, fixture);
        await service.UndoAsync(approved, new UndoProductMatchCommand("səhv təsdiq"), None);
        var afterUndo = await EveryResponseAsync(db, fixture);

        Assert.NotEqual(before, afterApproval);
        Assert.Equal(before, afterUndo);
    }

    // ---- criterion 2: a transition that moved money -------------------------------------------------------

    /// <summary>
    /// Criterion 2: "Sabun elano" 60 × 12.50 in August, "Sabun elano lavanda ətirli" 70 × 12.50 in September. One
    /// transition of +125.00, the primary cause; the dashboard card names the base with +125.00 and counts the transition
    /// as one effect (7.1a). No amount moves.
    /// </summary>
    [PostgresFact]
    public async Task A_transition_that_moved_money_is_the_primary_cause_and_the_card_names_the_base()
    {
        await using var db = _database!.CreateContext();
        var family = await FamilyFixture.CreateAsync(db, 70m, 12.50m);
        var service = Service(db, await TestCurrentUser.AdminAsync(db));

        var rowBefore = await DashboardRowAsync(db, family.LocationId);
        Assert.Equal((CauseCategory.NewOrders, 875.00m), (rowBefore.PrimaryCause, rowBefore.PrimaryCauseAmount));
        Assert.Equal(("Sabun elano lavanda ətirli", 875.00m, 875.00m), (rowBefore.PrimaryCauseProduct!.ProductName, rowBefore.PrimaryCauseProduct.Amount, rowBefore.PrimaryCauseProduct.SameDirectionAmount));

        var moneyBefore = await MoneyAsync(db, family.SeptemberOrderId, family.LocationId, ProductMatchFixture.September, [family.Base, family.Variant]);
        var approved = await service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.Variant, family.VariantProduct, family.BaseProduct), None);
        var moneyAfter = await MoneyAsync(db, family.SeptemberOrderId, family.LocationId, ProductMatchFixture.September, [family.Base, family.Variant]);

        foreach (var basis in Bases)
        {
            var context = await ContextAsync(db, family.SeptemberOrderId, basis);
            Assert.Equal((875.00m, 750.00m, 125.00m), (context.Current.KnownAmount, context.Primary.BaselineKnownAmount, context.Primary.DeltaAmount));

            var transition = Assert.Single(context.Decomposition!.VariantTransitions);
            Assert.Equal(("Sabun elano", 125.00m, 750.00m, 875.00m), (transition.BaseProductName, transition.AmountImpact, transition.BaselineKnownAmount, transition.CurrentKnownAmount));
            Assert.Equal([(string?)null], transition.From.Select(side => side.VariantLabel));
            Assert.Equal([(string?)"lavanda ətirli"], transition.To.Select(side => side.VariantLabel));

            Assert.Equal((125.00m, 2), Cause(context, CauseCategory.VariantChange));
            Assert.Equal(
                [(CauseCategory.VariantChange, 125.00m)],
                context.Decomposition.Categories.Where(cause => cause.Amount != 0m).Select(cause => (cause.Category, cause.Amount)));
            // Never split: the members are different items (13.1).
            Assert.All(context.Decomposition.Drivers, driver => Assert.Null(driver.QuantityImpact));
        }

        var row = await DashboardRowAsync(db, family.LocationId);
        Assert.Equal((CauseCategory.VariantChange, 125.00m), (row.PrimaryCause, row.PrimaryCauseAmount));
        Assert.Equal([(CauseCategory.VariantChange, 125.00m, 2)], row.Causes.Select(cause => (cause.Category, cause.Amount, cause.VariantCount)));
        Assert.Equal(
            (family.Variant, "Sabun elano", 125.00m, 125.00m),
            (row.PrimaryCauseProduct!.ProductVariantId, row.PrimaryCauseProduct.ProductName, row.PrimaryCauseProduct.Amount, row.PrimaryCauseProduct.SameDirectionAmount));

        // Criterion 5 on this fixture too, and the undo.
        Assert.Equal(moneyBefore, moneyAfter);
        await service.UndoAsync(approved.Id, new UndoProductMatchCommand(), None);
        Assert.Equal(moneyBefore, await MoneyAsync(db, family.SeptemberOrderId, family.LocationId, ProductMatchFixture.September, [family.Base, family.Variant]));
        Assert.Equal(CauseCategory.NewOrders, (await DashboardRowAsync(db, family.LocationId)).PrimaryCause);
    }

    // ---- criterion 8: Task 2's price states ----------------------------------------------------------------

    /// <summary>
    /// Criterion 8: the variant arrives owing a price. No transition: the line would hide the missing price. The
    /// unattributed money, the incomplete explanation and the order's missing-price count are exactly as without the link.
    /// </summary>
    [PostgresFact]
    public async Task An_arriving_member_owing_a_price_makes_no_transition_and_hides_nothing()
    {
        await using var db = _database!.CreateContext();
        var family = await FamilyFixture.CreateAsync(db, 60m, null);
        var service = Service(db, await TestCurrentUser.AdminAsync(db));

        var before = await AllBasesAsync(db, family.SeptemberOrderId);
        await service.ApproveAsync(new ApproveProductMatchCommand(ProductMatchKind.Variant, family.VariantProduct, family.BaseProduct), None);
        var after = await AllBasesAsync(db, family.SeptemberOrderId);

        Assert.Equal(before, after);

        var context = await ContextAsync(db, family.SeptemberOrderId);
        AssertNoLine(context);
        Assert.False(context.Decomposition!.ExplanationIsComplete);
        Assert.Equal((1, 1), (context.Current.MissingPriceItemCount, context.Decomposition.UnattributedVariantCount));
        Assert.Equal(
            [("Sabun elano", CauseCategory.NoLongerOrdered), ("Sabun elano lavanda ətirli", CauseCategory.UnattributedDueToMissingPrice)],
            context.Decomposition.Drivers.Select(driver => (driver.Variant.ProductName, driver.Category)).OrderBy(driver => driver.ProductName, StringComparer.Ordinal));

        var row = await DashboardRowAsync(db, family.LocationId);
        Assert.Equal((1, false), (row.Current.MissingPriceItemCount, row.ExplanationIsComplete));
        Assert.DoesNotContain(row.Causes, cause => cause.Category == CauseCategory.VariantChange);
    }

    /// <summary>Criterion 8: a member supplied from the company's own store stays "Daxili təminat". No transition.</summary>
    [PostgresFact]
    public async Task An_arriving_member_from_the_company_s_own_store_makes_no_transition()
    {
        await using var db = _database!.CreateContext();
        var family = await FamilyFixture.CreateAsync(db, 60m, null, fromStore: true);
        var service = Service(db, await TestCurrentUser.AdminAsync(db));

        var before = await AllBasesAsync(db, family.SeptemberOrderId);
        await service.ApproveAsync(new ApproveProductMatchCommand(ProductMatchKind.Variant, family.VariantProduct, family.BaseProduct), None);
        var after = await AllBasesAsync(db, family.SeptemberOrderId);

        Assert.Equal(before, after);

        var context = await ContextAsync(db, family.SeptemberOrderId);
        AssertNoLine(context);
        Assert.True(context.Decomposition!.ExplanationIsComplete);
        Assert.Equal((0, 1), (context.Current.MissingPriceItemCount, context.Current.PriceNotRequiredItemCount));
        Assert.Equal(
            CauseCategory.InternalSupply,
            context.Decomposition.Drivers.Single(driver => driver.Variant.ProductVariantId == family.Variant).Category);
    }

    // ---- spellings first, then the family --------------------------------------------------------------------

    /// <summary>
    /// Criterion 3 through the real services (13b report §7.1): the link is approved on "Sabun elano lavanda ətirli",
    /// whose September line is then folded into another spelling, "Sabun elano lavandaətirli", which has no link of its
    /// own. The kept spelling still carries the family, so September is one transition from the base to it.
    /// </summary>
    [PostgresFact]
    public async Task A_link_on_a_spelling_folded_away_still_makes_the_transition_for_the_kept_spelling()
    {
        await using var db = _database!.CreateContext();
        var family = await FamilyFixture.CreateAsync(db, 60m, 12.50m, otherSpelling: "Sabun elano lavandaətirli");
        var service = Service(db, await TestCurrentUser.AdminAsync(db));

        // A spelling match regroups products (13b), so what is compared here is every total, not the rows.
        var totalsBefore = await TotalsAsync(db, family.SeptemberOrderId, ProductMatchFixture.September);
        await service.ApproveAsync(new ApproveProductMatchCommand(ProductMatchKind.Variant, family.VariantProduct, family.BaseProduct), None);
        await service.ApproveAsync(new ApproveProductMatchCommand(ProductMatchKind.SameItem, family.Variant, family.OtherSpelling), None);

        // The one query reads the same spelling fold the spelling-only read does.
        var matches = await ApprovedMatches.ReadAsync(db, None);
        var spelling = await SpellingFold.ReadAsync(db, None);
        foreach (var variantId in await db.ProductVariants.AsNoTracking().Select(variant => variant.Id).ToListAsync())
        {
            Assert.Equal(spelling.CanonicalOf(variantId), matches.Spelling.CanonicalOf(variantId));
            Assert.Equal(spelling.MembersOf(variantId), matches.Spelling.MembersOf(variantId));
        }

        Assert.Equal(family.OtherSpelling, matches.Spelling.CanonicalOf(family.Variant));
        Assert.False(matches.Families.IsEmpty);

        foreach (var basis in Bases)
        {
            var context = await ContextAsync(db, family.SeptemberOrderId, basis);
            var transition = Assert.Single(context.Decomposition!.VariantTransitions);
            Assert.Equal(("Sabun elano", 0.00m), (transition.BaseProductName, transition.AmountImpact));
            Assert.Equal([(family.Base, (string?)null)], transition.From.Select(side => (side.ProductVariantId, side.VariantLabel)));
            Assert.Equal(
                [(family.OtherSpelling, "Sabun elano lavandaətirli", (string?)"lavanda ətirli")],
                transition.To.Select(side => (side.ProductVariantId, side.ProductName, side.VariantLabel)));
            Assert.Equal((0.00m, 2), Cause(context, CauseCategory.VariantChange));
        }

        Assert.Equal(totalsBefore, await TotalsAsync(db, family.SeptemberOrderId, ProductMatchFixture.September));
    }

    // ---- criterion 9: the query counts -------------------------------------------------------------------

    /// <summary>
    /// Criterion 9: with live decisions of both kinds in the database, both kinds are still one query. The decision
    /// context runs six, the dashboard seven — one of them the month's classification split (Task 22) — and eight
    /// for "every prior month".
    /// </summary>
    [PostgresFact]
    public async Task With_both_kinds_of_decision_live_the_query_counts_do_not_change()
    {
        await using (var db = _database!.CreateContext())
        {
            var fixture = await ProductMatchFixture.CreateAsync(db);
            var service = Service(db, await TestCurrentUser.AdminAsync(db));
            await ApproveSabunAsync(service, fixture);
            await service.ApproveAsync(
                new ApproveProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Lampa 15 W"), fixture.Variant("Lampa 15W")), None);

            var context = await CountAsync(counted => new OrderDecisionContextQueries(counted).GetAsync(fixture.SeptemberOrderId, new DecisionContextQuery(), None));
            var dashboard = await CountAsync(counted => new ManagementDashboardQueries(counted).GetAsync(ProductMatchFixture.September, new DashboardQuery(), None));
            var everyPriorMonth = await CountAsync(counted => new ManagementDashboardQueries(counted).GetAsync(
                ProductMatchFixture.September, new DashboardQuery(AnalyticsComparisonBasis.AllPriorMonths), None));

            Assert.Equal((6, 7, 8), (context, dashboard, everyPriorMonth));
        }
    }

    public async Task InitializeAsync()
    {
        if (PostgresDatabaseFixture.IsConfigured)
        {
            _database = await IsolatedDatabase.CreateAsync("baxorders_variant");
        }
    }

    public async Task DisposeAsync()
    {
        if (_database is not null)
        {
            await _database.DisposeAsync();
        }
    }

    // ---- helpers -------------------------------------------------------------------------------------------

    private static ProductMatchService Service(BaxOrdersDbContext db, ICurrentUserContext user) =>
        new(db, user, new PostgresProductMatchLock(db));

    /// <summary>The brief's link, approved as the administrator would: the suggestion's own label. Returns the decision.</summary>
    private static async Task<long> ApproveSabunAsync(ProductMatchService service, ProductMatchFixture fixture) =>
        (await service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano")), None)).Id;

    private static Task<int> HemAsync(BaxOrdersDbContext db) =>
        db.Locations.AsNoTracking().Where(location => location.Code == "HEM").Select(location => location.Id).SingleAsync();

    private static async Task<OrderDecisionContextDto> ContextAsync(
        BaxOrdersDbContext db, long orderId, AnalyticsComparisonBasis basis = AnalyticsComparisonBasis.PreviousMonth) =>
        (await new OrderDecisionContextQueries(db).GetAsync(orderId, new DecisionContextQuery(basis), None))!;

    private static async Task<LocationDashboardRowDto> DashboardRowAsync(BaxOrdersDbContext db, int locationId)
    {
        var dashboard = await new ManagementDashboardQueries(db).GetAsync(
            ProductMatchFixture.September, new DashboardQuery(PageSize: ManagementDashboardQueries.MaxPageSize), None);
        return dashboard!.Rows.Items.Single(row => row.LocationId == locationId);
    }

    private static (decimal Amount, int Count) Cause(OrderDecisionContextDto context, CauseCategory category)
    {
        var cause = context.Decomposition!.Categories.Single(item => item.Category == category);
        return (cause.Amount, cause.VariantCount);
    }

    private static (long, long, string, string?) Side(DecisionVariantSideDto side) =>
        (side.ProductVariantId, side.ProductId, side.ProductName, side.VariantLabel);

    private static void AssertNoLine(OrderDecisionContextDto context)
    {
        Assert.Empty(context.Decomposition!.VariantTransitions);
        Assert.DoesNotContain(context.Decomposition.Categories, cause => cause.Category == CauseCategory.VariantChange);
        Assert.DoesNotContain(context.Decomposition.Drivers, driver => driver.Category == CauseCategory.VariantChange);
    }

    private static string Json(object? value) => JsonSerializer.Serialize(value);

    /// <summary>The queries one read runs, on a connection of its own to this test's database.</summary>
    private async Task<int> CountAsync(Func<BaxOrdersDbContext, Task> read)
    {
        var counter = new CountingCommandInterceptor();
        await using var counted = new BaxOrdersDbContext(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(_database!.ConnectionString)
            .AddInterceptors(counter)
            .Options);
        await read(counted);
        return counter.Count;
    }

    /// <summary>Heydər Əliyev's September order page and the September dashboard, whole, on every basis.</summary>
    private static async Task<string> HemResponsesAsync(BaxOrdersDbContext db, ProductMatchFixture fixture)
    {
        var pieces = new List<object?>();
        foreach (var basis in Bases)
        {
            pieces.Add(await new OrderDecisionContextQueries(db).GetAsync(fixture.SeptemberOrderId, new DecisionContextQuery(basis), None));
            pieces.Add(await new ManagementDashboardQueries(db).GetAsync(ProductMatchFixture.September, new DashboardQuery(basis, PageSize: ManagementDashboardQueries.MaxPageSize), None));
        }

        return Json(pieces);
    }

    /// <summary>The order page on every basis, whole — for a fixture with one order to read.</summary>
    private static async Task<string> AllBasesAsync(BaxOrdersDbContext db, long orderId)
    {
        var pieces = new List<object?>();
        foreach (var basis in Bases)
        {
            pieces.Add(await new OrderDecisionContextQueries(db).GetAsync(orderId, new DecisionContextQuery(basis), None));
            pieces.Add(await new ManagementDashboardQueries(db).GetAsync(ProductMatchFixture.September, new DashboardQuery(basis, PageSize: ManagementDashboardQueries.MaxPageSize), None));
        }

        return Json(pieces);
    }

    /// <summary>
    /// Every analytics response of the brief's example, whole, as the screens receive them: Heydər Əliyev's September
    /// order page, the dashboard and the comparison on every basis, both products' histories and the monthly report.
    /// </summary>
    private static async Task<string> EveryResponseAsync(BaxOrdersDbContext db, ProductMatchFixture fixture)
    {
        var hem = await HemAsync(db);
        var pieces = new List<object?>();
        foreach (var basis in Bases)
        {
            pieces.Add(await new OrderDecisionContextQueries(db).GetAsync(fixture.SeptemberOrderId, new DecisionContextQuery(basis), None));
            pieces.Add(await new ManagementDashboardQueries(db).GetAsync(ProductMatchFixture.September, new DashboardQuery(basis, PageSize: ManagementDashboardQueries.MaxPageSize), None));
            pieces.Add(await new OrderAnalyticsQueries(db).CompareAsync(hem, ProductMatchFixture.September, new ComparisonQuery(basis), None));
        }

        pieces.Add(await new OrderAnalyticsQueries(db).GetTrendAsync(hem, fixture.Variant("Sabun elano"), new TrendQuery(), None));
        pieces.Add(await new OrderAnalyticsQueries(db).GetTrendAsync(hem, fixture.Variant("Sabun elano lavanda ətirli"), new TrendQuery(), None));
        pieces.Add(await new MonthlyReportQueries(db).GetAsync(new MonthlyReportQuery(2026), None));
        return Json(pieces);
    }

    /// <summary>
    /// Everything a variant link must not move (§7 of the specification), on every basis: the order page's money, counts
    /// and each driver's own figures without its category; the dashboard's summary and every object's money and product
    /// counts; the comparison endpoint and the product histories, whole; and the monthly report. What may differ — the
    /// split between causes, a driver's category, the transitions and the card's cause — is left out, and the causes are
    /// checked to add up to the difference instead.
    /// </summary>
    private static async Task<string> MoneyAsync(
        BaxOrdersDbContext db, long orderId, int locationId, DateOnly period, long[] histories)
    {
        var pieces = new List<object?>();
        foreach (var basis in Bases)
        {
            var context = (await new OrderDecisionContextQueries(db).GetAsync(orderId, new DecisionContextQuery(basis), None))!;
            pieces.Add(new { context.Current, context.Primary, context.Secondary });
            if (context.Decomposition is { } decomposition)
            {
                if (context.Primary.DeltaAmount is { } delta)
                {
                    Assert.Equal(delta, decomposition.TotalAmountImpact);
                    Assert.Equal(delta, decomposition.Categories.Sum(category => category.Amount));
                }

                pieces.Add(new
                {
                    decomposition.TotalAmountImpact,
                    decomposition.ExplanationIsComplete,
                    decomposition.UnattributedVariantCount,
                    decomposition.InternalSupplyVariantCount,
                    decomposition.SupplyChangedVariantCount,
                    decomposition.Products,
                    Drivers = decomposition.Drivers.OrderBy(driver => driver.Variant.ProductVariantId)
                        .Select(driver => driver with { Category = default }),
                    Steady = decomposition.Steady.Select(driver => driver with { Category = default }),
                });
            }

            var dashboard = (await new ManagementDashboardQueries(db).GetAsync(
                period, new DashboardQuery(basis, PageSize: ManagementDashboardQueries.MaxPageSize), None))!;
            pieces.Add(dashboard.Summary);
            pieces.AddRange(dashboard.Rows.Items.Select(row => new
            {
                row.LocationId,
                row.Current,
                row.Baseline,
                row.KnownAmountDelta,
                row.KnownAmountPercentChange,
                row.NewVariantCount,
                row.IncreasedVariantCount,
                row.DecreasedVariantCount,
                row.UnchangedVariantCount,
                row.NoLongerOrderedVariantCount,
                row.InsufficientHistoryVariantCount,
                row.ComparedVariantCount,
                row.ExplanationIsComplete,
                row.SupplyChangedVariantCount,
                Causes = row.Causes.Sum(cause => cause.Amount),
            }));

            pieces.Add(await new OrderAnalyticsQueries(db).CompareAsync(locationId, period, new ComparisonQuery(basis), None));
        }

        foreach (var variantId in histories)
        {
            pieces.Add(await new OrderAnalyticsQueries(db).GetTrendAsync(locationId, variantId, new TrendQuery(), None));
        }

        pieces.Add(await new MonthlyReportQueries(db).GetAsync(new MonthlyReportQuery(2026), None));
        return Json(pieces);
    }

    /// <summary>
    /// Every total that no approval of either kind may move, on every basis — the order's money, the dashboard's summary
    /// and every object's money, and the monthly report — with the causes checked to add up to the difference. Unlike
    /// <see cref="MoneyAsync"/> it leaves out the rows, which an approved spelling match regroups.
    /// </summary>
    private static async Task<string> TotalsAsync(BaxOrdersDbContext db, long orderId, DateOnly period)
    {
        var pieces = new List<object?>();
        foreach (var basis in Bases)
        {
            var context = (await new OrderDecisionContextQueries(db).GetAsync(orderId, new DecisionContextQuery(basis), None))!;
            pieces.Add(new { context.Current, context.Primary, context.Secondary, context.Decomposition?.TotalAmountImpact });
            if (context.Decomposition is { } decomposition && context.Primary.DeltaAmount is { } delta)
            {
                Assert.Equal(delta, decomposition.Categories.Sum(category => category.Amount));
            }

            var dashboard = (await new ManagementDashboardQueries(db).GetAsync(
                period, new DashboardQuery(basis, PageSize: ManagementDashboardQueries.MaxPageSize), None))!;
            pieces.Add(new
            {
                dashboard.Summary.Current,
                dashboard.Summary.ComparedCurrent,
                dashboard.Summary.Baseline,
                dashboard.Summary.KnownAmountDelta,
                dashboard.Summary.KnownAmountPercentChange,
                dashboard.Summary.Partition,
                dashboard.Summary.LocationsWithMissingPrices,
            });
            pieces.AddRange(dashboard.Rows.Items.Select(row => new
            {
                row.LocationId, row.Current, row.Baseline, row.KnownAmountDelta, row.KnownAmountPercentChange,
                Causes = row.Causes.Sum(cause => cause.Amount),
            }));
        }

        pieces.Add(await new MonthlyReportQueries(db).GetAsync(new MonthlyReportQuery(2026), None));
        return Json(pieces);
    }

    /// <summary>
    /// The brief's pair in a database of its own, at Heydər Əliyev: "Sabun elano" 60 × 12.50 in August, and "Sabun elano
    /// lavanda ətirli" in September in whatever quantity, price and supply a test needs. With
    /// <c>otherSpelling</c>, that name is the September line instead, and "Sabun elano lavanda ətirli" is ordered 5 ×
    /// 12.50 at another object in July, so the two spellings are a current suggestion.
    /// </summary>
    private sealed class FamilyFixture
    {
        public int LocationId { get; private set; }

        public long SeptemberOrderId { get; private set; }

        public long BaseProduct { get; private set; }

        public long VariantProduct { get; private set; }

        /// <summary>"Sabun elano"'s variant.</summary>
        public long Base { get; private set; }

        /// <summary>"Sabun elano lavanda ətirli"'s variant.</summary>
        public long Variant { get; private set; }

        /// <summary>The other spelling's variant, when there is one.</summary>
        public long OtherSpelling { get; private set; }

        public static async Task<FamilyFixture> CreateAsync(
            BaxOrdersDbContext db, decimal septemberQuantity, decimal? septemberPrice, bool fromStore = false, string? otherSpelling = null)
        {
            var fixture = new FamilyFixture();
            var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");

            async Task<ProductVariant> AddAsync(string name)
            {
                var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(CancellationToken.None), name);
                db.Products.Add(product);
                await db.SaveChangesAsync();
                var variant = product.AddVariant(null, null, null, pieces);
                await db.SaveChangesAsync();
                return variant;
            }

            var sabun = await AddAsync("Sabun elano");
            var lavanda = await AddAsync("Sabun elano lavanda ətirli");
            var other = otherSpelling is null ? null : await AddAsync(otherSpelling);

            Supplier? store = null;
            if (fromStore)
            {
                store = new Supplier("Anbar 13c");
                db.Suppliers.Add(store);
                await db.SaveChangesAsync();
                store.ChangePriceRequirement(SupplierPriceRequirement.NotRequired);
                await db.SaveChangesAsync();
            }

            var hem = await db.Locations.SingleAsync(location => location.Code == "HEM");

            var august = new OrderRequest(hem, ProductMatchFixture.August);
            august.AddItem(sabun, 60m, 12.50m);
            var september = new OrderRequest(hem, ProductMatchFixture.September);
            september.AddItem(lavanda, septemberQuantity, septemberPrice, store);
            db.OrderRequests.AddRange(august, september);

            if (other is not null)
            {
                var elsewhere = new Location(await new PostgresLocationCodeGenerator(db).NextAsync(CancellationToken.None), "Sınaq obyekti 13c");
                db.Locations.Add(elsewhere);
                await db.SaveChangesAsync();

                var july = new OrderRequest(elsewhere, new DateOnly(2026, 7, 1));
                july.AddItem(other, 5m, 12.50m);
                db.OrderRequests.Add(july);
            }

            await db.SaveChangesAsync();

            fixture.LocationId = hem.Id;
            fixture.SeptemberOrderId = september.Id;
            fixture.BaseProduct = sabun.ProductId;
            fixture.VariantProduct = lavanda.ProductId;
            fixture.Base = sabun.Id;
            fixture.Variant = lavanda.Id;
            fixture.OtherSpelling = other?.Id ?? 0;

            db.ChangeTracker.Clear();
            return fixture;
        }
    }

    private sealed class CountingCommandInterceptor : DbCommandInterceptor
    {
        public int Count { get; private set; }

        public override InterceptionResult<System.Data.Common.DbDataReader> ReaderExecuting(
            System.Data.Common.DbCommand command, CommandEventData eventData,
            InterceptionResult<System.Data.Common.DbDataReader> result)
        {
            Count++;
            return base.ReaderExecuting(command, eventData, result);
        }

        public override ValueTask<InterceptionResult<System.Data.Common.DbDataReader>> ReaderExecutingAsync(
            System.Data.Common.DbCommand command, CommandEventData eventData,
            InterceptionResult<System.Data.Common.DbDataReader> result, CancellationToken cancellationToken = default)
        {
            Count++;
            return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
        }
    }
}
