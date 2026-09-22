using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Infrastructure.Persistence;

/// <summary>
/// Issues product codes from a SQL Server sequence. NEXT VALUE FOR is atomic, so concurrent callers never
/// receive the same number, unlike SELECT MAX(...) + 1.
/// </summary>
internal sealed class SqlServerProductCodeGenerator(BaxOrdersDbContext db) : IProductCodeGenerator
{
    public const string SequenceName = "ProductCodeNumbers";

    // NEXT VALUE FOR is not allowed inside a derived table, so this query must not be composed
    // (no FirstAsync/SingleAsync, which would wrap it in a subquery).
    private const string NextNumberSql = "SELECT NEXT VALUE FOR [dbo].[" + SequenceName + "] AS [Value]";

    public async Task<string> NextAsync(CancellationToken cancellationToken)
    {
        var numbers = await db.Database.SqlQueryRaw<long>(NextNumberSql).ToListAsync(cancellationToken);
        return ProductCode.FromNumber(numbers.Single());
    }
}
