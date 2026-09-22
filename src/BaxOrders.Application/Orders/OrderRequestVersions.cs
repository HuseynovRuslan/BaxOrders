using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Orders;

/// <summary>
/// Version lookups for logical requests, which are identified by location + request period.
/// </summary>
public sealed class OrderRequestVersions(IBaxOrdersDbContext db)
{
    /// <summary>
    /// Returns the highest version for the location and period, or null if none exists yet.
    /// The result is tracked and has its location loaded, so a next version can be created from it.
    /// </summary>
    public Task<OrderRequest?> FindLatestAsync(int locationId, DateOnly requestPeriod, CancellationToken cancellationToken)
    {
        if (requestPeriod != OrderRequest.PeriodOf(requestPeriod))
        {
            throw new ArgumentException("Request period must be the first day of a month.", nameof(requestPeriod));
        }

        return db.OrderRequests
            .Include(request => request.Location)
            .Where(request => request.LocationId == locationId && request.RequestPeriod == requestPeriod)
            .OrderByDescending(request => request.Version)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
