using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Common;
using BaxOrders.Application.Locations;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Reports;

/// <summary>
/// A year of the company's ordering, location by location and month by month.
/// </summary>
/// <remarks>
/// <para>
/// Six queries whatever the size of the year: the locations, the requests of every month up to the year's end,
/// the lines of those requests, the years that can be asked for, and — for the year's requests — the revision
/// links and workflow events <see cref="HistoricalImportRule"/> reads. Nothing here loops over locations or
/// months to fetch anything, because a report of 26 locations and 12 months would then be 312 round trips.
/// </para>
/// <para>
/// <b>Every month up to the year's end, not only the year.</b> January's difference is against the December
/// before it; an unusual month is judged against the location's three previous available months, which for the
/// first months of a year lie in the year before (owner decision 8.2); and a location that has never ordered is
/// told apart from one that only did not order this year. All three need the months before the year, so they
/// are read with it. Only the year's own twelve months enter a cell, a row total, a month total or the year's.
/// </para>
/// <para>
/// <b>The grid is the month's demand, not the month's till roll.</b> Every figure a cell compares — its own
/// amount, the difference from the month before, the average of the months before that and whether the month is
/// unusual — reads <see cref="OrderLineType.Monthly"/> lines alone, for the reason
/// <see cref="MonthlyComparisonPopulation"/> gives: a one-off purchase is a thing that happened, not a rise in
/// demand, and a line nobody has classified is not evidence of either. What the company actually spent is not
/// lost — the outside-monthly and unclassified money of every cell, row, month and year is carried beside it,
/// so the screen can show the factual total without the comparison being built on it.
/// </para>
/// <para>
/// <b>One version per month.</b> The highest version of a location and month is the one the report shows, which
/// is the policy the dashboard and the comparison screens already follow. Earlier versions stay in the database
/// and stay reachable from the order screens; they are never added to the month beside their successor, and
/// they are never offered here as if they were current.
/// </para>
/// </remarks>
public sealed class MonthlyReportQueries(IBaxOrdersDbContext db)
{
    public async Task<MonthlyReportDto> GetAsync(MonthlyReportQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        var availableYears = await db.OrderRequests.AsNoTracking()
            .Select(request => request.RequestPeriod.Year)
            .Distinct()
            .OrderByDescending(year => year)
            .ToListAsync(cancellationToken);

        // Asked for nothing in particular, the report opens on the year that has something in it rather than on
        // today's, which early in January would be twelve empty columns.
        var year = query.Year ?? (availableYears.Count > 0 ? availableYears[0] : DateTime.UtcNow.Year);

        // The year's universe — the same rule every screen counts by (see LocationUniverse): every active
        // object, and every object that ordered during the year. A location that submitted nothing all year is
        // exactly the row a yearly report exists to surface, and one that has since been deactivated keeps its
        // row in the years it ordered, so its money never leaves a year that has already been read.
        var locations = await LocationUniverse.ForYear(db, year)
            .Select(location => new LocationRef(location.Id, location.Code, location.Name, location.IsActive, location.NormalizedName))
            .ToListAsync(cancellationToken);

        // No lower bound: the months before the year are what January's difference, the unusual-month look-back
        // and "has this location ever ordered" are answered from. None of them is added into the year.
        var to = new DateOnly(year, 12, 1);

        var requests = await db.OrderRequests.AsNoTracking()
            .Where(request => request.RequestPeriod <= to
                && !db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version))
            .Select(request => new RequestRef(
                request.LocationId, request.RequestPeriod, request.Id, request.Version, request.Status))
            .ToListAsync(cancellationToken);

        var totals = await TotalsAsync([.. requests.Select(request => request.OrderRequestId)], cancellationToken);

        // Only the year's own requests become a cell, so only they are asked about — by the order page's own
        // rule, for all of them at once.
        var historical = await HistoricalImportRule.AmongAsync(
            db, [.. requests.Where(request => request.Period.Year == year).Select(request => request.OrderRequestId)], cancellationToken);

        var byLocation = requests
            .GroupBy(request => request.LocationId)
            .ToDictionary(group => group.Key, group => group.ToDictionary(request => request.Period));

