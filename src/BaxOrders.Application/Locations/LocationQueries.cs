using BaxOrders.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Locations;

public sealed record LocationSummary(int Id, string Code, string Name, bool IsActive);

public sealed class LocationQueries(IBaxOrdersDbContext db)
{
    public async Task<IReadOnlyList<LocationSummary>> ListAsync(bool includeInactive, CancellationToken cancellationToken)
    {
        var locations = db.Locations.AsNoTracking();
        if (!includeInactive)
        {
            locations = locations.Where(location => location.IsActive);
        }

        return await locations
            .OrderBy(location => location.Name)
            .Select(location => new LocationSummary(location.Id, location.Code, location.Name, location.IsActive))
            .ToListAsync(cancellationToken);
    }
}
