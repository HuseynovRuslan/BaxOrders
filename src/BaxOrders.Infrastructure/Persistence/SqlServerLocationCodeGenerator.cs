using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Locations;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Infrastructure.Persistence;

/// <summary>
/// Issues location codes from a SQL Server sequence. NEXT VALUE FOR is atomic, so concurrent reviewers never
/// receive the same number, unlike SELECT MAX(...) + 1.
/// </summary>
internal sealed class SqlServerLocationCodeGenerator(BaxOrdersDbContext db) : ILocationCodeGenerator
{
    public const string SequenceName = "LocationCodeNumbers";

    // NEXT VALUE FOR is not allowed inside a derived table, so this query must not be composed
    // (no FirstAsync/SingleAsync, which would wrap it in a subquery).
    private const string NextNumberSql = "SELECT NEXT VALUE FOR [dbo].[" + SequenceName + "] AS [Value]";

    public async Task<string> NextAsync(CancellationToken cancellationToken)
    {
        var numbers = await db.Database.SqlQueryRaw<long>(NextNumberSql).ToListAsync(cancellationToken);
        return LocationCode.FromNumber(numbers.Single());
    }
}
