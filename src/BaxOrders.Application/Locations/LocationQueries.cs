using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Locations;

public sealed record LocationSummary(int Id, string Code, string Name, bool IsActive);

public sealed class LocationQueries(IBaxOrdersDbContext db)
{
    /// <param name="includeInactive">
    /// False lists the company's objects the way every screen counts them (<see cref="LocationUniverse"/>); true
    /// adds any inactive object that never ordered.
    /// </param>
    public async Task<IReadOnlyList<LocationSummary>> ListAsync(bool includeInactive, CancellationToken cancellationToken)
    {
        var locations = includeInactive ? db.Locations.AsNoTracking() : LocationUniverse.AllTime(db);

        var found = await locations
            .Select(location => new LocationSummary(location.Id, location.Code, location.Name, location.IsActive))
            .ToListAsync(cancellationToken);

        return [.. found.OrderByName(location => location.Name)];
    }
}