        var rows = new List<MonthlyReportRowDto>(locations.Count);
        foreach (var location in locations.OrderByName(location => location.Name))
        {
            rows.Add(Build(location, year, byLocation.GetValueOrDefault(location.Id) ?? [], totals, historical));
        }

        var months = Months(year, rows);
        var company = CompanyTotals(rows);

        var needle = Search.Of(query.Search);
        var filtered = needle is null
            ? rows
            : [.. rows.Where(row => Matches(locations, row, needle))];

        return new MonthlyReportDto(
            year,
            availableYears,
            filtered,
            months,
            rows.Count,
            filtered.Count,
            company.RequestCount,
            company.KnownAmount,
            company.MissingPriceItemCount,
            company.MissingPriceItemCount == 0,
            company.OutsideMonthlyKnownAmount,
            company.OutsideMonthlyItemCount,
            company.UnclassifiedKnownAmount,
            company.UnclassifiedItemCount);
    }

    // ---- reading ------------------------------------------------------------------------------------

    /// <summary>The lines of every request read, added up once per request rather than once per cell.</summary>
    private async Task<Dictionary<long, RequestTotals>> TotalsAsync(
        long[] requestIds, CancellationToken cancellationToken)
    {
        if (requestIds.Length == 0)
        {
            return [];
        }

        // Grouped by line type as well as by request: the comparison reads the monthly money and the screen
        // shows the rest beside it, so both have to come back and neither may be added into the other here.
        var rows = await db.OrderRequestItems.AsNoTracking()
            .Where(item => requestIds.Contains(item.OrderRequestId))
            .GroupBy(item => new { item.OrderRequestId, item.OrderLineType })
            .Select(group => new
            {
                group.Key.OrderRequestId,
                group.Key.OrderLineType,
                ItemCount = group.Count(),
                KnownPriceItemCount = group.Count(item => item.UnitPrice != null),
                // A price is only missing when it was owed, and the line itself says whether it was — see
                // PricingMode for why no property of the supplier can answer that. A line nobody has classified
                // counts as owed: the cautious reading is the one that cannot hide a real gap.
                MissingRequiredPriceItemCount = group.Count(item => item.UnitPrice == null
                    && item.PricingMode != PricingMode.InternalFreeSupply),
                PriceNotRequiredItemCount = group.Count(item => item.UnitPrice == null
                    && item.PricingMode == PricingMode.InternalFreeSupply),
                PricedAmount = group.Sum(item => item.Quantity * (item.UnitPrice ?? 0m)),
            })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.OrderRequestId)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    Side SideOf(OrderLineType type)
                    {
                        var row = group.FirstOrDefault(candidate => candidate.OrderLineType == type);
                        return row is null ? Side.Empty : new Side(row.ItemCount, row.KnownPriceItemCount, row.PricedAmount);
                    }

                    return new RequestTotals(
                        group.Sum(row => row.ItemCount),
                        group.Sum(row => row.KnownPriceItemCount),
                        group.Sum(row => row.MissingRequiredPriceItemCount),
                        group.Sum(row => row.PriceNotRequiredItemCount),
                        SideOf(OrderLineType.Monthly),
                        SideOf(OrderLineType.OutsideMonthly),
                        SideOf(OrderLineType.Unclassified));
                });
    }

    // ---- shaping ------------------------------------------------------------------------------------

    private static MonthlyReportRowDto Build(
        LocationRef location,
        int year,
        Dictionary<DateOnly, RequestRef> requests,
        Dictionary<long, RequestTotals> totals,
        IReadOnlySet<long> historical)
    {
        var cells = new List<MonthlyReportCellDto>(12);
        decimal? yearAmount = null;
        decimal? yearOutside = null;
        decimal? yearUnclassified = null;
        var yearOutsideItems = 0;
        var yearUnclassifiedItems = 0;
        var yearMissing = 0;
        var requestCount = 0;
        var without = 0;

        // The location's available months, oldest first — the ones with a figure to average. A month with no
        // request is not here, and neither is one whose every line is unpriced: unknown money, not zero money.
        var available = new List<(DateOnly Period, decimal Amount)>();
        foreach (var request in requests.Values.OrderBy(request => request.Period))
        {
            if (KnownAmountOf(request, totals) is { } known)
            {
                available.Add((request.Period, known));
            }
        }

        for (var month = 1; month <= 12; month++)
        {
            var period = new DateOnly(year, month, 1);
            var earlier = available
                .TakeWhile(candidate => candidate.Period < period)
                .Select(candidate => candidate.Amount)
                .ToList();
            var cell = Cell(period, requests, totals, earlier, historical);
            cells.Add(cell);

            if (cell.OrderRequestId is null)
            {
                without++;
                continue;
            }

            requestCount++;
            yearMissing += cell.MissingPriceItemCount;
            yearOutsideItems += cell.OutsideMonthlyItemCount;
            yearUnclassifiedItems += cell.UnclassifiedItemCount;
            yearAmount = Add(yearAmount, cell.KnownAmount);
            yearOutside = Add(yearOutside, cell.OutsideMonthlyKnownAmount);
            yearUnclassified = Add(yearUnclassified, cell.UnclassifiedKnownAmount);
        }

        // Every request read is at or before the year's end, so any request at all means the location has ordered.
        return new MonthlyReportRowDto(
            location.Id, location.Code, location.Name, location.IsActive,
            cells, requestCount, yearAmount, yearMissing, without, requests.Count > 0,
            yearOutside, yearOutsideItems, yearUnclassified, yearUnclassifiedItems);
    }

    /// <param name="earlierAmounts">The location's available months before this one, oldest first.</param>
    /// <param name="historical">The year's requests that were carried in from Excel as already approved.</param>
    private static MonthlyReportCellDto Cell(
        DateOnly period,
        Dictionary<DateOnly, RequestRef> requests,
        Dictionary<long, RequestTotals> totals,
        IReadOnlyList<decimal> earlierAmounts,
        IReadOnlySet<long> historical)
    {
        // The month before, which for January is the December of the year before.
        var previousAmount = requests.TryGetValue(period.AddMonths(-1), out var previous)
            ? KnownAmountOf(previous, totals)
            : null;

        if (!requests.TryGetValue(period, out var request))
        {
            // No request: no amount, no difference, and nothing that could be mistaken for a zero.
            return new MonthlyReportCellDto(
                period.Month, period, null, null, null, null, 0, 0, true, previousAmount, null, null, null, null, false,
                false, null, 0, null, 0);
        }

        var found = Found(request, totals);
        var amount = KnownAmountOf(request, totals);
        var (delta, percent) = OrderAnalyticsCalculator.AmountDifference(amount, previousAmount);
        var recent = UnusualMonth.Of(amount, earlierAmounts);

        return new MonthlyReportCellDto(
            period.Month,
            period,
            request.OrderRequestId,
            request.Version,
            request.Status,
            amount,
            found.ItemCount,
            found.MissingPriceItemCount,
            found.MissingPriceItemCount == 0,
            previousAmount,
            delta,
            percent,
            recent.RecentAverage,
            recent.RecentAveragePercent,
            recent.IsUnusual,
            historical.Contains(request.OrderRequestId),
            AmountOf(found.OutsideMonthly),
            found.OutsideMonthly.ItemCount,
            AmountOf(found.Unclassified),
            found.Unclassified.ItemCount);
    }

    /// <summary>The month's monthly money: what every comparison on this report is built from.</summary>
    private static decimal? KnownAmountOf(RequestRef request, Dictionary<long, RequestTotals> totals) =>
        AmountOf(Found(request, totals).Monthly);

    private static RequestTotals Found(RequestRef request, Dictionary<long, RequestTotals> totals) =>
        totals.GetValueOrDefault(request.OrderRequestId) ?? RequestTotals.Empty;

    // A side whose every line is unpriced has unknown money, not zero money.
    // To the cent here, where it is computed, so a cell minus the cell before it is the difference the row
    // prints between them — and so the year total is the cells added up.
    private static decimal? AmountOf(Side side) =>
        side.KnownPriceItemCount == 0 ? null : Money.RoundCents(side.PricedAmount);

    private static List<MonthlyReportMonthDto> Months(int year, List<MonthlyReportRowDto> rows)
    {
        var months = new List<MonthlyReportMonthDto>(12);
        for (var month = 1; month <= 12; month++)
        {
            var index = month - 1;
            decimal? amount = null;
            decimal? outside = null;
            decimal? unclassified = null;
            var outsideItems = 0;
            var unclassifiedItems = 0;
            var missing = 0;
            var withRequest = 0;

            foreach (var row in rows)
            {
                var cell = row.Months[index];
                if (cell.OrderRequestId is null)
                {
                    continue;
                }

                withRequest++;
                missing += cell.MissingPriceItemCount;
                outsideItems += cell.OutsideMonthlyItemCount;
                unclassifiedItems += cell.UnclassifiedItemCount;
                amount = Add(amount, cell.KnownAmount);
                outside = Add(outside, cell.OutsideMonthlyKnownAmount);
                unclassified = Add(unclassified, cell.UnclassifiedKnownAmount);
            }

            months.Add(new MonthlyReportMonthDto(
                month, new DateOnly(year, month, 1), withRequest, amount, missing, missing == 0,
                outside, outsideItems, unclassified, unclassifiedItems));
        }

        return months;
    }

    private static CompanyTotalsResult CompanyTotals(List<MonthlyReportRowDto> rows)
    {
        decimal? amount = null;
        decimal? outside = null;
        decimal? unclassified = null;
        var outsideItems = 0;
        var unclassifiedItems = 0;
        var missing = 0;
        var requests = 0;

        foreach (var row in rows)
        {
            requests += row.RequestCount;
            missing += row.MissingPriceItemCount;
            outsideItems += row.OutsideMonthlyItemCount;
            unclassifiedItems += row.UnclassifiedItemCount;
            amount = Add(amount, row.KnownAmount);
            outside = Add(outside, row.OutsideMonthlyKnownAmount);
            unclassified = Add(unclassified, row.UnclassifiedKnownAmount);
        }

        return new CompanyTotalsResult(amount, missing, requests, outside, outsideItems, unclassified, unclassifiedItems);
    }

    /// <summary>Unknown money stays unknown: a null plus a null is a null, never a zero.</summary>
    private static decimal? Add(decimal? running, decimal? value) =>
        value is null ? running : (running ?? 0m) + value.Value;

    private sealed record CompanyTotalsResult(
        decimal? KnownAmount,
        int MissingPriceItemCount,
        int RequestCount,
        decimal? OutsideMonthlyKnownAmount,
        int OutsideMonthlyItemCount,
        decimal? UnclassifiedKnownAmount,
        int UnclassifiedItemCount);

    /// <summary>The same normalizer the rest of the system searches with: case- and spacing-insensitive, never fuzzy.</summary>
    private static bool Matches(List<LocationRef> locations, MonthlyReportRowDto row, string needle)
    {
        var location = locations.First(candidate => candidate.Id == row.LocationId);

        return location.NormalizedName.Contains(needle, StringComparison.Ordinal)
            || location.Code.Contains(needle, StringComparison.OrdinalIgnoreCase);
    }

    private sealed record LocationRef(int Id, string Code, string Name, bool IsActive, string NormalizedName);

    private sealed record RequestRef(
        int LocationId, DateOnly Period, long OrderRequestId, int Version, OrderRequestStatus Status);

    /// <param name="MissingPriceItemCount">Lines somebody owes a price for. The only kind that is a gap.</param>
    /// <param name="PriceNotRequiredItemCount">Lines issued from the company's own store, complete as they are.</param>
    private sealed record RequestTotals(
        int ItemCount,
        int KnownPriceItemCount,
        int MissingPriceItemCount,
        int PriceNotRequiredItemCount,
        Side Monthly,
        Side OutsideMonthly,
        Side Unclassified)
    {
        public static readonly RequestTotals Empty =
            new(0, 0, 0, 0, Side.Empty, Side.Empty, Side.Empty);
    }

    /// <summary>One line type's share of a request: kept apart so no comparison can be built on the wrong one.</summary>
    private sealed record Side(int ItemCount, int KnownPriceItemCount, decimal PricedAmount)
    {
        public static readonly Side Empty = new(0, 0, 0m);
    }
}
