using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Locations;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Infrastructure.Persistence;

/// <summary>
/// Issues location codes from a PostgreSQL sequence. nextval is atomic, so concurrent reviewers never receive
/// the same number, unlike SELECT MAX(...) + 1.
/// </summary>
internal sealed class PostgresLocationCodeGenerator(BaxOrdersDbContext db) : ILocationCodeGenerator
{
    public const string SequenceName = "LocationCodeNumbers";

    // The sequence is created with its name as written, so it has to be quoted to be found again.
    private const string NextNumberSql = "SELECT nextval('\"" + SequenceName + "\"') AS \"Value\"";

    public async Task<string> NextAsync(CancellationToken cancellationToken)
    {
        var numbers = await db.Database.SqlQueryRaw<long>(NextNumberSql).ToListAsync(cancellationToken);
        return LocationCode.FromNumber(numbers.Single());
    }
}
