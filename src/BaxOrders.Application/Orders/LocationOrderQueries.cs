using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Orders;
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
                location.NormalizedName.Contains(search) || location.Code.Contains(search));
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
