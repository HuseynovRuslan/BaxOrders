using BaxOrders.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Infrastructure.Persistence;

/// <summary>
/// Takes an update lock on the order request's row. SQL Server holds it until the transaction commits or
/// rolls back. An update lock, not an exclusive one: readers are not blocked, only other writers that ask for it.
/// </summary>
internal sealed class SqlServerOrderRequestLock(BaxOrdersDbContext db) : IOrderRequestLock
{
    public Task AcquireAsync(long orderRequestId, CancellationToken cancellationToken) =>
        db.Database.ExecuteSqlAsync(
            $"SELECT 1 FROM [OrderRequests] WITH (UPDLOCK, ROWLOCK) WHERE [Id] = {orderRequestId}", cancellationToken);
}
