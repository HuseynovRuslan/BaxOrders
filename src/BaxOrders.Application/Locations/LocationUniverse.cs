using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Locations;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Locations;

/// <summary>
/// Which objects a screen counts and lists — one rule, read by every screen.
/// </summary>
/// <remarks>
/// <para>
/// <b>The rule.</b> For a stretch of time, the objects are every active object, together with every object that
/// has an order inside that stretch. An object the company still works with is counted whether or not it
/// ordered; an object that has since been deactivated is still counted in the months it ordered, so switching
/// one off never takes its money out of a month that has already been read.
/// </para>
/// <para>
/// <b>Why one rule.</b> The dashboard used to count the objects that had ever ordered, the monthly report the
/// active ones plus anything with orders, and the Obyektlər page only the active ones — so the same company was
/// "24 / 26" on one screen and "29" on the two others, and none of the three could be checked against another.
/// Every screen now asks this class, for the month, the year or all time it is showing.
/// </para>
/// </remarks>
public static class LocationUniverse
{
    /// <summary>The objects of one month: the dashboard's rows and its partition.</summary>
    public static IQueryable<Location> ForMonth(IBaxOrdersDbContext db, DateOnly period) => Between(db, period, period);

    /// <summary>The objects of a calendar year: the monthly report's rows.</summary>
    public static IQueryable<Location> ForYear(IBaxOrdersDbContext db, int year) =>
        Between(db, new DateOnly(year, 1, 1), new DateOnly(year, 12, 1));

    /// <summary>The objects of the company's whole history: the Obyektlər page and the location lists.</summary>
    public static IQueryable<Location> AllTime(IBaxOrdersDbContext db) => Between(db, DateOnly.MinValue, DateOnly.MaxValue);

    /// <summary>The rule itself: active, or ordered in a month from <paramref name="from"/> to <paramref name="to"/>.</summary>
    /// <param name="from">The first month, inclusive.</param>
    /// <param name="to">The last month, inclusive.</param>
    public static IQueryable<Location> Between(IBaxOrdersDbContext db, DateOnly from, DateOnly to)
    {
        ArgumentNullException.ThrowIfNull(db);

        return db.Locations.AsNoTracking()
            .Where(location => location.IsActive
                || db.OrderRequests.Any(request => request.LocationId == location.Id
                    && request.RequestPeriod >= from
                    && request.RequestPeriod <= to));
    }
}
