using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.UnitsOfMeasure;

public sealed record UnitOfMeasureSummary(int Id, string Code, string Name, string Symbol, UnitType UnitType, bool IsActive);

public sealed class UnitOfMeasureQueries(IBaxOrdersDbContext db)
{
    public async Task<IReadOnlyList<UnitOfMeasureSummary>> ListAsync(CancellationToken cancellationToken) =>
        await db.UnitsOfMeasure
            .AsNoTracking()
            .OrderBy(unit => unit.Code)
            .Select(unit => new UnitOfMeasureSummary(unit.Id, unit.Code, unit.Name, unit.Symbol, unit.UnitType, unit.IsActive))
            .ToListAsync(cancellationToken);
}
