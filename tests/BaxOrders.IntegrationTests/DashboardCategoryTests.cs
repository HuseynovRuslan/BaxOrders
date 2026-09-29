using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// What the month's money was spent on, by the catalogue's own top categories.
/// </summary>
/// <remarks>
/// A database of this class's own. The breakdown describes the whole company — like the line-type split and
/// the trend beside it, and unlike the table, it is not narrowed by the reader's search — so on the shared
/// database every other fixture's spending would land in these rows and no exact figure could be asserted.
/// The folding of the tail into one row makes that worse: a fixture's own category would not even be named.
/// </remarks>
public sealed class DashboardCategoryTests : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;
    private static readonly DateOnly July = new(2026, 7, 1);

    private IsolatedDatabase? _database;

    /// <summary>
    /// A product filed three levels down is counted under the root it hangs from. The catalogue has 105 leaves
    /// and ten roots; only one of those is a list a manager reads at a glance.
    /// </summary>
    [PostgresFact]
    public async Task Spending_is_counted_under_the_root_of_the_category_tree()
    {
        await using var db = _database!.CreateContext();
        var world = await WorldAsync(db);

        var green = (await CategoriesAsync(db)).Single(row => row.CategoryId == world.GreenRootId);

        // Two products, filed under two different leaves of the same root: 200 + 100.
        Assert.Equal(300m, green.KnownAmount);
        Assert.Equal(2, green.ItemCount);
        Assert.Equal(1, green.CategoryCount);
        Assert.Equal(DashboardCategoryKind.Category, green.Kind);
        Assert.Equal("Yaşıllıq", green.Name);
    }

    /// <summary>
    /// The categories come largest first, so the bar and the list read in the same order. The two rows that are
    /// not categories keep their own places regardless of size — the remainder after them, and what nobody
    /// filed last of all — because neither is competing for a rank among the kinds of thing.
    /// </summary>
    [PostgresFact]
    public async Task The_categories_are_ordered_by_the_money_they_carry()
    {
        await using var db = _database!.CreateContext();
        await WorldAsync(db);

        var rows = await CategoriesAsync(db);
        var named = rows.Where(row => row.Kind == DashboardCategoryKind.Category)
            .Select(row => row.KnownAmount ?? 0m)
            .ToList();

        Assert.Equal([300m, 60m, 50m, 20m], named);
        Assert.Equal(DashboardCategoryKind.Other, rows[^2].Kind);
        Assert.Equal(DashboardCategoryKind.Uncategorised, rows[^1].Kind);
    }

    /// <summary>
    /// A product nobody has filed is its own row and is never folded into «Digər»: "other kinds of thing" and
    /// "no kind recorded" are different statements, and only one of them is a gap somebody can close.
    /// </summary>
    [PostgresFact]
    public async Task A_product_with_no_category_is_its_own_row()
    {
        await using var db = _database!.CreateContext();
        await WorldAsync(db);

        var rows = await CategoriesAsync(db);
        var unfiled = rows.Single(row => row.Kind == DashboardCategoryKind.Uncategorised);

        Assert.Equal(40m, unfiled.KnownAmount);
        Assert.Null(unfiled.CategoryId);
        Assert.Equal(ManagementDashboardQueries.UncategorisedName, unfiled.Name);
        // Last, whatever it is worth: it is not a category competing for a place among them.
        Assert.Equal(rows[^1], unfiled);
    }

    /// <summary>
    /// Past the few it names, the rest is one row that says how many categories it stands for. Without it the
    /// breakdown would not add up to the month, and a breakdown that does not add up is not one.
    /// </summary>
    [PostgresFact]
    public async Task Everything_past_the_named_few_is_folded_into_one_row_that_counts_itself()
    {
        await using var db = _database!.CreateContext();
        await WorldAsync(db);

        var other = (await CategoriesAsync(db)).Single(row => row.Kind == DashboardCategoryKind.Other);

        // Six roots carry planned money; four are named, so two are folded: 15 + 10.
        Assert.Equal(25m, other.KnownAmount);
        Assert.Equal(2, other.CategoryCount);
        Assert.Null(other.CategoryId);
    }

    /// <summary>
    /// The rows add up to the month's own figure. Every amount on this screen is rounded once per group, so a
    /// reader who adds the breakdown lands on the number at the top of the page rather than a qəpik away.
    /// </summary>
    [PostgresFact]
    public async Task The_rows_add_up_to_the_months_figure()
    {
        await using var db = _database!.CreateContext();
        await WorldAsync(db);

        var summary = await SummaryAsync(db, AnalyticsScope.Monthly);

        Assert.Equal(
            summary.Current.KnownAmount,
            summary.Categories.Sum(row => row.KnownAmount ?? 0m));
    }

    /// <summary>
    /// The breakdown follows the scope, like every other figure the screen carries. Asked about planned
    /// material it says what the plan was spent on; asked about off-plan spending, what that was spent on.
    /// </summary>
    [PostgresFact]
    public async Task The_breakdown_answers_about_the_scope_it_was_asked_for()
    {
        await using var db = _database!.CreateContext();
        var world = await WorldAsync(db);

        var monthly = await CategoriesAsync(db, AnalyticsScope.Monthly);
        var outside = await CategoriesAsync(db, AnalyticsScope.OutsideMonthly);
        var all = await CategoriesAsync(db, AnalyticsScope.All);

        Assert.Equal(300m, monthly.Single(row => row.CategoryId == world.GreenRootId).KnownAmount);

        // The one off-plan line of the month is a pump, filed under «Fontan» — so that is the whole answer.
        Assert.Equal(900m, Assert.Single(outside).KnownAmount);
        Assert.Equal(world.FountainRootId, outside[0].CategoryId);

        // And the factual total carries every line, the unclassified one included.
        Assert.Equal(
            (await SummaryAsync(db, AnalyticsScope.All)).Current.KnownAmount,
            all.Sum(row => row.KnownAmount ?? 0m));
    }

    /// <summary>A month nobody ordered in has no breakdown at all, rather than a row of zeroes.</summary>
    [PostgresFact]
    public async Task A_scope_with_no_lines_at_all_answers_with_an_empty_breakdown()
    {
        await using var db = _database!.CreateContext();
        var world = await WorldAsync(db);

        // June holds only planned material in this fixture, so asked about off-plan spending it holds nothing.
        var june = (await new ManagementDashboardQueries(db).GetAsync(
            new DateOnly(2026, 6, 1),
            new DashboardQuery(PageSize: 100, Scope: AnalyticsScope.OutsideMonthly),
            None))!.Summary;

        Assert.Empty(june.Categories);
        Assert.True(world.GreenRootId > 0);
    }

    // ---- the world -------------------------------------------------------------------------------------

    private sealed record World(int GreenRootId, int FountainRootId);

    private Task<IReadOnlyList<DashboardCategoryDto>> CategoriesAsync(
        BaxOrdersDbContext db, AnalyticsScope scope = AnalyticsScope.Monthly) =>
        SummaryAsync(db, scope).ContinueWith(task => task.Result.Categories, TaskScheduler.Default);

    private static async Task<ManagementDashboardSummaryDto> SummaryAsync(
        BaxOrdersDbContext db, AnalyticsScope scope) =>
        (await new ManagementDashboardQueries(db).GetAsync(
            July, new DashboardQuery(PageSize: 100, Scope: scope), None))!.Summary;

    /// <summary>
    /// One location, July, and seven roots carrying money: 300 · 900 · 60 · 50 · 20 · 15 · 10, plus 40 of
    /// product nobody filed. June exists so the month has something to be compared against.
    /// </summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var codes = new PostgresProductCodeGenerator(db);

        var location = new Location(await new PostgresLocationCodeGenerator(db).NextAsync(None), "Kateqoriya obyekti");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        async Task<Category> RootAsync(string name)
        {
            var root = Category.CreateRoot(name);
            db.Categories.Add(root);
            await db.SaveChangesAsync();
            return root;
        }

        // Three levels deep, exactly as the real catalogue is filed.
        async Task<ProductVariant> VariantAsync(string name, Category? leaf)
        {
            var product = new Product(await codes.NextAsync(None), name, leaf);
            db.Products.Add(product);
            await db.SaveChangesAsync();
            var variant = product.AddVariant(null, null, null, pieces);
            await db.SaveChangesAsync();
            return variant;
        }

        var green = await RootAsync("Yaşıllıq");
        var greenMiddle = green.AddChild("Bitki");
        await db.SaveChangesAsync();
        var flowers = greenMiddle.AddChild("Mövsümi çiçək");
        var seedlings = greenMiddle.AddChild("Ting");
        await db.SaveChangesAsync();

        var fountain = await RootAsync("Fontan");
        var cleaning = await RootAsync("Təmizlik");
        var clothing = await RootAsync("Geyim");
        var office = await RootAsync("Ofis");
        var electrics = await RootAsync("Elektrik");
        var transport = await RootAsync("Nəqliyyat");

        var flower = await VariantAsync("Petuniya", flowers);
        var seedling = await VariantAsync("Şam tingi", seedlings);
        var pump = await VariantAsync("Su nasosu", fountain);
        var broom = await VariantAsync("Süpürgə", cleaning);
        var gloves = await VariantAsync("Əlcək", clothing);
        var paper = await VariantAsync("Kağız", office);
        var cable = await VariantAsync("Kabel", electrics);
        var tyre = await VariantAsync("Təkər", transport);
        var unfiled = await VariantAsync("Təsnif edilməmiş mal", null);

        var june = new OrderRequest(location, new DateOnly(2026, 6, 1));
        june.AddItem(flower, 10m, 10m);

        var july = new OrderRequest(location, July);
        july.AddItem(flower, 10m, 20m);      // Yaşıllıq — 200
        july.AddItem(seedling, 10m, 10m);    // Yaşıllıq — 100, a second leaf of the same root
        july.AddItem(broom, 10m, 6m);        // Təmizlik — 60
        july.AddItem(gloves, 10m, 5m);       // Geyim — 50
        july.AddItem(paper, 10m, 2m);        // Ofis — 20, folded
        july.AddItem(cable, 10m, 1m);        // Elektrik — 10, folded
        july.AddItem(tyre, 10m, 1.5m);       // Nəqliyyat — 15, folded
        july.AddItem(unfiled, 10m, 4m);      // filed under nothing — 40
        july.AddItem(pump, 1m, 900m, orderLineType: OrderLineType.OutsideMonthly);  // Fontan, off-plan

        db.OrderRequests.AddRange(june, july);
        await db.SaveChangesAsync();

        return new World(green.Id, fountain.Id);
    }

    public async Task InitializeAsync()
    {
        if (PostgresDatabaseFixture.IsConfigured)
        {
            _database = await IsolatedDatabase.CreateAsync("baxorders_category");
        }
    }

    public async Task DisposeAsync()
    {
        if (_database is not null)
        {
            await _database.DisposeAsync();
        }
    }
}
