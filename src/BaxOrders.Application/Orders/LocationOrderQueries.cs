using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Imports;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Orders;

/// <summary>
/// The permanent-order browser's entry point: which locations have requests, and the request history of one.
/// </summary>
/// <remarks>
/// Everything here reads and projects; no aggregate is loaded to be thrown away. Money is only ever the sum
/// over items whose price is known — <see cref="KnownAmount"/> explains why that distinction matters.
/// </remarks>
public sealed class LocationOrderQueries(IBaxOrdersDbContext db)
{
    public const int MaxPageSize = 100;

    public async Task<LocationOrderListDto> ListAsync(LocationOrderListQuery query, CancellationToken cancellationToken)
    {
        var (page, pageSize) = Paging.Of(query.Page, query.PageSize, 25);

        var locations = db.Locations.AsNoTracking();
        if (!query.IncludeInactive)
        {
            locations = locations.Where(location => location.IsActive);
        }

        if (Search.Of(query.Search) is { } search)
        {
            locations = locations.Where(location =>
                location.NormalizedName.Contains(search) || location.Code.ToLower().Contains(search));
        }

        // Ordering happens on the source query, not on the projection: a sort key that is itself a subquery
        // is still translatable there, so paging stays in SQL.
        var ordered = (query.Sort, query.Descending) switch
        {
            (LocationOrderSort.LatestPeriod, false) => locations
                .OrderBy(location => db.OrderRequests.Where(request => request.LocationId == location.Id)
                    .Max(request => (DateOnly?)request.RequestPeriod))
                .ThenBy(location => location.Name),
            (LocationOrderSort.LatestPeriod, true) => locations
                .OrderByDescending(location => db.OrderRequests.Where(request => request.LocationId == location.Id)
                    .Max(request => (DateOnly?)request.RequestPeriod))
                .ThenBy(location => location.Name),
            (LocationOrderSort.OrderRequestCount, false) => locations
                .OrderBy(location => db.OrderRequests.Count(request => request.LocationId == location.Id))
                .ThenBy(location => location.Name),
            (LocationOrderSort.OrderRequestCount, true) => locations
                .OrderByDescending(location => db.OrderRequests.Count(request => request.LocationId == location.Id))
                .ThenBy(location => location.Name),
            (_, true) => locations.OrderByDescending(location => location.Name),
            _ => locations.OrderBy(location => location.Name),
        };

        var totalCount = await locations.CountAsync(cancellationToken);

        // Correlated projections instead of loaded graphs: one query answers the whole page.
        var items = await ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(location => new LocationOrderSummaryDto(
                location.Id,
                location.Code,
                location.Name,
                location.IsActive,
                db.OrderRequests.Count(request => request.LocationId == location.Id),
                db.OrderRequests.Where(request => request.LocationId == location.Id)
                    .Select(request => request.RequestPeriod).Distinct().Count(),
                db.OrderRequests.Where(request => request.LocationId == location.Id)
                    .Min(request => (DateOnly?)request.RequestPeriod),
                db.OrderRequests.Where(request => request.LocationId == location.Id)
                    .Max(request => (DateOnly?)request.RequestPeriod),
                db.OrderRequests.Where(request => request.LocationId == location.Id)
                    .OrderByDescending(request => request.RequestPeriod).ThenByDescending(request => request.Version)
                    .Select(request => (long?)request.Id).FirstOrDefault(),
                db.OrderRequests.Where(request => request.LocationId == location.Id)
                    .OrderByDescending(request => request.RequestPeriod).ThenByDescending(request => request.Version)
                    .Select(request => (int?)request.Version).FirstOrDefault(),
                db.OrderRequests.Where(request => request.LocationId == location.Id)
                    .OrderByDescending(request => request.RequestPeriod).ThenByDescending(request => request.Version)
                    .Select(request => (OrderRequestStatus?)request.Status).FirstOrDefault(),
                db.OrderRequestItems.Count(item => item.OrderRequest.LocationId == location.Id),
                db.OrderRequestItems.Where(item => item.OrderRequest.LocationId == location.Id)
                    .Sum(item => (decimal?)(item.Quantity * item.UnitPrice)),
                db.OrderRequestItems.Count(item => item.OrderRequest.LocationId == location.Id && item.UnitPrice == null)))
            .ToListAsync(cancellationToken);

        // SQL sums an empty set to zero once EF wraps it; "no priced line at all" must stay unknown instead.
        items = [.. items.Select(row => row.TotalItemCount - row.MissingPriceItemCount == 0
            ? row with { KnownAmountTotal = null }
            : row)];

        items = await WithLatestOrderAsync(items, cancellationToken);

        // The header counts describe the whole catalogue, not the page in front of the operator.
        var catalogue = db.Locations.AsNoTracking().Where(location => query.IncludeInactive || location.IsActive);

        return new LocationOrderListDto(
            new PagedResult<LocationOrderSummaryDto>(items, page, pageSize, totalCount),
            await catalogue.CountAsync(cancellationToken),
            await catalogue.CountAsync(location => db.OrderRequests.Any(request => request.LocationId == location.Id), cancellationToken),
            await db.OrderRequests.CountAsync(cancellationToken),
            await db.OrderRequests.MinAsync(request => (DateOnly?)request.RequestPeriod, cancellationToken),
            await db.OrderRequests.MaxAsync(request => (DateOnly?)request.RequestPeriod, cancellationToken));
    }

