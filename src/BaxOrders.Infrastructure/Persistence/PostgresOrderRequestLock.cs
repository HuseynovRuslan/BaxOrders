using BaxOrders.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Infrastructure.Persistence;

/// <summary>
/// Takes a row lock on the order request. PostgreSQL holds it until the transaction commits or rolls back.
/// </summary>
/// <remarks>
/// FOR UPDATE blocks other writers that ask for the same row and leaves plain readers alone. It is what keeps
/// a correction and a workflow transition from happening to one request at the same moment, and it only means
/// anything inside a transaction — which both callers open.
/// </remarks>
internal sealed class PostgresOrderRequestLock(BaxOrdersDbContext db) : IOrderRequestLock
{
    public Task AcquireAsync(long orderRequestId, CancellationToken cancellationToken) =>
        db.Database.ExecuteSqlAsync(
            $"SELECT 1 FROM \"OrderRequests\" WHERE \"Id\" = {orderRequestId} FOR UPDATE", cancellationToken);
}
