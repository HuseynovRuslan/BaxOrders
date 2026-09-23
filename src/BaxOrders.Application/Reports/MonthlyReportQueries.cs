using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Orders;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Reports;

/// <summary>
/// A year of the company's ordering, location by location and month by month.
/// </summary>
/// <remarks>
/// <para>
/// Four queries whatever the size of the year: the locations, the requests of the thirteen months the report
/// needs, the lines of those requests, and the years that can be asked for. Nothing here loops over locations
/// or months to fetch anything, because a report of 26 locations and 12 months would then be 312 round trips.
/// </para>
/// <para>
/// <b>Thirteen months, not twelve.</b> January's difference is against the December before it, so the December
/// of the previous year is fetched as well and then left out of the report's own totals.
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

        // The report's universe is the directory of objects management watches, not the set that happens to
        // have ordered: a location that submitted nothing all year is exactly the row a yearly report exists to
        // surface, and dropping it would hide the omission instead of showing it.
        //
        // A location that has ordered is kept whether or not it is still active, so deactivating one never
        // retroactively removes its money from a year that has already been read and reconciled.
        //
        // This is deliberately a wider universe than the management dashboard's, which compares months and so
        // is built only from locations with order history. The two answer different questions and are allowed
        // to differ; neither was changed to make the other's counts match.
        var locations = await db.Locations.AsNoTracking()
            .Where(location => location.IsActive
                || db.OrderRequests.Any(request => request.LocationId == location.Id))
            .Select(location => new LocationRef(location.Id, location.Code, location.Name, location.IsActive, location.NormalizedName))
            .ToListAsync(cancellationToken);

        // Asked for nothing in particular, the report opens on the year that has something in it rather than on
        // today's, which early in January would be twelve empty columns.
        var year = query.Year ?? (availableYears.Count > 0 ? availableYears[0] : DateTime.UtcNow.Year);

        var from = new DateOnly(year - 1, 12, 1);
        var to = new DateOnly(year, 12, 1);

        var requests = await db.OrderRequests.AsNoTracking()
            .Where(request => request.RequestPeriod >= from
                && request.RequestPeriod <= to
                && !db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version))
            .Select(request => new RequestRef(
                request.LocationId, request.RequestPeriod, request.Id, request.Version, request.Status))
            .ToListAsync(cancellationToken);

        var totals = await TotalsAsync([.. requests.Select(request => request.OrderRequestId)], cancellationToken);

        var byLocation = requests
            .GroupBy(request => request.LocationId)
            .ToDictionary(group => group.Key, group => group.ToDictionary(request => request.Period));

        var rows = new List<MonthlyReportRowDto>(locations.Count);
        foreach (var location in locations.OrderBy(location => location.Name, StringComparer.OrdinalIgnoreCase))
        {
            rows.Add(Build(location, year, byLocation.GetValueOrDefault(location.Id) ?? [], totals));
        }

        var months = Months(year, rows);
        var (knownAmount, missingPrices, requestCount) = CompanyTotals(rows);

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
            requestCount,
            knownAmount,
            missingPrices,
            missingPrices == 0);
    }

    // ---- reading ------------------------------------------------------------------------------------

    /// <summary>The lines of every request in the window, added up once per request rather than once per cell.</summary>
    private async Task<Dictionary<long, RequestTotals>> TotalsAsync(
        long[] requestIds, CancellationToken cancellationToken)
    {
        if (requestIds.Length == 0)
        {
            return [];
        }

        var rows = await db.OrderRequestItems.AsNoTracking()
            .Where(item => requestIds.Contains(item.OrderRequestId))
            .GroupBy(item => item.OrderRequestId)
            .Select(group => new
            {
                OrderRequestId = group.Key,
                ItemCount = group.Count(),
                KnownPriceItemCount = group.Count(item => item.UnitPrice != null),
                // A price is only missing when it was owed. See SupplierPriceRequirement for why this is a
                // recorded property of the supplier and never a guess from its name. No supplier at all is
                // read as "bought": nothing has said otherwise, and assuming internal supply would hide a gap.
                MissingRequiredPriceItemCount = group.Count(item => item.UnitPrice == null
                    && (item.Supplier == null || item.Supplier.PriceRequirement == SupplierPriceRequirement.Required)),
                PriceNotRequiredItemCount = group.Count(item => item.UnitPrice == null
                    && item.Supplier != null && item.Supplier.PriceRequirement == SupplierPriceRequirement.NotRequired),
                PricedAmount = group.Sum(item => item.Quantity * (item.UnitPrice ?? 0m)),
            })
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(
            row => row.OrderRequestId,
            row => new RequestTotals(
                row.ItemCount,
                row.KnownPriceItemCount,
                row.MissingRequiredPriceItemCount,
                row.PriceNotRequiredItemCount,
                row.PricedAmount));
    }

    // ---- shaping ------------------------------------------------------------------------------------

    private static MonthlyReportRowDto Build(
        LocationRef location,
        int year,
        Dictionary<DateOnly, RequestRef> requests,
        Dictionary<long, RequestTotals> totals)
    {
        var cells = new List<MonthlyReportCellDto>(12);
        decimal? yearAmount = null;
        var yearMissing = 0;
        var requestCount = 0;
        var without = 0;

        for (var month = 1; month <= 12; month++)
        {
            var period = new DateOnly(year, month, 1);
            var cell = Cell(period, requests, totals);
            cells.Add(cell);

            if (cell.OrderRequestId is null)
            {
                without++;
                continue;
            }

            requestCount++;
            yearMissing += cell.MissingPriceItemCount;
            if (cell.KnownAmount is { } amount)
            {
                yearAmount = (yearAmount ?? 0m) + amount;
            }
        }

        return new MonthlyReportRowDto(
            location.Id, location.Code, location.Name, location.IsActive,
            cells, requestCount, yearAmount, yearMissing, without);
    }

    private static MonthlyReportCellDto Cell(
        DateOnly period,
        Dictionary<DateOnly, RequestRef> requests,
        Dictionary<long, RequestTotals> totals)
    {
        // The month before, which for January is the December that was fetched alongside the year.
        var previousAmount = requests.TryGetValue(period.AddMonths(-1), out var previous)
            ? KnownAmountOf(previous, totals)
            : null;

        if (!requests.TryGetValue(period, out var request))
        {
            // No request: no amount, no difference, and nothing that could be mistaken for a zero.
            return new MonthlyReportCellDto(
                period.Month, period, null, null, null, null, 0, 0, true, previousAmount, null, null);
        }

        var found = totals.GetValueOrDefault(request.OrderRequestId) ?? RequestTotals.Empty;
        var amount = KnownAmountOf(request, totals);
        var (delta, percent) = OrderAnalyticsCalculator.AmountDifference(amount, previousAmount);

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
            percent);
    }

    private static decimal? KnownAmountOf(RequestRef request, Dictionary<long, RequestTotals> totals)
    {
        var found = totals.GetValueOrDefault(request.OrderRequestId) ?? RequestTotals.Empty;

        // A request whose every line is unpriced has unknown money, not zero money.
        return found.KnownPriceItemCount == 0 ? null : found.PricedAmount;
    }

    private static List<MonthlyReportMonthDto> Months(int year, List<MonthlyReportRowDto> rows)
    {
        var months = new List<MonthlyReportMonthDto>(12);
        for (var month = 1; month <= 12; month++)
        {
            var index = month - 1;
            decimal? amount = null;
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
                if (cell.KnownAmount is { } value)
                {
                    amount = (amount ?? 0m) + value;
                }
            }

            months.Add(new MonthlyReportMonthDto(
                month, new DateOnly(year, month, 1), withRequest, amount, missing, missing == 0));
        }

        return months;
    }

    private static (decimal? KnownAmount, int MissingPriceItemCount, int RequestCount) CompanyTotals(
        List<MonthlyReportRowDto> rows)
    {
        decimal? amount = null;
        var missing = 0;
        var requests = 0;

        foreach (var row in rows)
        {
            requests += row.RequestCount;
            missing += row.MissingPriceItemCount;
            if (row.KnownAmount is { } value)
            {
                amount = (amount ?? 0m) + value;
            }
        }

        return (amount, missing, requests);
    }

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
        decimal PricedAmount)
    {
        public static readonly RequestTotals Empty = new(0, 0, 0, 0, 0m);
    }
}
