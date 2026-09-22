using BaxOrders.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Infrastructure.Persistence;

/// <summary>
/// Takes a row lock on the import batch. PostgreSQL holds it until the transaction commits or rolls back, so
/// two decisions about one batch are serialised rather than interleaved.
/// </summary>
/// <remarks>
/// FOR UPDATE blocks other writers that ask for the same row and leaves plain readers alone — the same
/// bargain SQL Server's UPDLOCK made here before. It only means anything inside a transaction, which every
/// caller of this opens.
/// </remarks>
internal sealed class PostgresImportBatchLock(BaxOrdersDbContext db) : IImportBatchLock
{
    public Task AcquireAsync(long importBatchId, CancellationToken cancellationToken) =>
        db.Database.ExecuteSqlAsync(
            $"SELECT 1 FROM \"ImportBatches\" WHERE \"Id\" = {importBatchId} FOR UPDATE", cancellationToken);
}