    /// <summary>
    /// Fills in what each listed location ordered last, and how that compares with the month before it.
    /// </summary>
    /// <remarks>
    /// Two queries for the whole page, not two per row: the previous months of every listed location at once,
    /// then the lines of both sides at once. The work is bounded by the page size, so a catalogue of thousands
    /// costs the same as one of thirty.
    /// </remarks>
    private async Task<List<LocationOrderSummaryDto>> WithLatestOrderAsync(
        List<LocationOrderSummaryDto> items, CancellationToken cancellationToken)
    {
        var ordered = items.Where(row => row is { LatestRequestId: not null, LatestPeriod: not null }).ToList();
        if (ordered.Count == 0)
        {
            return items;
        }

        var locationIds = ordered.Select(row => row.LocationId).ToArray();
        var previousPeriods = ordered
            .Select(row => row.LatestPeriod!.Value.AddMonths(-1))
            .Distinct()
            .ToArray();

        // The month before each location's latest, at its own highest version — the policy every analytics
        // screen follows, so the difference shown here is the difference shown there.
        var previous = await db.OrderRequests.AsNoTracking()
            .Where(request => locationIds.Contains(request.LocationId)
                && previousPeriods.Contains(request.RequestPeriod)
                && !db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version))
            .Select(request => new { request.LocationId, request.RequestPeriod, request.Id })
            .ToListAsync(cancellationToken);

        var previousByLocation = previous.ToDictionary(row => (row.LocationId, row.RequestPeriod), row => row.Id);

        long[] requestIds =
        [
            .. ordered.Select(row => row.LatestRequestId!.Value),
            .. previous.Select(row => row.Id),
        ];

        var totals = await db.OrderRequestItems.AsNoTracking()
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
            .ToDictionaryAsync(row => row.OrderRequestId, cancellationToken);

        decimal? KnownAmount(long requestId) =>
            totals.TryGetValue(requestId, out var found) && found.KnownPriceItemCount > 0
                ? found.PricedAmount
                : null;

