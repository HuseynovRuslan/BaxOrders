using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Common;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The attention cards say truthfully why each one is there (Task 9).
/// </summary>
/// <remarks>
/// The audit found two cards both titled "Ən böyük məbləğ artımı", two titled "Ən böyük faiz dəyişməsi", and — on
/// "Son 3 ay" — the percentage title given to the runner-up because the object with the largest percentage
/// already had a card for its money. Each card now carries its place in its own reason's whole ordering and the
/// other orderings it leads, and these tests hold that to an ordering computed here, from the table's rows, on
/// every basis.
/// <para>
/// The section is chosen from every object of the month, so each world here orders in a month of its own — a
/// year nobody else's test uses — and the rows it is checked against are every row of that month, page by page.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class DashboardAttentionTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    /// <summary>
    /// Every basis the app offers. The hand-picked range is given as months of the world's own year, since each
    /// world lives in a year of its own.
    /// </summary>
    public static TheoryData<AnalyticsComparisonBasis, int?, int?> EveryBasis() => new()
    {
        { AnalyticsComparisonBasis.PreviousMonth, null, null },
        { AnalyticsComparisonBasis.Previous3MonthAverage, null, null },
        { AnalyticsComparisonBasis.Previous6MonthAverage, null, null },
        { AnalyticsComparisonBasis.AllPriorMonths, null, null },
        { AnalyticsComparisonBasis.CustomRange, 5, 7 },
    };

    // ---- on every basis --------------------------------------------------------------------------------

    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task Every_card_carries_its_true_place_in_its_own_ordering(
        AnalyticsComparisonBasis basis, int? fromMonth, int? toMonth)
    {
        await using var db = database.CreateContext();
        var world = await MixedWorldAsync(db);
        var query = Query(world, basis, fromMonth, toMonth);

        var dashboard = await DashboardAsync(db, world.Month, query);
        var rows = await EveryRowAsync(db, world.Month, query);
        var orderings = Orderings(rows);

        Assert.NotEmpty(dashboard.Attention);
        foreach (var card in dashboard.Attention)
        {
            var ordering = orderings[card.Reason];
            var position = ordering.FindIndex(row => row.LocationId == card.Location.LocationId) + 1;

            // Its rank is its place in the reason's whole ordering, computed here from the table.
            Assert.True(position > 0, $"{card.Location.LocationName} is not in the {card.Reason} ordering.");
            Assert.Equal(position, card.Rank);

            // And the largest figure of any other movement is named where it sits.
            Assert.Equal(
                MovementReasons.Where(reason => reason != card.Reason
                    && orderings[reason].FirstOrDefault()?.LocationId == card.Location.LocationId),
                card.AlsoFirstIn);

            // The card's figures are the object's own row, not a second computation of it.
            AssertSameRow(Assert.Single(rows, row => row.LocationId == card.Location.LocationId), card.Location);
        }
    }

    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task No_two_cards_share_a_title(
        AnalyticsComparisonBasis basis, int? fromMonth, int? toMonth)
    {
        await using var db = database.CreateContext();
        var world = await MixedWorldAsync(db);
        var dashboard = await DashboardAsync(db, world.Month, Query(world, basis, fromMonth, toMonth));
        var cards = dashboard.Attention;

        Assert.Equal(cards.Count, cards.Select(card => (card.Reason, card.Rank)).Distinct().Count());
        Assert.All(cards.Where(card => MovementReasons.Contains(card.Reason)), card => Assert.InRange(card.Rank, 1, 2));

        // A warning's title cannot rank, so it gives one card at most.
        Assert.True(cards.Count(card => card.Reason == DashboardAttentionReason.MissingRequiredPrice) <= 1);
        Assert.True(cards.Count(card => card.Reason == DashboardAttentionReason.NoComparisonHistory) <= 1);

        // Still a shortlist, and still one card per object.
        Assert.True(cards.Count <= 8);
        Assert.Equal(cards.Count, cards.Select(card => card.Location.LocationId).Distinct().Count());
    }

    /// <summary>
    /// "Ən böyük" is only ever said of the object that is, and that object is always on screen: under its own
    /// title, or named on the card it already has.
    /// </summary>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_largest_of_every_movement_is_on_screen_and_named_as_such(
        AnalyticsComparisonBasis basis, int? fromMonth, int? toMonth)
    {
        await using var db = database.CreateContext();
        var world = await MixedWorldAsync(db);
        var query = Query(world, basis, fromMonth, toMonth);
        var dashboard = await DashboardAsync(db, world.Month, query);
        var orderings = Orderings(await EveryRowAsync(db, world.Month, query));

        foreach (var reason in MovementReasons)
        {
            if (orderings[reason].Count == 0)
            {
                Assert.DoesNotContain(dashboard.Attention, card => card.Reason == reason);
                continue;
            }

            var first = orderings[reason][0].LocationId;
            Assert.Contains(dashboard.Attention, card => card.Location.LocationId == first
                && ((card.Reason == reason && card.Rank == 1) || card.AlsoFirstIn.Contains(reason)));

            // Nobody else is called the largest of it.
            Assert.DoesNotContain(dashboard.Attention, card => card.Location.LocationId != first
                && ((card.Reason == reason && card.Rank == 1) || card.AlsoFirstIn.Contains(reason)));
        }
    }

    /// <summary>
    /// Only the titles changed, not the choice: the three movements put the same objects in front of the reader as
    /// the rule before this task did — two a reason, first reason wins — rebuilt here from the rows.
    /// </summary>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task The_movements_choose_the_same_objects_as_before(
        AnalyticsComparisonBasis basis, int? fromMonth, int? toMonth)
    {
        await using var db = database.CreateContext();
        var world = await MixedWorldAsync(db);
        var query = Query(world, basis, fromMonth, toMonth);
        var dashboard = await DashboardAsync(db, world.Month, query);
        var orderings = Orderings(await EveryRowAsync(db, world.Month, query));

        // The old rule: two candidates per reason, in reason order, and an object keeps its first reason.
        var before = Enum.GetValues<DashboardAttentionReason>()
            .SelectMany(reason => orderings[reason].Take(2).Select(row => (Reason: reason, row.LocationId)))
            .GroupBy(candidate => candidate.LocationId)
            .Select(group => group.First())
            .Where(candidate => MovementReasons.Contains(candidate.Reason))
            .ToHashSet();

        var now = dashboard.Attention
            .Where(card => MovementReasons.Contains(card.Reason))
            .Select(card => (card.Reason, card.Location.LocationId))
            .ToHashSet();

        Assert.NotEmpty(now);
        Assert.Equal(before, now);
    }

    /// <summary>
    /// Task 21 (21.4): the cards come in reason order, and within a reason in their rank — "Ən böyük …" before
    /// "İkinci ən böyük …" — on every basis.
    /// </summary>
    [PostgresTheory]
    [MemberData(nameof(EveryBasis))]
    public async Task Within_every_reason_the_cards_follow_their_rank(
        AnalyticsComparisonBasis basis, int? fromMonth, int? toMonth)
    {
        await using var db = database.CreateContext();
        var world = await MixedWorldAsync(db);
        var dashboard = await DashboardAsync(db, world.Month, Query(world, basis, fromMonth, toMonth));
        var cards = dashboard.Attention.Select(card => (card.Reason, card.Rank)).ToList();

        Assert.NotEmpty(cards);
        Assert.Equal(cards.OrderBy(card => card.Reason).ThenBy(card => card.Rank), cards);
    }

    // ---- the audit's own shape ---------------------------------------------------------------------------

    /// <summary>
    /// "Son 3 ay" in the audit: Novxanı is second by money and first by percentage, so its percentage card was
    /// de-duplicated away and the runner-up, Milli Konservatoriya, was titled "Ən böyük faiz dəyişməsi".
    /// </summary>
    [PostgresFact]
    public async Task The_runner_up_says_it_is_second_and_the_largest_percentage_is_named_where_it_sits()
    {
        await using var db = database.CreateContext();
        var world = await AuditWorldAsync(db);
        var dashboard = await DashboardAsync(db, world.Month, new DashboardQuery(PageSize: ManagementDashboardQueries.MaxPageSize));

        var heyder = Assert.Single(dashboard.Attention, card => card.Location.LocationId == world.Heyder);
        var novxani = Assert.Single(dashboard.Attention, card => card.Location.LocationId == world.Novxani);
        var milli = Assert.Single(dashboard.Attention, card => card.Location.LocationId == world.Milli);

        Assert.Equal((DashboardAttentionReason.LargestIncrease, 1), (heyder.Reason, heyder.Rank));
        Assert.Empty(heyder.AlsoFirstIn);

        Assert.Equal((DashboardAttentionReason.LargestIncrease, 2), (novxani.Reason, novxani.Rank));
        Assert.Equal(new[] { DashboardAttentionReason.StrongPercentageChange }, novxani.AlsoFirstIn);

        // Milli Konservatoriya is still here, and says truthfully that it is the second.
        Assert.Equal((DashboardAttentionReason.StrongPercentageChange, 2), (milli.Reason, milli.Rank));
        Assert.Empty(milli.AlsoFirstIn);

        Assert.DoesNotContain(dashboard.Attention,
            card => card.Reason == DashboardAttentionReason.StrongPercentageChange && card.Rank == 1);
    }

    /// <summary>
    /// Task 21's fourth problem: "İkinci ən böyük faiz dəyişməsi" was shown before "Ən böyük faiz dəyişməsi". The
    /// cards were ordered by money within a reason, and the second-largest percentage here moved eight times the
    /// money of the largest. Ordered by rank, the largest comes first — and the same objects are chosen.
    /// </summary>
    [PostgresFact]
    public async Task The_largest_percentage_comes_before_the_second_whatever_money_each_moved()
    {
        await using var db = database.CreateContext();
        var world = await PercentageWorldAsync(db);
        var query = new DashboardQuery(PageSize: ManagementDashboardQueries.MaxPageSize);
        var dashboard = await DashboardAsync(db, world.Month, query);

        var percentages = dashboard.Attention
            .Where(card => card.Reason == DashboardAttentionReason.StrongPercentageChange)
            .Select(card => (card.Location.LocationId, card.Rank))
            .ToList();
        Assert.Equal(new[] { (world.Faiz1, 1), (world.Faiz2, 2) }, percentages);

        // Faiz 2 moved more money than Faiz 1, which is what used to put it first.
        var faiz1 = Assert.Single(dashboard.Attention, card => card.Location.LocationId == world.Faiz1);
        var faiz2 = Assert.Single(dashboard.Attention, card => card.Location.LocationId == world.Faiz2);
        Assert.True(Math.Abs(faiz2.Location.KnownAmountDelta!.Value) > Math.Abs(faiz1.Location.KnownAmountDelta!.Value));

        // The whole section is in reason order, then rank.
        Assert.Equal(
            new[]
            {
                (DashboardAttentionReason.LargestIncrease, 1, world.Pul1),
                (DashboardAttentionReason.LargestIncrease, 2, world.Pul2),
                (DashboardAttentionReason.StrongPercentageChange, 1, world.Faiz1),
                (DashboardAttentionReason.StrongPercentageChange, 2, world.Faiz2),
            },
            dashboard.Attention.Select(card => (card.Reason, card.Rank, card.Location.LocationId)));

        // Only the order moved: the movements choose what the rule before this task chose.
        var orderings = Orderings(await EveryRowAsync(db, world.Month, query));
        var before = Enum.GetValues<DashboardAttentionReason>()
            .SelectMany(reason => orderings[reason].Take(2).Select(row => (Reason: reason, row.LocationId)))
            .GroupBy(candidate => candidate.LocationId)
            .Select(group => group.First())
            .Where(candidate => MovementReasons.Contains(candidate.Reason))
            .ToHashSet();
        var now = dashboard.Attention
            .Where(card => MovementReasons.Contains(card.Reason))
            .Select(card => (card.Reason, card.Location.LocationId))
            .ToHashSet();
        Assert.Equal(before, now);
    }

    // ---- what the tests check against -------------------------------------------------------------------

    private static readonly DashboardAttentionReason[] MovementReasons =
    [
        DashboardAttentionReason.LargestIncrease,
        DashboardAttentionReason.LargestDecrease,
        DashboardAttentionReason.StrongPercentageChange,
    ];

    /// <summary>
    /// Each reason's whole ordering, written out again from the rows: the facts the backend is supposed to rank
    /// by, and the name for a tie. The thresholds are the percentage reason's own (50%, a 100 ₼ baseline).
    /// </summary>
    private static Dictionary<DashboardAttentionReason, List<LocationDashboardRowDto>> Orderings(
        IReadOnlyList<LocationDashboardRowDto> rows)
    {
        var moved = rows.Where(row => row.KnownAmountDelta is not null).ToList();

        return new Dictionary<DashboardAttentionReason, List<LocationDashboardRowDto>>
        {
            [DashboardAttentionReason.LargestIncrease] = [.. moved.Where(row => row.KnownAmountDelta > 0)
                .OrderByDescending(row => row.KnownAmountDelta).ThenByName(row => row.LocationName)],
            [DashboardAttentionReason.LargestDecrease] = [.. moved.Where(row => row.KnownAmountDelta < 0)
                .OrderBy(row => row.KnownAmountDelta).ThenByName(row => row.LocationName)],
            [DashboardAttentionReason.StrongPercentageChange] = [.. moved
                .Where(row => row.KnownAmountPercentChange is { } percent
                    && Math.Abs(percent) >= 50m && row.Baseline.KnownAmount >= 100m)
                .OrderByDescending(row => Math.Abs(row.KnownAmountPercentChange!.Value))
                .ThenByName(row => row.LocationName)],
            [DashboardAttentionReason.MissingRequiredPrice] = [.. rows.Where(row => row.Current.MissingPriceItemCount > 0)
                .OrderByDescending(row => row.Current.MissingPriceItemCount).ThenByName(row => row.LocationName)],
            [DashboardAttentionReason.NoComparisonHistory] = [.. rows
                .Where(row => row.ComparisonAvailability == ComparisonAvailability.NoBaselineHistory)
                .OrderByDescending(row => row.Current.KnownAmount ?? 0m).ThenByName(row => row.LocationName)],
        };
    }

    /// <summary>A row's lists are compared by content; a record would compare them by reference.</summary>
    private static void AssertSameRow(LocationDashboardRowDto expected, LocationDashboardRowDto actual)
    {
        Assert.Equal(expected.MissingBaselinePeriods, actual.MissingBaselinePeriods);
        Assert.Equal(expected.BaselinePeriods, actual.BaselinePeriods);
        Assert.Equal(expected.Causes, actual.Causes);
        Assert.Equal(
            expected with { MissingBaselinePeriods = [], BaselinePeriods = [], Causes = [] },
            actual with { MissingBaselinePeriods = [], BaselinePeriods = [], Causes = [] });
    }

    private static DashboardQuery Query(World world, AnalyticsComparisonBasis basis, int? fromMonth, int? toMonth) =>
        new(basis,
            PageSize: ManagementDashboardQueries.MaxPageSize,
            CustomStart: fromMonth is { } from ? $"{world.Month.Year}-{from:00}" : null,
            CustomEnd: toMonth is { } to ? $"{world.Month.Year}-{to:00}" : null);

    private static async Task<ManagementDashboardDto> DashboardAsync(BaxOrdersDbContext db, DateOnly month, DashboardQuery query) =>
        (await new ManagementDashboardQueries(db).GetAsync(month, query, None))!;

    /// <summary>Every row of the month, page by page: the section is chosen from all of them, not from one page.</summary>
    private static async Task<List<LocationDashboardRowDto>> EveryRowAsync(
        BaxOrdersDbContext db, DateOnly month, DashboardQuery query)
    {
        var rows = new List<LocationDashboardRowDto>();
        for (var page = 1; ; page++)
        {
            var dashboard = await DashboardAsync(db, month, query with { Page = page });
            rows.AddRange(dashboard.Rows.Items);
            if (rows.Count >= dashboard.Rows.TotalCount || dashboard.Rows.Items.Count == 0)
            {
                return rows;
            }
        }
    }

    // ---- fixture -----------------------------------------------------------------------------------------

    /// <summary>A year per world, so the month it is read in holds its objects and nobody else's orders.</summary>
    private static int lastYear = 2040;

    private static DateOnly NextMonth() => new(Interlocked.Increment(ref lastYear), 9, 1);

    private sealed record World(DateOnly Month);

    private sealed record AuditWorld(DateOnly Month, int Heyder, int Novxani, int Milli);

    private sealed record PercentageWorld(DateOnly Month, int Pul1, int Pul2, int Faiz1, int Faiz2);

    /// <summary>
    /// Rising and falling objects over several months, a large-percentage object that is also a large-money one,
    /// two objects with missing prices (one with no priced line at all), two with no baseline and one that has
    /// never ordered. The months before September differ, so each basis ranks them differently.
    /// </summary>
    private static async Task<World> MixedWorldAsync(BaxOrdersDbContext db)
    {
        var month = NextMonth();
        var orders = await OrdersAsync(db, month.Year);

        // Months 3–8, then September. Each figure is one priced line of 10 units.
        await orders.ObjectAsync("Böyük artım", [(3, 1000m), (4, 1000m), (5, 1000m), (6, 1000m), (7, 1000m), (8, 1000m), (9, 5000m)]);
        await orders.ObjectAsync("Gecikmiş artım", [(3, 500m), (4, 500m), (5, 500m), (6, 500m), (7, 500m), (8, 2000m), (9, 4500m)]);
        await orders.ObjectAsync("Kiçik artım", [(3, 500m), (8, 500m), (9, 600m)]);
        await orders.ObjectAsync("Böyük azalma", [(3, 6000m), (4, 6000m), (5, 6000m), (6, 6000m), (7, 6000m), (8, 6000m), (9, 1000m)]);
        await orders.ObjectAsync("Kiçik azalma", [(5, 3000m), (6, 2500m), (7, 3500m), (8, 3000m), (9, 2000m)]);
        await orders.ObjectAsync("Qiyməti az", [(8, 800m), (9, 900m)], missingInSeptember: 2);
        await orders.ObjectAsync("Qiyməti heç yox", [(8, 800m)], missingInSeptember: 1);
        await orders.ObjectAsync("Yanvardan bəri", [(1, 300m), (9, 700m)]);
        await orders.ObjectAsync("İlk sifariş", [(9, 250m)]);
        await orders.ObjectAsync("Heç sifariş yoxdur", []);

        await orders.SaveAsync();
        return new World(month);
    }

    /// <summary>
    /// The audit's September on "Son 3 ay", reduced to its three objects: Heydər Əliyev first by money, Novxanı
    /// second by money and first by percentage, Milli Konservatoriya second by percentage.
    /// </summary>
    private static async Task<AuditWorld> AuditWorldAsync(BaxOrdersDbContext db)
    {
        var month = NextMonth();
        var orders = await OrdersAsync(db, month.Year);

        var heyder = await orders.ObjectAsync("Heydər Əliyev", [(8, 20000m), (9, 40000m)]);   // +20.000, +100%
        var novxani = await orders.ObjectAsync("Novxanı", [(8, 2500m), (9, 12500m)]);         // +10.000, +400%
        var milli = await orders.ObjectAsync("Milli Konservatoriya", [(8, 1000m), (9, 4000m)]); // +3.000, +300%

        await orders.SaveAsync();
        return new AuditWorld(month, heyder, novxani, milli);
    }

    /// <summary>
    /// Two money objects that take both increase cards, and two percentage objects behind them: Faiz 1 has the
    /// larger percentage on a small sum, Faiz 2 the smaller percentage on eight times the money.
    /// </summary>
    private static async Task<PercentageWorld> PercentageWorldAsync(BaxOrdersDbContext db)
    {
        var month = NextMonth();
        var orders = await OrdersAsync(db, month.Year);

        var pul1 = await orders.ObjectAsync("Pul 1", [(8, 10000m), (9, 40000m)]);   // +30.000, +300%
        var pul2 = await orders.ObjectAsync("Pul 2", [(8, 10000m), (9, 30000m)]);   // +20.000, +200%
        var faiz1 = await orders.ObjectAsync("Faiz 1", [(8, 100m), (9, 600m)]);     // +500, +500%
        var faiz2 = await orders.ObjectAsync("Faiz 2", [(8, 1000m), (9, 5000m)]);   // +4.000, +400%

        await orders.SaveAsync();
        return new PercentageWorld(month, pul1, pul2, faiz1, faiz2);
    }

    private static async Task<Orders> OrdersAsync(BaxOrdersDbContext db, int year)
    {
        var tag = Guid.NewGuid().ToString("N")[..6];
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS", None);

        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Diqqət malı {tag}");
        var unpriced = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Qiymətsiz mal {tag}");
        db.Products.AddRange(product, unpriced);
        await db.SaveChangesAsync(None);

        var variant = product.AddVariant(null, null, null, pieces);
        var unpricedVariant = unpriced.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync(None);

        return new Orders(db, year, tag, variant, unpricedVariant);
    }

    /// <summary>Objects and their months, in one world's year.</summary>
    private sealed class Orders(
        BaxOrdersDbContext db, int year, string tag, ProductVariant variant, ProductVariant unpricedVariant)
    {
        private readonly PostgresLocationCodeGenerator codes = new(db);

        /// <param name="months">Each month the object ordered in, and that month's money: one line of 10 units.</param>
        /// <param name="missingInSeptember">Lines in September nobody has priced yet.</param>
        public async Task<int> ObjectAsync(string name, (int Month, decimal Amount)[] months, int missingInSeptember = 0)
        {
            var location = new Location(await codes.NextAsync(None), $"{name} {tag}");
            db.Locations.Add(location);
            await db.SaveChangesAsync(None);

            foreach (var (month, amount) in months)
            {
                var request = new OrderRequest(location, new DateOnly(year, month, 1));
                request.AddItem(variant, 10m, amount / 10m);
                if (month == 9)
                {
                    for (var index = 0; index < missingInSeptember; index++)
                    {
                        request.AddItem(unpricedVariant, 1m + index, null);
                    }
                }

                db.OrderRequests.Add(request);
            }

            // An object whose September is nothing but unpriced lines: the case a price-coverage filter misses.
            if (missingInSeptember > 0 && !months.Any(entry => entry.Month == 9))
            {
                var request = new OrderRequest(location, new DateOnly(year, 9, 1));
                for (var index = 0; index < missingInSeptember; index++)
                {
                    request.AddItem(unpricedVariant, 1m + index, null);
                }

                db.OrderRequests.Add(request);
            }

            return location.Id;
        }

        public async Task SaveAsync()
        {
            await db.SaveChangesAsync(None);
            db.ChangeTracker.Clear();
        }
    }
}
