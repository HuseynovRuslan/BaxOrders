using BaxOrders.Application.Analytics;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Comparing a location's month with its own history against a real SQL Server. The fixture is synthetic and
/// every assertion reads: nothing in analytics writes.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class OrderAnalyticsTests(PostgresDatabaseFixture database)
{
    // ---- current period and versions ----------------------------------------------------------------

    [PostgresFact]
    public async Task The_selected_month_resolves_to_that_location_s_request()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth);

        Assert.Equal(world.JuneRequestId, comparison.Summary.CurrentRequestId);
        Assert.Equal(1, comparison.Summary.CurrentVersion);
        Assert.Equal(world.June, comparison.Summary.CurrentPeriod);
        Assert.Equal(OrderRequestStatus.Draft, comparison.Summary.CurrentStatus);
    }

    [PostgresFact]
    public async Task A_month_the_location_never_ordered_in_is_answered_with_nothing_not_an_empty_month()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var missing = await Queries(db).CompareAsync(
            world.LocationId, new DateOnly(2026, 12, 1), new ComparisonQuery(), CancellationToken.None);

        Assert.Null(missing);
    }

    [PostgresFact]
    public async Task Only_the_highest_version_of_a_month_contributes()
    {
        await using var db = database.CreateContext();
        var world = await VersionedWorldAsync(db);

        var comparison = await Queries(db).CompareAsync(
            world.LocationId, world.June, new ComparisonQuery(), CancellationToken.None);

        // May exists twice: version 1 ordered 10, version 2 ordered 40. Only the second is history.
        var baseline = Assert.Single(comparison!.Summary.BaselinePeriods);
        Assert.Equal((world.May, 2), (baseline.Period, baseline.Version));
        Assert.Equal(world.MayVersion2Id, baseline.OrderRequestId);

        var row = Row(comparison, world.VariantId);
        Assert.Equal(40m, row.Baseline.Quantity);
        Assert.Equal(1, row.Baseline.ItemCount);
    }

    [PostgresFact]
    public async Task Two_versions_of_a_month_are_never_added_together()
    {
        await using var db = database.CreateContext();
        var world = await VersionedWorldAsync(db);

        var comparison = await Queries(db).CompareAsync(
            world.LocationId, world.June, new ComparisonQuery(), CancellationToken.None);

        // 10 + 40 would be 50; the answer must be the second version alone.
        Assert.Equal(40m, Row(comparison!, world.VariantId).Baseline.Quantity);
    }

    // ---- baseline windows ---------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_previous_month_baseline_is_the_single_month_before()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth);

        Assert.Equal((1, 1), (comparison.Summary.ExpectedBaselinePeriodCount, comparison.Summary.AvailableBaselinePeriodCount));
        Assert.Empty(comparison.Summary.MissingBaselinePeriods);
        Assert.Equal(world.May, Assert.Single(comparison.Summary.BaselinePeriods).Period);
        Assert.True(comparison.Summary.BaselineAvailable);
    }

    [PostgresFact]
    public async Task A_three_month_window_reports_the_month_the_location_never_ordered_in_as_missing()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.Previous3MonthAverage);

        // March, April, May were expected; the location has no March request at all.
        Assert.Equal((3, 2), (comparison.Summary.ExpectedBaselinePeriodCount, comparison.Summary.AvailableBaselinePeriodCount));
        Assert.Equal([world.March], comparison.Summary.MissingBaselinePeriods);
        Assert.Equal([world.April, world.May], comparison.Summary.BaselinePeriods.Select(period => period.Period));
    }

    [PostgresFact]
    public async Task A_six_month_window_stops_at_the_month_before_the_selected_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.Previous6MonthAverage);

        Assert.Equal(6, comparison.Summary.ExpectedBaselinePeriodCount);
        Assert.DoesNotContain(world.June, comparison.Summary.BaselinePeriods.Select(period => period.Period));

        // December 2025 and March 2026 have no request; January, February, April and May do.
        Assert.Equal(4, comparison.Summary.AvailableBaselinePeriodCount);
        Assert.Equal([new DateOnly(2025, 12, 1), world.March], comparison.Summary.MissingBaselinePeriods);
    }

    [PostgresFact]
    public async Task An_average_divides_by_the_months_that_exist_not_by_the_months_that_were_asked_for()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.Previous3MonthAverage);
        var row = Row(comparison, world.MaterialVariantId);

        // April 10 and May 20 over the two available months of a three-month window: 15, not 10.
        Assert.Equal(15m, row.Baseline.Quantity);
        Assert.Equal((2, 3), (row.Baseline.AvailablePeriodCount, row.Baseline.ExpectedPeriodCount));
    }

    [PostgresFact]
    public async Task An_available_month_without_the_product_contributes_a_zero()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.Previous3MonthAverage);
        var row = Row(comparison, world.SteadyVariantId);

        // Ordered 50 in May only; April exists but holds no line of it, so the average is 25 over two months.
        Assert.Equal(25m, row.Baseline.Quantity);
    }

    [PostgresFact]
    public async Task A_location_with_no_history_at_all_is_insufficient_history_not_a_list_of_new_products()
    {
        await using var db = database.CreateContext();
        var world = await LonelyWorldAsync(db);

        var comparison = await Queries(db).CompareAsync(
            world.LocationId, world.June, new ComparisonQuery(), CancellationToken.None);

        Assert.False(comparison!.Summary.BaselineAvailable);
        Assert.Equal(0, comparison.Summary.AvailableBaselinePeriodCount);
        Assert.Equal(0, comparison.Summary.NewVariantCount);
        Assert.All(comparison.Rows.Items, row => Assert.Equal(ComparisonState.InsufficientHistory, row.State));
    }

    // ---- states -------------------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_bigger_order_than_last_month_is_an_increase()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth), world.MaterialVariantId);

        Assert.Equal(ComparisonState.Increased, row.State);
        Assert.Equal((30m, 20m), (row.Current.Quantity, row.Baseline.Quantity));
        Assert.Equal((10m, 50m), (row.Delta.QuantityDelta, row.Delta.QuantityPercentChange));
    }

    [PostgresFact]
    public async Task A_smaller_order_than_last_month_is_a_decrease()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth), world.DecliningVariantId);

        Assert.Equal(ComparisonState.Decreased, row.State);
        Assert.Equal((80m, 100m), (row.Current.Quantity, row.Baseline.Quantity));
        Assert.Equal(-20m, row.Delta.QuantityPercentChange);
    }

    [PostgresFact]
    public async Task A_product_ordered_for_the_first_time_is_new_and_has_no_percentage()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth), world.NewcomerVariantId);

        Assert.Equal(ComparisonState.New, row.State);
        Assert.Equal(0m, row.Baseline.Quantity);
        Assert.Null(row.Delta.QuantityPercentChange);
    }

    [PostgresFact]
    public async Task A_product_that_stopped_being_ordered_is_still_a_row()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth);

        // It is in no current line at all, so iterating the current month alone would have lost it.
        var row = Row(comparison, world.RetiredVariantId);

        Assert.Equal(ComparisonState.NoLongerOrdered, row.State);
        Assert.Equal((0m, 40m), (row.Current.Quantity, row.Baseline.Quantity));
        Assert.Equal(-100m, row.Delta.QuantityPercentChange);
    }

    [PostgresFact]
    public async Task The_same_quantity_as_last_month_is_unchanged()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth), world.SteadyVariantId);

        Assert.Equal(ComparisonState.Unchanged, row.State);
        Assert.Equal(0m, row.Delta.QuantityDelta);
    }

    // ---- identity -----------------------------------------------------------------------------------

    [PostgresFact]
    public async Task One_product_ordered_in_pieces_and_in_packs_stays_two_rows()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth);

        var pieces = Row(comparison, world.MaterialVariantId);
        var packs = Row(comparison, world.PackVariantId);

        Assert.Equal(pieces.Variant.ProductId, packs.Variant.ProductId);
        Assert.Equal("PCS", pieces.Variant.OrderUnitCode);
        Assert.Equal("PACK", packs.Variant.OrderUnitCode);
        Assert.Equal(30m, pieces.Current.Quantity);
        Assert.Equal(7m, packs.Current.Quantity);
    }

    [PostgresFact]
    public async Task A_descriptor_variant_stays_apart_from_the_plain_one()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth);

        var toothed = Row(comparison, world.DescriptorVariantId);
        var plain = Row(comparison, world.PlainVariantId);

        Assert.Equal("diş", toothed.Variant.SpecificationDescriptor);
        Assert.Null(plain.Variant.SpecificationDescriptor);
        Assert.Equal(toothed.Variant.SpecificationValue, plain.Variant.SpecificationValue);
        Assert.NotEqual(toothed.Variant.ProductVariantId, plain.Variant.ProductVariantId);
    }

    [PostgresFact]
    public async Task Several_lines_of_one_variant_become_one_row_without_touching_the_stored_lines()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth), world.DuplicateVariantId);

        // Two identical lines of 5 were materialized on purpose; both count, and both are still stored.
        Assert.Equal(10m, row.Current.Quantity);
        Assert.Equal(2, row.Current.ItemCount);
        Assert.Equal(2, await db.OrderRequestItems.CountAsync(item =>
            item.OrderRequestId == world.JuneRequestId && item.ProductVariantId == world.DuplicateVariantId));
    }

    // ---- services -----------------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_monthly_service_is_compared_by_money_and_never_by_quantity()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth), world.MonthVariantId);

        Assert.Equal(AnalyticsKind.AmountOrientedService, row.AnalyticsKind);
        Assert.Equal(ComparisonState.NotComparable, row.State);
        Assert.Null(row.Current.Quantity);
        Assert.Null(row.Delta.QuantityPercentChange);
        Assert.Equal((150m, 100m), (row.Current.KnownAmount, row.Baseline.KnownAmount));
        Assert.Equal((50m, 50m), (row.Delta.AmountDelta, row.Delta.AmountPercentChange));
    }

    [PostgresFact]
    public async Task A_service_billed_per_occasion_is_not_a_quantity_either()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth), world.TimeVariantId);

        Assert.Equal(AnalyticsUnits.Time, row.Variant.OrderUnitCode);
        Assert.Equal(AnalyticsKind.AmountOrientedService, row.AnalyticsKind);
        Assert.Null(row.Current.Quantity);
    }

    [PostgresFact]
    public async Task A_variant_with_no_order_unit_is_a_service_too()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth), world.UnitlessVariantId);

        Assert.Null(row.Variant.OrderUnitCode);
        Assert.Equal(AnalyticsKind.AmountOrientedService, row.AnalyticsKind);
        Assert.Equal(ComparisonState.NotComparable, row.State);
        Assert.Equal(0m, row.Delta.AmountDelta);
    }

    // ---- money --------------------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_weighted_price_follows_the_quantity_of_each_line()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth), world.WeightedVariantId);

        // One unit at 10 and nine at 20: 19.00, not the 15.00 an unweighted mean would produce.
        Assert.Equal(19m, row.Current.WeightedUnitPrice);
        Assert.Equal(190m, row.Current.KnownAmount);
    }

    [PostgresFact]
    public async Task A_line_with_no_price_is_never_read_as_a_free_line()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth), world.PricelessVariantId);

        Assert.Null(row.Current.KnownAmount);
        Assert.Null(row.Current.WeightedUnitPrice);
        Assert.Equal(PriceCoverageState.Unavailable, row.Current.PriceCoverage.State);
        Assert.Equal(1, row.Current.PriceCoverage.MissingRequiredPriceItemCount);
    }

    [PostgresFact]
    public async Task Partial_price_coverage_is_reported_rather_than_hidden()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = Row(await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth), world.PartlyPricedVariantId);

        Assert.Equal(PriceCoverageState.Partial, row.Current.PriceCoverage.State);
        Assert.Equal(12m, row.Current.PriceCoverage.TotalQuantity);
        Assert.Equal(2m, row.Current.PriceCoverage.KnownPriceQuantity);
        Assert.Equal(10m, row.Current.PriceCoverage.MissingPriceQuantity);
    }

    [PostgresFact]
    public async Task The_summary_money_is_the_money_that_is_known_and_says_when_it_is_partial()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth);

        var expected = await db.OrderRequestItems
            .Where(item => item.OrderRequestId == world.JuneRequestId && item.UnitPrice != null)
            .SumAsync(item => item.Quantity * item.UnitPrice!.Value);

        Assert.Equal(expected, comparison.Summary.CurrentKnownAmountTotal);
        Assert.False(comparison.Summary.AmountIsComplete);
        Assert.Equal(
            await db.OrderRequestItems.CountAsync(item => item.OrderRequestId == world.JuneRequestId && item.UnitPrice == null),
            comparison.Summary.CurrentMissingPriceItemCount);
    }

    [PostgresFact]
    public async Task The_summary_counts_every_state_of_the_whole_comparison()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth, new ComparisonQuery(PageSize: 2));

        var summary = comparison.Summary;
        Assert.Equal(2, comparison.Rows.Items.Count);
        Assert.Equal(summary.TotalVariantCount, comparison.Rows.TotalCount);
        Assert.Equal(
            summary.TotalVariantCount,
            summary.NewVariantCount + summary.NoLongerOrderedVariantCount + summary.IncreasedVariantCount
            + summary.DecreasedVariantCount + summary.UnchangedVariantCount + summary.NotComparableVariantCount
            + summary.InsufficientHistoryVariantCount);
        Assert.Equal(
            summary.TotalVariantCount,
            summary.QuantityComparableVariantCount + summary.AmountOrientedServiceCount);
        Assert.Equal(await db.OrderRequestItems.CountAsync(item => item.OrderRequestId == world.JuneRequestId),
            summary.CurrentItemCount);
    }

    // ---- filtering and paging -----------------------------------------------------------------------

    [PostgresFact]
    public async Task Rows_can_be_searched_by_product_name_code_and_model()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var byName = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth, new ComparisonQuery(Search: world.MaterialProductName));
        var byCode = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth, new ComparisonQuery(Search: world.MaterialProductCode));
        var byModel = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth, new ComparisonQuery(Search: world.DescriptorModelCode));

        // The product is ordered in two units, so its name finds both of its variants.
        Assert.Equal(2, byName.Rows.TotalCount);
        Assert.Equal(2, byCode.Rows.TotalCount);
        Assert.Equal(world.DescriptorVariantId, Assert.Single(byModel.Rows.Items).Variant.ProductVariantId);
    }

    [PostgresFact]
    public async Task A_search_narrows_the_rows_but_never_the_summary()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth, new ComparisonQuery(Search: world.MaterialProductName));

        // The summary describes the whole comparison; only the rows are the filtered view of it.
        Assert.Equal(2, comparison.Rows.TotalCount);
        Assert.True(comparison.Summary.TotalVariantCount > 2);
    }

    [PostgresFact]
    public async Task Rows_can_be_filtered_to_one_state()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var onlyNew = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth, new ComparisonQuery(State: ComparisonState.New));
        var onlyGone = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth, new ComparisonQuery(State: ComparisonState.NoLongerOrdered));

        Assert.All(onlyNew.Rows.Items, row => Assert.Equal(ComparisonState.New, row.State));
        Assert.Equal(onlyNew.Summary.NewVariantCount, onlyNew.Rows.TotalCount);
        Assert.Equal(world.RetiredVariantId, Assert.Single(onlyGone.Rows.Items).Variant.ProductVariantId);
    }

    [PostgresFact]
    public async Task Rows_can_be_split_into_materials_and_services()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var materials = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth,
            new ComparisonQuery(Kind: AnalyticsKind.QuantityComparable, PageSize: 200));
        var services = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth,
            new ComparisonQuery(Kind: AnalyticsKind.AmountOrientedService, PageSize: 200));

        // A service has no quantity to put in a quantity table, so the two are read apart; the summary still
        // describes the whole comparison, and the two halves add up to it.
        Assert.All(materials.Rows.Items, row => Assert.Equal(AnalyticsKind.QuantityComparable, row.AnalyticsKind));
        Assert.All(services.Rows.Items, row => Assert.Equal(AnalyticsKind.AmountOrientedService, row.AnalyticsKind));
        Assert.Equal(materials.Summary.QuantityComparableVariantCount, materials.Rows.TotalCount);
        Assert.Equal(services.Summary.AmountOrientedServiceCount, services.Rows.TotalCount);
        Assert.Equal(
            materials.Summary.TotalVariantCount,
            materials.Rows.TotalCount + services.Rows.TotalCount);
        Assert.Equal(3, services.Rows.TotalCount);
    }

    [PostgresFact]
    public async Task Rows_are_paged_and_the_page_size_is_capped()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var first = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth, new ComparisonQuery(Page: 1, PageSize: 3));
        var second = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth, new ComparisonQuery(Page: 2, PageSize: 3));
        var capped = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth, new ComparisonQuery(PageSize: 9999));

        Assert.Equal(3, first.Rows.Items.Count);
        Assert.Empty(first.Rows.Items.Select(row => row.Variant.ProductVariantId)
            .Intersect(second.Rows.Items.Select(row => row.Variant.ProductVariantId)));
        Assert.Equal(OrderAnalyticsQueries.MaxPageSize, capped.Rows.PageSize);
    }

    // ---- periods and trend --------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_period_list_offers_every_month_the_location_ordered_in()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var periods = await Queries(db).GetPeriodsAsync(world.LocationId, CancellationToken.None);

        Assert.NotNull(periods);
        Assert.Equal(
            [world.June, world.May, world.April, world.February, world.January],
            periods!.Periods.Select(period => period.Period));
        Assert.DoesNotContain(world.March, periods.Periods.Select(period => period.Period));
    }

    [PostgresFact]
    public async Task A_trend_has_a_point_for_every_month_the_location_ordered_in_and_none_for_the_others()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var trend = await Queries(db).GetTrendAsync(
            world.LocationId, world.MaterialVariantId, new TrendQuery(), CancellationToken.None);

        Assert.NotNull(trend);
        Assert.Equal(
            [world.January, world.February, world.April, world.May, world.June],
            trend!.Points.Select(point => point.Period));

        // No request for March, so there is no March point at all — not a point with a zero in it.
        Assert.DoesNotContain(world.March, trend.Points.Select(point => point.Period));
    }

    [PostgresFact]
    public async Task A_month_the_location_ordered_in_without_this_product_is_a_zero_point()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var trend = await Queries(db).GetTrendAsync(
            world.LocationId, world.SteadyVariantId, new TrendQuery(), CancellationToken.None);

        var april = Assert.Single(trend!.Points, point => point.Period == world.April);

        Assert.Equal(0m, april.Quantity);
        Assert.Equal(0, april.ItemCount);
        Assert.Null(april.KnownAmount);
    }

    [PostgresFact]
    public async Task A_trend_can_be_limited_to_a_range_of_months()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var trend = await Queries(db).GetTrendAsync(
            world.LocationId, world.MaterialVariantId, new TrendQuery(world.April, world.May), CancellationToken.None);

        Assert.Equal([world.April, world.May], trend!.Points.Select(point => point.Period));
        Assert.Equal([10m, 20m], trend.Points.Select(point => point.Quantity));
    }

    [PostgresFact]
    public async Task A_service_has_no_quantity_in_its_trend_either()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var trend = await Queries(db).GetTrendAsync(
            world.LocationId, world.MonthVariantId, new TrendQuery(), CancellationToken.None);

        Assert.Equal(AnalyticsKind.AmountOrientedService, trend!.AnalyticsKind);
        Assert.All(trend.Points, point => Assert.Null(point.Quantity));
        Assert.Equal(150m, Assert.Single(trend.Points, point => point.Period == world.June).KnownAmount);
    }

    [PostgresFact]
    public async Task Unknown_locations_and_variants_answer_with_nothing()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var queries = Queries(db);

        Assert.Null(await queries.GetPeriodsAsync(-1, CancellationToken.None));
        Assert.Null(await queries.CompareAsync(-1, world.June, new ComparisonQuery(), CancellationToken.None));
        Assert.Null(await queries.GetTrendAsync(-1, world.MaterialVariantId, new TrendQuery(), CancellationToken.None));
        Assert.Null(await queries.GetTrendAsync(world.LocationId, -1, new TrendQuery(), CancellationToken.None));
    }

    // ---- status and writes --------------------------------------------------------------------------

    [PostgresFact]
    public async Task Draft_requests_are_included_because_no_approval_workflow_exists_yet()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var comparison = await CompareAsync(db, world, AnalyticsComparisonBasis.PreviousMonth);

        Assert.Equal(OrderRequestStatus.Draft, comparison.Summary.CurrentStatus);
        Assert.All(comparison.Summary.BaselinePeriods, period => Assert.Equal(OrderRequestStatus.Draft, period.Status));
        Assert.NotEmpty(comparison.Rows.Items);
    }

    [PostgresFact]
    public async Task Reading_analytics_writes_nothing()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var before = await CountsAsync(db);

        // The fixture built its world through this context; from here on nothing may be tracked or written.
        db.ChangeTracker.Clear();

        var queries = Queries(db);
        foreach (var basis in Enum.GetValues<AnalyticsComparisonBasis>())
        {
            // A hand-picked range needs its months; every other basis works them out for itself.
            var query = basis is AnalyticsComparisonBasis.CustomRange
                ? new ComparisonQuery(basis, CustomStart: "2026-04", CustomEnd: "2026-05")
                : new ComparisonQuery(basis);

            await queries.CompareAsync(world.LocationId, world.June, query, CancellationToken.None);
        }

        await queries.GetPeriodsAsync(world.LocationId, CancellationToken.None);
        await queries.GetTrendAsync(world.LocationId, world.MaterialVariantId, new TrendQuery(), CancellationToken.None);

        Assert.Equal(before, await CountsAsync(db));
        Assert.Empty(db.ChangeTracker.Entries());
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private static OrderAnalyticsQueries Queries(BaxOrdersDbContext db) => new(db);

    private static async Task<LocationComparisonDto> CompareAsync(
        BaxOrdersDbContext db, World world, AnalyticsComparisonBasis basis, ComparisonQuery? query = null) =>
        await Queries(db).CompareAsync(
            world.LocationId, world.June, (query ?? new ComparisonQuery()) with { Basis = basis }, CancellationToken.None)
        ?? throw new InvalidOperationException("The fixture must have a request for the selected month.");

    private static VariantComparisonDto Row(LocationComparisonDto comparison, long variantId) =>
        comparison.Rows.Items.SingleOrDefault(row => row.Variant.ProductVariantId == variantId)
        ?? throw new InvalidOperationException($"Variant #{variantId} is not among the compared rows.");

    private static async Task<(int Requests, int Items, int Variants, int Products)> CountsAsync(BaxOrdersDbContext db) =>
        (await db.OrderRequests.CountAsync(),
         await db.OrderRequestItems.CountAsync(),
         await db.ProductVariants.CountAsync(),
         await db.Products.CountAsync());

    /// <summary>MONTH and TIME are not reference seed data; the catalogue gets them once, by their real codes.</summary>
    private static async Task<UnitOfMeasure> ServiceUnitAsync(BaxOrdersDbContext db, string code, string name, string tag)
    {
        var existing = await db.UnitsOfMeasure.FirstOrDefaultAsync(unit => unit.Code == code);
        if (existing is not null)
        {
            return existing;
        }

        // Only the code is the contract analytics reads. The name and symbol carry the tag, because the import
        // catalogue matches on both: a unit spelled "Ay"/"ay" here would resolve "ay" in every other test.
        var unit = new UnitOfMeasure(code, $"{name} {tag}", $"{name.ToLowerInvariant()}{tag}", UnitType.Other);
        db.UnitsOfMeasure.Add(unit);
        await db.SaveChangesAsync();
        return unit;
    }

    private sealed record World(
        int LocationId,
        DateOnly January, DateOnly February, DateOnly March, DateOnly April, DateOnly May, DateOnly June,
        long JuneRequestId,
        long MaterialVariantId,
        long PackVariantId,
        long DecliningVariantId,
        long NewcomerVariantId,
        long RetiredVariantId,
        long SteadyVariantId,
        long PricelessVariantId,
        long PartlyPricedVariantId,
        long WeightedVariantId,
        long DuplicateVariantId,
        long DescriptorVariantId,
        long PlainVariantId,
        long MonthVariantId,
        long TimeVariantId,
        long UnitlessVariantId,
        string MaterialProductName,
        string MaterialProductCode,
        string DescriptorModelCode);

    /// <summary>
    /// One location with five months of history and a deliberate gap in March, holding every shape the
    /// comparison has to deal with: growth, decline, a newcomer, a product that stopped, a steady one, prices
    /// that are missing or partial, two units of one product, a descriptor variant and three kinds of service.
    /// </summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var (january, february, march) = (new DateOnly(2026, 1, 1), new DateOnly(2026, 2, 1), new DateOnly(2026, 3, 1));
        var (april, may, june) = (new DateOnly(2026, 4, 1), new DateOnly(2026, 5, 1), new DateOnly(2026, 6, 1));

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(CancellationToken.None), $"Analitika obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var packs = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PACK");
        var month = await ServiceUnitAsync(db, AnalyticsUnits.Month, "Ay", tag);
        var time = await ServiceUnitAsync(db, AnalyticsUnits.Time, "Dəfə", tag);

        var codes = new PostgresProductCodeGenerator(db);
        var material = await ProductAsync(db, codes, $"Mop {tag}");
        var declining = await ProductAsync(db, codes, $"Süpürgə {tag}");
        var newcomer = await ProductAsync(db, codes, $"Yeni alət {tag}");
        var retired = await ProductAsync(db, codes, $"Köhnə alət {tag}");
        var steady = await ProductAsync(db, codes, $"Sabit mal {tag}");
        var priceless = await ProductAsync(db, codes, $"Qiymətsiz mal {tag}");
        var partlyPriced = await ProductAsync(db, codes, $"Yarı qiymətli {tag}");
        var weighted = await ProductAsync(db, codes, $"Çəkili mal {tag}");
        var duplicate = await ProductAsync(db, codes, $"Təkrar mal {tag}");
        var chain = await ProductAsync(db, codes, $"Sep {tag}");
        var toilet = await ProductAsync(db, codes, $"Ayaqyolu pulu {tag}");
        var washing = await ProductAsync(db, codes, $"Yuma xidməti {tag}");
        var repair = await ProductAsync(db, codes, $"Təmir işləri {tag}");
        await db.SaveChangesAsync();

        var modelCode = $"MDL{tag.ToUpperInvariant()}";
        var materialVariant = material.AddVariant(null, null, null, pieces);
        var packVariant = material.AddVariant(null, null, null, packs);
        var decliningVariant = declining.AddVariant(null, null, null, pieces);
        var newcomerVariant = newcomer.AddVariant(null, null, null, pieces);
        var retiredVariant = retired.AddVariant(null, null, null, pieces);
        var steadyVariant = steady.AddVariant(null, null, null, pieces);
        var pricelessVariant = priceless.AddVariant(null, null, null, pieces);
        var partlyPricedVariant = partlyPriced.AddVariant(null, null, null, pieces);
        var weightedVariant = weighted.AddVariant(null, null, null, pieces);
        var duplicateVariant = duplicate.AddVariant(null, null, null, pieces);
        var descriptorVariant = chain.AddVariant("28", null, modelCode, pieces, "diş");
        var plainVariant = chain.AddVariant("28", null, null, pieces);
        var monthVariant = toilet.AddVariant(null, null, null, month);
        var timeVariant = washing.AddVariant(null, null, null, time);
        var unitlessVariant = repair.AddVariant(null, null, null, null);
        await db.SaveChangesAsync();

        // January and February exist only so the six-month window has something to find.
        var januaryRequest = new OrderRequest(location, january);
        januaryRequest.AddItem(materialVariant, 4m, 5m);

        var februaryRequest = new OrderRequest(location, february);
        februaryRequest.AddItem(materialVariant, 6m, 5m);

        // March is deliberately absent: the location did not order at all that month.
        var aprilRequest = new OrderRequest(location, april);
        aprilRequest.AddItem(materialVariant, 10m, 5m);

        var mayRequest = new OrderRequest(location, may);
        mayRequest.AddItem(materialVariant, 20m, 5m);
        mayRequest.AddItem(decliningVariant, 100m, 2m);
        mayRequest.AddItem(retiredVariant, 40m, 3m);
        mayRequest.AddItem(steadyVariant, 50m, 1m);
        mayRequest.AddItem(monthVariant, 1m, 100m);
        mayRequest.AddItem(unitlessVariant, 1m, 200m);
        mayRequest.AddItem(descriptorVariant, 5m, 7m);
        mayRequest.AddItem(plainVariant, 9m, 7m);

        var juneRequest = new OrderRequest(location, june);
        juneRequest.AddItem(materialVariant, 30m, 6m);
        juneRequest.AddItem(packVariant, 7m, 15m);
        juneRequest.AddItem(decliningVariant, 80m, 2m);
        juneRequest.AddItem(newcomerVariant, 15m, 4m);
        juneRequest.AddItem(steadyVariant, 50m, 1m);
        juneRequest.AddItem(pricelessVariant, 12m, null);
        juneRequest.AddItem(partlyPricedVariant, 2m, 8m);
        juneRequest.AddItem(partlyPricedVariant, 10m, null);
        juneRequest.AddItem(weightedVariant, 1m, 10m);
        juneRequest.AddItem(weightedVariant, 9m, 20m);
        juneRequest.AddItem(duplicateVariant, 5m, 3m);
        juneRequest.AddItem(duplicateVariant, 5m, 3m);
        juneRequest.AddItem(descriptorVariant, 5m, 7m);
        juneRequest.AddItem(plainVariant, 9m, 7m);
        juneRequest.AddItem(monthVariant, 1m, 150m);
        juneRequest.AddItem(timeVariant, 2m, 50m);
        juneRequest.AddItem(unitlessVariant, 1m, 200m);

        db.OrderRequests.AddRange(januaryRequest, februaryRequest, aprilRequest, mayRequest, juneRequest);
        await db.SaveChangesAsync();

        return new World(
            location.Id, january, february, march, april, may, june,
            juneRequest.Id,
            materialVariant.Id, packVariant.Id, decliningVariant.Id, newcomerVariant.Id, retiredVariant.Id,
            steadyVariant.Id, pricelessVariant.Id, partlyPricedVariant.Id, weightedVariant.Id, duplicateVariant.Id,
            descriptorVariant.Id, plainVariant.Id, monthVariant.Id, timeVariant.Id, unitlessVariant.Id,
            material.Name, material.Code, modelCode);
    }

    private sealed record VersionedWorld(int LocationId, DateOnly May, DateOnly June, long MayVersion2Id, long VariantId);

    /// <summary>One month that exists twice, because it was corrected and resubmitted.</summary>
    private static async Task<VersionedWorld> VersionedWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var (may, june) = (new DateOnly(2026, 5, 1), new DateOnly(2026, 6, 1));

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(CancellationToken.None), $"Versiyalı obyekt {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = await ProductAsync(db, new PostgresProductCodeGenerator(db), $"Versiyalı mal {tag}");
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var first = new OrderRequest(location, may);
        first.AddItem(variant, 10m, 1m);
        db.OrderRequests.Add(first);
        await db.SaveChangesAsync();

        // Only a request that left draft may be versioned; a draft is corrected where it stands.
        first.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);
        var second = first.CreateNextVersion();
        second.AddItem(variant, 40m, 1m);

        var juneRequest = new OrderRequest(location, june);
        juneRequest.AddItem(variant, 60m, 1m);

        db.OrderRequests.AddRange(second, juneRequest);
        await db.SaveChangesAsync();

        return new VersionedWorld(location.Id, may, june, second.Id, variant.Id);
    }

    private sealed record LonelyWorld(int LocationId, DateOnly June);

    /// <summary>A location whose only month is the one being looked at.</summary>
    private static async Task<LonelyWorld> LonelyWorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var june = new DateOnly(2026, 6, 1);

        var location = new Location(
            await new PostgresLocationCodeGenerator(db).NextAsync(CancellationToken.None), $"Tək aylıq obyekt {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = await ProductAsync(db, new PostgresProductCodeGenerator(db), $"Tək mal {tag}");
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var request = new OrderRequest(location, june);
        request.AddItem(variant, 10m, 1m);
        db.OrderRequests.Add(request);
        await db.SaveChangesAsync();

        return new LonelyWorld(location.Id, june);
    }

    private static async Task<Product> ProductAsync(BaxOrdersDbContext db, PostgresProductCodeGenerator codes, string name)
    {
        var product = new Product(await codes.NextAsync(CancellationToken.None), name);
        db.Products.Add(product);
        return product;
    }

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];
}