        return
        [
            .. items.Select(row =>
            {
                if (row is not { LatestRequestId: { } latestId, LatestPeriod: { } latestPeriod })
                {
                    return row;
                }

                var previousPeriod = latestPeriod.AddMonths(-1);
                var latest = totals.GetValueOrDefault(latestId);
                var latestAmount = KnownAmount(latestId);
                var previousAmount = previousByLocation.TryGetValue((row.LocationId, previousPeriod), out var previousId)
                    ? KnownAmount(previousId)
                    : null;
                var (delta, percent) = OrderAnalyticsCalculator.AmountDifference(latestAmount, previousAmount);

                return row with
                {
                    LatestKnownAmount = latestAmount,
                    LatestItemCount = latest?.ItemCount ?? 0,
                    // Only the prices somebody owes. Material issued from the company's own store carries
                    // no purchase price and is not a shortfall, so it never lands in this count.
                    LatestMissingPriceItemCount = latest?.MissingRequiredPriceItemCount ?? 0,
                    LatestPriceNotRequiredItemCount = latest?.PriceNotRequiredItemCount ?? 0,
                    LatestAmountIsComplete = (latest?.MissingRequiredPriceItemCount ?? 0) == 0,
                    PreviousPeriod = previousPeriod,
                    PreviousKnownAmount = previousAmount,
                    KnownAmountDelta = delta,
                    KnownAmountPercentChange = percent,
                };
            }),
        ];
    }

    /// <returns>Null when the location does not exist.</returns>
    public async Task<LocationOrderHistoryDto?> GetHistoryAsync(
        int locationId, LocationHistoryQuery query, CancellationToken cancellationToken)
    {
        // Header and totals in one query, as correlated subqueries over the location row: a location with no
        // request answers zeroes rather than nothing, and a missing location is the one null to check.
        var header = await db.Locations.AsNoTracking()
            .Where(item => item.Id == locationId)
            .Select(item => new
            {
                item.Id,
                item.Code,
                item.Name,
                item.IsActive,
                RequestCount = db.OrderRequests.Count(request => request.LocationId == item.Id),
                PeriodCount = db.OrderRequests.Where(request => request.LocationId == item.Id)
                    .Select(request => request.RequestPeriod).Distinct().Count(),
                Earliest = db.OrderRequests.Where(request => request.LocationId == item.Id)
                    .Min(request => (DateOnly?)request.RequestPeriod),
                Latest = db.OrderRequests.Where(request => request.LocationId == item.Id)
                    .Max(request => (DateOnly?)request.RequestPeriod),
                ItemCount = db.OrderRequestItems.Count(line => line.OrderRequest.LocationId == item.Id),
                KnownAmount = db.OrderRequestItems.Where(line => line.OrderRequest.LocationId == item.Id)
                    .Sum(line => (decimal?)(line.Quantity * line.UnitPrice)),
                MissingPrice = db.OrderRequestItems
                    .Count(line => line.OrderRequest.LocationId == item.Id && line.UnitPrice == null),
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (header is null)
        {
            return null;
        }

        var (page, pageSize) = Paging.Of(query.Page, query.PageSize, 25);
        var all = db.OrderRequests.AsNoTracking().Where(request => request.LocationId == locationId);

        var years = await all
            .Select(request => request.RequestPeriod.Year)
            .Distinct()
            .OrderByDescending(year => year)
            .ToListAsync(cancellationToken);

        // The month filter is a period filter: the request date is optional and often absent.
        var filtered = all;
        if (query.Year is { } year2)
        {
            filtered = filtered.Where(request => request.RequestPeriod.Year == year2);
        }

        if (query.Month is { } month)
        {
            filtered = filtered.Where(request => request.RequestPeriod.Month == month);
        }

        var totalCount = await filtered.CountAsync(cancellationToken);
        var requests = await filtered
            .OrderByDescending(request => request.RequestPeriod)
            .ThenByDescending(request => request.Version)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(request => new LocationOrderHistoryEntryDto(
                request.Id,
                request.RequestPeriod,
                request.Version,
                request.RequestDate,
                request.Status,
                request.Items.Count,
                request.Items.Count(item => item.UnitPrice != null),
                request.Items.Count(item => item.UnitPrice == null),
                request.Items.Sum(item => (decimal?)(item.Quantity * item.UnitPrice)),
                request.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        requests = [.. requests.Select(request => request.KnownPriceItemCount == 0
            ? request with { KnownAmountTotal = null }
            : request)];

        return new LocationOrderHistoryDto(
            header.Id,
            header.Code,
            header.Name,
            header.IsActive,
            header.RequestCount,
            header.PeriodCount,
            header.Earliest,
            header.Latest,
            header.ItemCount,
            // SQL sums an empty set to zero; "no priced line at all" must stay unknown instead.
            header.ItemCount - header.MissingPrice == 0 ? null : header.KnownAmount,
            header.MissingPrice,
            years,
            new PagedResult<LocationOrderHistoryEntryDto>(requests, page, pageSize, totalCount));
    }
}

/// <summary>Page numbers and sizes the API accepts, so no caller can ask for the whole table at once.</summary>
internal static class Paging
{
    public static (int Page, int PageSize) Of(int page, int pageSize, int fallback) =>
        (Math.Max(1, page), pageSize <= 0 ? fallback : Math.Min(pageSize, LocationOrderQueries.MaxPageSize));
}

internal static class Search
{
    /// <summary>The normalized needle, or null when there is nothing to search for.</summary>
    public static string? Of(string? search)
    {
        var normalized = TextNormalizer.Normalize(search);
        return normalized.Length == 0 ? null : normalized;
    }
}
