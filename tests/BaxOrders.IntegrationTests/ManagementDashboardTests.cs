using System.Net;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Common;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The company's month across every location, against a real SQL Server. Each test builds its own locations
/// and filters the dashboard down to them, because the database is shared with every other test in the suite.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class ManagementDashboardTests(PostgresDatabaseFixture database)
{
    // ---- periods -------------------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_period_list_names_every_month_the_company_ordered_in()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var periods = await Queries(db).GetPeriodsAsync(CancellationToken.None);
        var july = Assert.Single(periods.Periods, period => period.Period == world.July);

        // Shared database: this world's locations are a subset of the month's, never more than it.
        Assert.True(july.LocationCount >= 3);
        Assert.True(july.RequestCount >= 3);
        Assert.Equal(periods.Periods.OrderByDescending(period => period.Period).Select(period => period.Period),
            periods.Periods.Select(period => period.Period));
    }

    // ---- the three distinct situations ----------------------------------------------------------------

    [PostgresFact]
    public async Task A_location_with_this_month_and_the_one_before_is_compared()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.SteadyId);

        Assert.True(row.HasCurrentRequest);
        Assert.Equal(HistoryCoverageState.Complete, row.HistoryCoverage);
        Assert.Equal(ComparisonAvailability.Available, row.ComparisonAvailability);
        Assert.True(row.ComparisonAvailable);
        Assert.Equal(world.SteadyJulyRequestId, row.CurrentRequestId);
    }

    [PostgresFact]
    public async Task A_location_with_this_month_but_no_month_before_is_not_a_shop_full_of_new_products()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        // The real EXPO shape: July exists, June does not.
        var row = await RowAsync(db, world, world.NoHistoryId);

        Assert.True(row.HasCurrentRequest);
        Assert.Equal(HistoryCoverageState.Unavailable, row.HistoryCoverage);
        Assert.Equal(ComparisonAvailability.NoBaselineHistory, row.ComparisonAvailability);
        Assert.False(row.ComparisonAvailable);
        Assert.Equal(0, row.NewVariantCount);
        Assert.Equal([world.June], row.MissingBaselinePeriods);
        Assert.Null(row.Baseline.KnownAmount);
    }

    [PostgresFact]
    public async Task A_location_that_ordered_before_but_not_this_month_says_so_instead_of_showing_zero()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.DormantId);

        Assert.False(row.HasCurrentRequest);
        Assert.Equal(ComparisonAvailability.NoCurrentRequest, row.ComparisonAvailability);
        Assert.False(row.ComparisonAvailable);

        // Not an order of nothing: the money is unknown, not zero, and no product state is invented.
        Assert.Null(row.Current.KnownAmount);
        Assert.Equal(0, row.Current.ItemCount);
        Assert.Null(row.CurrentRequestId);
        Assert.Null(row.CurrentPriceCoverage);
        Assert.Equal(0, row.ComparedVariantCount);

        // Its history is still real and still reported.
        Assert.Equal(HistoryCoverageState.Complete, row.HistoryCoverage);
        Assert.Equal(200m, row.Baseline.KnownAmount);
    }

    [PostgresFact]
    public async Task The_three_situations_are_three_different_answers()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var dashboard = await DashboardAsync(db, world);

        var states = dashboard.Rows.Items.ToDictionary(row => row.LocationId, row => row.ComparisonAvailability);

        Assert.Equal(ComparisonAvailability.Available, states[world.SteadyId]);
        Assert.Equal(ComparisonAvailability.NoBaselineHistory, states[world.NoHistoryId]);
        Assert.Equal(ComparisonAvailability.NoCurrentRequest, states[world.DormantId]);
    }

    // ---- history coverage ----------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_three_month_window_reports_the_months_the_location_never_ordered_in()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var partial = await RowAsync(db, world, world.PartialId, AnalyticsComparisonBasis.Previous3MonthAverage);

        // April, May and June were asked for; this location has April and May only.
        Assert.Equal((3, 2), (partial.ExpectedBaselinePeriodCount, partial.AvailableBaselinePeriodCount));
        Assert.Equal(HistoryCoverageState.Partial, partial.HistoryCoverage);
        Assert.Equal([world.June], partial.MissingBaselinePeriods);
        Assert.True(partial.ComparisonAvailable);
    }

    [PostgresFact]
    public async Task A_six_month_window_counts_the_months_that_exist()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.SteadyId, AnalyticsComparisonBasis.Previous6MonthAverage);

        // January to June were asked for; this location ordered in June only.
        Assert.Equal(6, row.ExpectedBaselinePeriodCount);
        Assert.Equal(1, row.AvailableBaselinePeriodCount);
        Assert.Equal(HistoryCoverageState.Partial, row.HistoryCoverage);
        Assert.Equal(5, row.MissingBaselinePeriods.Count);
        Assert.DoesNotContain(world.July, row.MissingBaselinePeriods);
    }

    [PostgresFact]
    public async Task Only_the_highest_version_of_a_month_contributes()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.VersionedId);
        var baseline = Assert.Single(row.BaselinePeriods);

        // June exists twice: version 1 spent 100, version 2 spent 400. 500 would be both added together.
        Assert.Equal(2, baseline.Version);
        Assert.Equal(world.VersionedJuneV2Id, baseline.OrderRequestId);
        Assert.Equal(400m, row.Baseline.KnownAmount);
    }

    // ---- money ---------------------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_location_amount_is_the_money_of_its_priced_lines()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.SteadyId);
        var expected = await db.OrderRequestItems
            .Where(item => item.OrderRequestId == world.SteadyJulyRequestId && item.UnitPrice != null)
            .SumAsync(item => item.Quantity * item.UnitPrice!.Value);

        Assert.Equal(expected, row.Current.KnownAmount);
        Assert.Equal(200m, row.Baseline.KnownAmount);
        Assert.Equal(row.Current.KnownAmount - 200m, row.KnownAmountDelta);
    }

    [PostgresFact]
    public async Task A_baseline_of_several_months_is_the_money_of_an_average_month()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.PartialId, AnalyticsComparisonBasis.Previous3MonthAverage);

        // 300 in April and 100 in May, over the two months that exist: 200, not 400 and not 133.33.
        Assert.Equal(200m, row.Baseline.KnownAmount);
    }

    [PostgresFact]
    public async Task A_line_with_no_price_leaves_the_amount_known_but_incomplete()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.UnpricedId);

        Assert.False(row.Current.IsComplete);
        Assert.Equal(1, row.Current.MissingPriceItemCount);
        Assert.Equal(PriceCoverageState.Partial, row.CurrentPriceCoverage);
        Assert.Equal(50m, row.Current.KnownAmount);
    }

    // ---- services ------------------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_service_counts_towards_money_but_never_towards_a_quantity_state()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.ServiceId);

        Assert.Equal(1, row.AmountOrientedServiceCount);
        Assert.Equal(300m, row.Current.KnownAmount);
        Assert.Equal(0, row.IncreasedVariantCount);
        Assert.Equal(0, row.DecreasedVariantCount);
        Assert.Equal(1, row.NotComparableVariantCount);
    }

    // ---- agreement with the location screen ----------------------------------------------------------

    [PostgresFact]
    public async Task A_dashboard_row_says_the_same_as_the_location_comparison_it_links_to()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        foreach (var basis in new[] { AnalyticsComparisonBasis.PreviousMonth, AnalyticsComparisonBasis.Previous3MonthAverage })
        {
            var row = await RowAsync(db, world, world.PartialId, basis);
            var comparison = await new OrderAnalyticsQueries(db).CompareAsync(
                world.PartialId, world.July, new ComparisonQuery(basis, PageSize: 200), CancellationToken.None);

            Assert.NotNull(comparison);
            var summary = comparison!.Summary;

            Assert.Equal(summary.CurrentKnownAmountTotal, row.Current.KnownAmount);
            Assert.Equal(summary.BaselineKnownAmountTotal, row.Baseline.KnownAmount);
            Assert.Equal(summary.KnownAmountDelta, row.KnownAmountDelta);
            Assert.Equal(summary.KnownAmountPercentChange, row.KnownAmountPercentChange);
            Assert.Equal(summary.AvailableBaselinePeriodCount, row.AvailableBaselinePeriodCount);
            Assert.Equal(summary.ExpectedBaselinePeriodCount, row.ExpectedBaselinePeriodCount);
            Assert.Equal(summary.MissingBaselinePeriods, row.MissingBaselinePeriods);
            Assert.Equal(summary.NewVariantCount, row.NewVariantCount);
            Assert.Equal(summary.IncreasedVariantCount, row.IncreasedVariantCount);
            Assert.Equal(summary.DecreasedVariantCount, row.DecreasedVariantCount);
            Assert.Equal(summary.UnchangedVariantCount, row.UnchangedVariantCount);
            Assert.Equal(summary.NoLongerOrderedVariantCount, row.NoLongerOrderedVariantCount);
            Assert.Equal(summary.AmountOrientedServiceCount, row.AmountOrientedServiceCount);
            Assert.Equal(summary.TotalVariantCount, row.ComparedVariantCount);
            Assert.Equal(summary.CurrentItemCount, row.Current.ItemCount);
            Assert.Equal(summary.CurrentMissingPriceItemCount, row.Current.MissingPriceItemCount);
        }
    }

    // ---- filters, search, sorting, paging -------------------------------------------------------------

    [PostgresFact]
    public async Task Rows_can_be_searched_by_location_name_and_code()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var byName = await DashboardAsync(db, world, new DashboardQuery(Search: world.SteadyName));
        var byCode = await DashboardAsync(db, world, new DashboardQuery(Search: world.SteadyCode));

        Assert.Equal(world.SteadyId, Assert.Single(byName.Rows.Items).LocationId);
        Assert.Equal(world.SteadyId, Assert.Single(byCode.Rows.Items).LocationId);
    }

    [PostgresFact]
    public async Task Rows_can_be_filtered_by_history_coverage()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var unavailable = await DashboardAsync(db, world, new DashboardQuery(HistoryCoverage: HistoryCoverageState.Unavailable));
        var complete = await DashboardAsync(db, world, new DashboardQuery(HistoryCoverage: HistoryCoverageState.Complete));

        // Two of this world's locations have no June: the one with no history at all, and the one whose
        // window has a hole exactly where the previous month would be.
        Assert.All(unavailable.Rows.Items, row => Assert.Equal(HistoryCoverageState.Unavailable, row.HistoryCoverage));
        Assert.Contains(unavailable.Rows.Items, row => row.LocationId == world.NoHistoryId);
        Assert.Contains(unavailable.Rows.Items, row => row.LocationId == world.PartialId);
        Assert.All(complete.Rows.Items, row => Assert.Equal(HistoryCoverageState.Complete, row.HistoryCoverage));
        Assert.DoesNotContain(complete.Rows.Items, row => row.LocationId == world.NoHistoryId);
    }

    [PostgresFact]
    public async Task Rows_can_be_filtered_to_the_locations_that_did_not_order_this_month()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var without = await DashboardAsync(db, world, new DashboardQuery(HasCurrentRequest: false));
        var with = await DashboardAsync(db, world, new DashboardQuery(HasCurrentRequest: true));

        Assert.Equal(world.DormantId, Assert.Single(without.Rows.Items).LocationId);
        Assert.All(with.Rows.Items, row => Assert.True(row.HasCurrentRequest));
    }

    [PostgresFact]
    public async Task Rows_can_be_filtered_by_the_price_coverage_of_the_current_month()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var partial = await DashboardAsync(db, world, new DashboardQuery(PriceCoverage: PriceCoverageState.Partial));

        Assert.Equal(world.UnpricedId, Assert.Single(partial.Rows.Items).LocationId);
    }

    // ---- the chips' filters (Task 9) --------------------------------------------------------------------

    /// <summary>
    /// "Qiymət yoxdur · 10 obyekt" opens those ten objects and no others. The price-coverage filter the old
    /// select used could not: an object whose every owed line is unpriced has no partial coverage — it has none —
    /// so it was counted by the chip and missing from the rows.
    /// </summary>
    [PostgresFact]
    public async Task The_missing_price_filter_leaves_exactly_the_objects_the_chip_counts()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var nothingPriced = await NothingPricedAsync(db, world);

        var ours = await DashboardAsync(db, world, new DashboardQuery(MissingPrice: true));
        Assert.Equal(
            new[] { world.UnpricedId, nothingPriced }.Order(),
            ours.Rows.Items.Select(row => row.LocationId).Order());

        // The whole company: the rows it leaves are the rows with an owed price missing, and there are as many
        // of them as the summary counts.
        var every = await EveryRowAsync(db, world.July, new DashboardQuery());
        var filtered = await EveryRowAsync(db, world.July, new DashboardQuery(MissingPrice: true));
        var summary = (await Queries(db).GetAsync(world.July, new DashboardQuery(MissingPrice: true), CancellationToken.None))!;

        Assert.Equal(
            every.Where(row => row.HasCurrentRequest && row.Current.MissingPriceItemCount > 0)
                .Select(row => row.LocationId).Order(),
            filtered.Select(row => row.LocationId).Order());
        Assert.Equal(summary.Summary.LocationsWithMissingPrices, summary.FilteredLocationCount);
        Assert.Equal(summary.Summary.LocationsWithMissingPrices, filtered.Count);

        // And the case the old filter missed, stated as a test.
        var partial = await DashboardAsync(db, world, new DashboardQuery(PriceCoverage: PriceCoverageState.Partial));
        Assert.DoesNotContain(partial.Rows.Items, row => row.LocationId == nothingPriced);
    }

    /// <summary>
    /// Each group chip opens exactly the objects the partition names under it — the same rule, decided once —
    /// and the four together are every object of the month.
    /// </summary>
    [PostgresFact]
    public async Task Each_group_filter_leaves_exactly_that_groups_members()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var summary = (await Queries(db).GetAsync(world.July, new DashboardQuery(), CancellationToken.None))!.Summary;

        var members = new Dictionary<PortfolioGroup, IReadOnlyList<DashboardPartitionMemberDto>>
        {
            [PortfolioGroup.Compared] = summary.Partition.Compared,
            [PortfolioGroup.NoOrderThisMonth] = summary.Partition.NoOrderThisMonth,
            [PortfolioGroup.NoBaseline] = summary.Partition.NoBaseline,
            [PortfolioGroup.NoHistory] = summary.Partition.NoHistory,
        };

        var total = 0;
        foreach (var (group, expected) in members)
        {
            var rows = await EveryRowAsync(db, world.July, new DashboardQuery(Group: group));

            Assert.Equal(expected.Select(member => member.LocationId).Order(), rows.Select(row => row.LocationId).Order());
            total += rows.Count;
        }

        Assert.Equal(summary.LocationCount, total);

        // This world's objects land where their months put them.
        var noBaseline = await DashboardAsync(db, world, new DashboardQuery(Group: PortfolioGroup.NoBaseline));
        Assert.Contains(noBaseline.Rows.Items, row => row.LocationId == world.PartialId);
        var noOrder = await DashboardAsync(db, world, new DashboardQuery(Group: PortfolioGroup.NoOrderThisMonth));
        Assert.Equal(world.DormantId, Assert.Single(noOrder.Rows.Items).LocationId);
    }

    /// <summary>
    /// The page opens on the size of the change: a fall of 8.000 ₼ is a bigger change than a rise of 5.000 ₼,
    /// whichever way it went. A row with no change to measure goes last in both directions, by name.
    /// </summary>
    [PostgresFact]
    public async Task Rows_sort_by_the_size_of_the_change_whichever_way_it_went()
    {
        await using var db = database.CreateContext();
        var world = await SizeWorldAsync(db);

        var largest = await Queries(db).GetAsync(world.July, new DashboardQuery(
            Search: world.Tag, Sort: DashboardSort.AbsoluteKnownAmountDelta, Descending: true, PageSize: 100), CancellationToken.None);
        var smallest = await Queries(db).GetAsync(world.July, new DashboardQuery(
            Search: world.Tag, Sort: DashboardSort.AbsoluteKnownAmountDelta, Descending: false, PageSize: 100), CancellationToken.None);

        Assert.Equal(
            [world.Fell8000, world.Rose5000, world.Rose10, world.NoBaseline, world.NoOrder],
            largest!.Rows.Items.Select(row => row.LocationId));
        Assert.Equal(
            [world.Rose10, world.Rose5000, world.Fell8000, world.NoBaseline, world.NoOrder],
            smallest!.Rows.Items.Select(row => row.LocationId));

        // The signed sort keeps its meaning for the links that already use it.
        var signed = await Queries(db).GetAsync(world.July, new DashboardQuery(
            Search: world.Tag, Sort: DashboardSort.KnownAmountDelta, Descending: true, PageSize: 100), CancellationToken.None);
        Assert.Equal(
            [world.Rose5000, world.Rose10, world.Fell8000, world.NoBaseline, world.NoOrder],
            signed!.Rows.Items.Select(row => row.LocationId));
    }

    /// <summary>A group the API does not know is refused like every other enum, not quietly ignored.</summary>
    [PostgresFact]
    public async Task A_group_the_api_does_not_know_is_refused()
    {
        await using (var db = database.CreateContext())
        {
            await WorldAsync(db);
        }

        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:BaxOrders", PostgresDatabaseFixture.ConnectionString);
        });

        var manager = await AuthenticatedApi.CreateUserAsync(factory, BaxOrdersRoles.Manager, "Panel rəhbəri");
        using var client = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(client, manager.UserName, manager.Password);

        Assert.Equal(HttpStatusCode.OK,
            (await client.GetAsync("/api/v1/dashboard?period=2026-07&group=NoBaseline&missingPrice=true")).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await client.GetAsync("/api/v1/dashboard?period=2026-07&sort=AbsoluteKnownAmountDelta&descending=true")).StatusCode);

        foreach (var group in new[] { "99", "Nonsense" })
        {
            var response = await client.GetAsync($"/api/v1/dashboard?period=2026-07&group={group}");
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }

    [PostgresFact]
    public async Task Rows_sort_by_name_by_default_and_by_money_when_asked()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var byName = await DashboardAsync(db, world);
        var byAmount = await DashboardAsync(db, world, new DashboardQuery(Sort: DashboardSort.CurrentKnownAmount, Descending: true));

        // In the Azerbaijani alphabet (Task 3, B6): "Xidmətli" follows the h-words and comes before the q-words.
        Assert.Equal(
            byName.Rows.Items.Select(row => row.LocationName).OrderBy(name => name, AzerbaijaniCollation.Comparer),
            byName.Rows.Items.Select(row => row.LocationName));

        var amounts = byAmount.Rows.Items.Where(row => row.Current.KnownAmount is not null)
            .Select(row => row.Current.KnownAmount!.Value).ToList();
        Assert.Equal(amounts.OrderByDescending(amount => amount), amounts);
    }

    [PostgresFact]
    public async Task A_row_with_no_figure_to_sort_by_goes_last_in_both_directions()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        // The dormant location has no current money at all; a missing number is not a small one.
        foreach (var descending in new[] { false, true })
        {
            var sorted = await DashboardAsync(db, world,
                new DashboardQuery(Sort: DashboardSort.CurrentKnownAmount, Descending: descending));

            Assert.Equal(world.DormantId, sorted.Rows.Items[^1].LocationId);
            Assert.Null(sorted.Rows.Items[^1].Current.KnownAmount);
        }
    }

    [PostgresFact]
    public async Task Rows_are_paged_and_the_page_size_is_capped()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var first = await DashboardAsync(db, world, new DashboardQuery(Page: 1, PageSize: 2));
        var second = await DashboardAsync(db, world, new DashboardQuery(Page: 2, PageSize: 2));
        var capped = await DashboardAsync(db, world, new DashboardQuery(PageSize: 9999));

        Assert.Equal(2, first.Rows.Items.Count);
        Assert.Empty(first.Rows.Items.Select(row => row.LocationId)
            .Intersect(second.Rows.Items.Select(row => row.LocationId)));
        Assert.Equal(ManagementDashboardQueries.MaxPageSize, capped.Rows.PageSize);
    }

    [PostgresFact]
    public async Task The_summary_describes_the_whole_company_whatever_the_filter_or_the_page()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var everything = await Queries(db).GetAsync(world.July, new DashboardQuery(PageSize: 100), CancellationToken.None);
        var onePage = await Queries(db).GetAsync(world.July, new DashboardQuery(PageSize: 1), CancellationToken.None);
        var filtered = await Queries(db).GetAsync(
            world.July, new DashboardQuery(HasCurrentRequest: false, PageSize: 100), CancellationToken.None);

        // The summary is the company's month; only the row count follows the filter. Its window of months
        // and its partition are compared on their own: a list inside a record is compared by reference, so
        // leaving either in would make every one of these pass or fail for the wrong reason.
        var blank = new DashboardPartitionDto(0, 0, [], [], [], []);

        void AssertSameSummary(ManagementDashboardSummaryDto expected, ManagementDashboardSummaryDto actual)
        {
            Assert.Equal(expected.BaselinePeriods, actual.BaselinePeriods);
            Assert.Equal(expected.Partition.LocationCount, actual.Partition.LocationCount);
            Assert.Equal(expected.Partition.ComparableLocationCount, actual.Partition.ComparableLocationCount);
            Assert.Equal(expected.Partition.Compared, actual.Partition.Compared);
            Assert.Equal(expected.Partition.NoOrderThisMonth, actual.Partition.NoOrderThisMonth);
            Assert.Equal(expected.Partition.NoBaseline, actual.Partition.NoBaseline);
            Assert.Equal(expected.Partition.NoHistory, actual.Partition.NoHistory);
            Assert.Equal(
                expected with { BaselinePeriods = [], Partition = blank },
                actual with { BaselinePeriods = [], Partition = blank });
        }

        AssertSameSummary(everything!.Summary, onePage!.Summary);
        AssertSameSummary(everything.Summary, filtered!.Summary);
        Assert.Equal(everything.FilteredLocationCount, everything.Rows.TotalCount);
        Assert.True(filtered.FilteredLocationCount < everything.FilteredLocationCount);
        Assert.Equal(everything.Summary.LocationsWithoutCurrentRequest, filtered.FilteredLocationCount);
    }

    [PostgresFact]
    public async Task The_summary_counts_history_coverage_and_missing_prices()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var summary = (await Queries(db).GetAsync(world.July, new DashboardQuery(PageSize: 100), CancellationToken.None))!.Summary;

        // Every bucket describes the company, so the three history buckets account for every location and the
        // two request buckets do the same.
        Assert.Equal(
            summary.LocationCount,
            summary.LocationsWithCompleteHistory + summary.LocationsWithPartialHistory + summary.LocationsWithNoBaselineHistory);
        Assert.Equal(
            summary.LocationCount,
            summary.LocationsWithCurrentRequest + summary.LocationsWithoutCurrentRequest);
        Assert.Equal(summary.LocationsWithCurrentRequest, summary.CurrentRequestCount);
        Assert.True(summary.LocationsWithComparison <= summary.LocationsWithCurrentRequest);

        // This world alone puts an unpriced line and a location without a current request into the company.
        Assert.True(summary.LocationsWithMissingPrices >= 1);
        Assert.True(summary.LocationsWithoutCurrentRequest >= 1);
        Assert.False(summary.Current.IsComplete);
    }

    // ---- shape of the answer --------------------------------------------------------------------------

    [PostgresFact]
    public async Task Every_row_carries_what_is_needed_to_open_its_own_comparison()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var dashboard = await DashboardAsync(db, world, new DashboardQuery(Basis: AnalyticsComparisonBasis.Previous3MonthAverage));

        Assert.All(dashboard.Rows.Items, row =>
        {
            Assert.Equal(world.July, row.DeepLinkPeriod);
            Assert.Equal(AnalyticsComparisonBasis.Previous3MonthAverage, row.DeepLinkBasis);
            Assert.True(row.LocationId > 0);
        });
    }

    [PostgresFact]
    public async Task A_month_nobody_ordered_in_is_answered_with_nothing()
    {
        await using var db = database.CreateContext();
        await WorldAsync(db);

        var missing = await Queries(db).GetAsync(new DateOnly(2019, 1, 1), new DashboardQuery(), CancellationToken.None);

        Assert.Null(missing);
    }

    [PostgresFact]
    public async Task Reading_the_dashboard_writes_nothing()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var before = await CountsAsync(db);
        db.ChangeTracker.Clear();

        foreach (var basis in Enum.GetValues<AnalyticsComparisonBasis>())
        {
            // A hand-picked range needs its months; every other basis works them out for itself.
            var query = basis is AnalyticsComparisonBasis.CustomRange
                ? new DashboardQuery(basis, PageSize: 100, CustomStart: "2026-05", CustomEnd: "2026-06")
                : new DashboardQuery(basis, PageSize: 100);

            await Queries(db).GetAsync(world.July, query, CancellationToken.None);
        }

        await Queries(db).GetPeriodsAsync(CancellationToken.None);

        Assert.Equal(before, await CountsAsync(db));
        Assert.Empty(db.ChangeTracker.Entries());
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private static ManagementDashboardQueries Queries(BaxOrdersDbContext db) => new(db);

    /// <summary>The dashboard narrowed to this test's own locations, since the database is shared.</summary>
    private static async Task<ManagementDashboardDto> DashboardAsync(
        BaxOrdersDbContext db, World world, DashboardQuery? query = null)
    {
        var dashboard = await Queries(db).GetAsync(
            world.July, (query ?? new DashboardQuery()) with { Search = (query?.Search) ?? world.Tag, PageSize = query?.PageSize ?? 100 },
            CancellationToken.None);

        return dashboard ?? throw new InvalidOperationException("The fixture must have a request for the selected month.");
    }

    private static async Task<LocationDashboardRowDto> RowAsync(
        BaxOrdersDbContext db, World world, int locationId,
        AnalyticsComparisonBasis basis = AnalyticsComparisonBasis.PreviousMonth)
    {
        var dashboard = await DashboardAsync(db, world, new DashboardQuery(Basis: basis));
        return dashboard.Rows.Items.SingleOrDefault(row => row.LocationId == locationId)
            ?? throw new InvalidOperationException($"Location #{locationId} is not among the dashboard rows.");
    }

    /// <summary>Every row a query leaves in the whole company, page by page, since the database is shared.</summary>
    private static async Task<List<LocationDashboardRowDto>> EveryRowAsync(
        BaxOrdersDbContext db, DateOnly month, DashboardQuery query)
    {
        var rows = new List<LocationDashboardRowDto>();
        for (var page = 1; ; page++)
        {
            var dashboard = (await Queries(db).GetAsync(
                month, query with { Page = page, PageSize = ManagementDashboardQueries.MaxPageSize }, CancellationToken.None))!;
            rows.AddRange(dashboard.Rows.Items);
            if (rows.Count >= dashboard.Rows.TotalCount || dashboard.Rows.Items.Count == 0)
            {
                return rows;
            }
        }
    }

    /// <summary>
    /// One more object for <paramref name="world"/>: a priced June, and a July in which the only line is one
    /// somebody still owes a price for — no partial coverage, because nothing at all is priced.
    /// </summary>
    private static async Task<int> NothingPricedAsync(BaxOrdersDbContext db, World world)
    {
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var location = await LocationAsync(db, new PostgresLocationCodeGenerator(db), $"Heç qiyməti yoxdur {world.Tag}");
        var product = await ProductAsync(db, new PostgresProductCodeGenerator(db), $"Qiymətsiz fırça {world.Tag}");
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var june = new OrderRequest(location, world.June);
        june.AddItem(variant, 4m, 10m);
        var july = new OrderRequest(location, world.July);
        july.AddItem(variant, 6m, null);
        db.OrderRequests.AddRange(june, july);
        await db.SaveChangesAsync();

        return location.Id;
    }

    private sealed record SizeWorld(
        string Tag, DateOnly July, int Fell8000, int Rose5000, int Rose10, int NoBaseline, int NoOrder);

    /// <summary>
    /// Three changes of different sizes and signs, and two objects with no change at all: one with a July and
    /// nothing before it, one with a June and nothing since. Named so the two without a change fall in name order.
    /// </summary>
    private static async Task<SizeWorld> SizeWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..6];
        var (june, july) = (new DateOnly(2026, 6, 1), new DateOnly(2026, 7, 1));
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");

        var codes = new PostgresLocationCodeGenerator(db);
        var fell = await LocationAsync(db, codes, $"Azalan {tag}");
        var rose = await LocationAsync(db, codes, $"Artan {tag}");
        var barely = await LocationAsync(db, codes, $"Az artan {tag}");
        var noBaseline = await LocationAsync(db, codes, $"Bazasız {tag}");
        var noOrder = await LocationAsync(db, codes, $"Susmuş {tag}");
        var product = await ProductAsync(db, new PostgresProductCodeGenerator(db), $"Ölçü malı {tag}");
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        OrderRequest Order(Location location, DateOnly month, decimal amount)
        {
            var request = new OrderRequest(location, month);
            request.AddItem(variant, 10m, amount / 10m);
            return request;
        }

        db.OrderRequests.AddRange(
            Order(fell, june, 10_000m), Order(fell, july, 2_000m),     // −8.000
            Order(rose, june, 1_000m), Order(rose, july, 6_000m),      // +5.000
            Order(barely, june, 100m), Order(barely, july, 110m),      // +10
            Order(noBaseline, july, 500m),                             // nothing to compare against
            Order(noOrder, june, 700m));                               // nothing this month
        await db.SaveChangesAsync();

        return new SizeWorld(tag, july, fell.Id, rose.Id, barely.Id, noBaseline.Id, noOrder.Id);
    }

    private static async Task<(int Requests, int Items, int Locations, int Variants)> CountsAsync(BaxOrdersDbContext db) =>
        (await db.OrderRequests.CountAsync(),
         await db.OrderRequestItems.CountAsync(),
         await db.Locations.CountAsync(),
         await db.ProductVariants.CountAsync());

    private sealed record World(
        string Tag,
        DateOnly April, DateOnly May, DateOnly June, DateOnly July,
        int SteadyId, string SteadyCode, string SteadyName, long SteadyJulyRequestId,
        int NoHistoryId,
        int DormantId,
        int PartialId,
        int VersionedId, long VersionedJuneV2Id,
        int UnpricedId,
        int ServiceId);

    /// <summary>
    /// Six locations, each one of the situations the dashboard has to tell apart: ordinary history, a month
    /// with nothing before it, history but nothing this month, a window with a hole in it, a month that exists
    /// twice, a month with an unpriced line, and a service.
    /// </summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..6];
        var (april, may, june, july) =
            (new DateOnly(2026, 4, 1), new DateOnly(2026, 5, 1), new DateOnly(2026, 6, 1), new DateOnly(2026, 7, 1));

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var month = await ServiceUnitAsync(db, tag);

        var codes = new PostgresLocationCodeGenerator(db);
        var steady = await LocationAsync(db, codes, $"Daimi {tag}");
        var noHistory = await LocationAsync(db, codes, $"Tarixsiz {tag}");
        var dormant = await LocationAsync(db, codes, $"Susmuş {tag}");
        var partial = await LocationAsync(db, codes, $"Natamam {tag}");
        var versioned = await LocationAsync(db, codes, $"Versiyalı {tag}");
        var unpriced = await LocationAsync(db, codes, $"Qiymətsiz {tag}");
        var service = await LocationAsync(db, codes, $"Xidmətli {tag}");
        await db.SaveChangesAsync();

        var productCodes = new PostgresProductCodeGenerator(db);
        var material = await ProductAsync(db, productCodes, $"Mop {tag}");
        var other = await ProductAsync(db, productCodes, $"Süpürgə {tag}");
        var cleaning = await ProductAsync(db, productCodes, $"Təmizlik xidməti {tag}");
        await db.SaveChangesAsync();

        var materialVariant = material.AddVariant(null, null, null, pieces);
        var otherVariant = other.AddVariant(null, null, null, pieces);
        var serviceVariant = cleaning.AddVariant(null, null, null, month);
        await db.SaveChangesAsync();

        // Ordinary: June then July, so the previous month is there.
        var steadyJune = new OrderRequest(steady, june);
        steadyJune.AddItem(materialVariant, 20m, 10m);
        var steadyJuly = new OrderRequest(steady, july);
        steadyJuly.AddItem(materialVariant, 30m, 10m);
        steadyJuly.AddItem(otherVariant, 5m, 4m);

        // July only: the month before it does not exist at all.
        var noHistoryJuly = new OrderRequest(noHistory, july);
        noHistoryJuly.AddItem(materialVariant, 12m, 10m);

        // June only: historically active, nothing this month.
        var dormantJune = new OrderRequest(dormant, june);
        dormantJune.AddItem(materialVariant, 20m, 10m);

        // April and May but no June: a three-month window with a hole in it.
        var partialApril = new OrderRequest(partial, april);
        partialApril.AddItem(materialVariant, 30m, 10m);
        var partialMay = new OrderRequest(partial, may);
        partialMay.AddItem(materialVariant, 10m, 10m);
        var partialJuly = new OrderRequest(partial, july);
        partialJuly.AddItem(materialVariant, 25m, 10m);
        partialJuly.AddItem(otherVariant, 3m, 5m);

        // June exists twice; only the second version is history.
        var versionedJune = new OrderRequest(versioned, june);
        versionedJune.AddItem(materialVariant, 10m, 10m);
        var versionedJuly = new OrderRequest(versioned, july);
        versionedJuly.AddItem(materialVariant, 15m, 10m);

        // One line of July has no price at all.
        var unpricedJune = new OrderRequest(unpriced, june);
        unpricedJune.AddItem(materialVariant, 10m, 10m);
        var unpricedJuly = new OrderRequest(unpriced, july);
        unpricedJuly.AddItem(materialVariant, 5m, 10m);
        unpricedJuly.AddItem(otherVariant, 8m, null);

        // A monthly service: money, never a quantity.
        var serviceJune = new OrderRequest(service, june);
        serviceJune.AddItem(serviceVariant, 1m, 250m);
        var serviceJuly = new OrderRequest(service, july);
        serviceJuly.AddItem(serviceVariant, 1m, 300m);

        db.OrderRequests.AddRange(
            steadyJune, steadyJuly, noHistoryJuly, dormantJune,
            partialApril, partialMay, partialJuly,
            versionedJune, versionedJuly, unpricedJune, unpricedJuly, serviceJune, serviceJuly);
        await db.SaveChangesAsync();

        // Only a request that has left draft may be versioned; a draft is corrected where it stands.
        versionedJune.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);
        var versionedJuneV2 = versionedJune.CreateNextVersion();
        versionedJuneV2.AddItem(materialVariant, 40m, 10m);
        db.OrderRequests.Add(versionedJuneV2);
        await db.SaveChangesAsync();

        return new World(
            tag, april, may, june, july,
            steady.Id, steady.Code, steady.Name, steadyJuly.Id,
            noHistory.Id, dormant.Id, partial.Id,
            versioned.Id, versionedJuneV2.Id,
            unpriced.Id, service.Id);
    }

    private static async Task<Location> LocationAsync(
        BaxOrdersDbContext db, PostgresLocationCodeGenerator codes, string name)
    {
        var location = new Location(await codes.NextAsync(CancellationToken.None), name);
        db.Locations.Add(location);
        return location;
    }

    private static async Task<Product> ProductAsync(
        BaxOrdersDbContext db, PostgresProductCodeGenerator codes, string name)
    {
        var product = new Product(await codes.NextAsync(CancellationToken.None), name);
        db.Products.Add(product);
        return product;
    }

    /// <summary>MONTH is not reference seed data; the catalogue gets it once, by its real code.</summary>
    private static async Task<UnitOfMeasure> ServiceUnitAsync(BaxOrdersDbContext db, string tag)
    {
        var existing = await db.UnitsOfMeasure.FirstOrDefaultAsync(unit => unit.Code == AnalyticsUnits.Month);
        if (existing is not null)
        {
            return existing;
        }

        // Only the code is the contract analytics reads; the name and symbol carry the tag, because the import
        // catalogue matches on both and a unit spelled "Ay"/"ay" would resolve "ay" in every other test.
        var unit = new UnitOfMeasure(AnalyticsUnits.Month, $"Ay {tag}", $"ay{tag}", UnitType.Other);
        db.UnitsOfMeasure.Add(unit);
        await db.SaveChangesAsync();
        return unit;
    }
}
