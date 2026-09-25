using BaxOrders.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Infrastructure.Persistence;

/// <summary>
/// Takes one application-wide advisory lock for product-match decisions. PostgreSQL holds it until the transaction
/// commits or rolls back.
/// </summary>
/// <remarks>
/// A transaction-scoped advisory lock rather than a row lock, because the decisions that could conflict insert new
/// rows rather than change existing ones. Readers are not blocked. It only means anything inside a transaction,
/// which every caller opens.
/// </remarks>
internal sealed class PostgresProductMatchLock(BaxOrdersDbContext db) : IProductMatchLock
{
    /// <summary>An arbitrary, fixed key that no other lock in the application uses.</summary>
    public const long Key = 1_300_013_001;

    public Task AcquireAsync(CancellationToken cancellationToken) =>
        db.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock({Key})", cancellationToken);
}
