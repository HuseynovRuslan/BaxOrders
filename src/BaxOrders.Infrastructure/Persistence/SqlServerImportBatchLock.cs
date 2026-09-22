using BaxOrders.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Infrastructure.Persistence;

/// <summary>
/// Takes an exclusive row lock on the import batch. SQL Server holds it until the transaction commits or rolls back.
/// </summary>
internal sealed class SqlServerImportBatchLock(BaxOrdersDbContext db) : IImportBatchLock
{
    public Task AcquireAsync(long importBatchId, CancellationToken cancellationToken) =>
        db.Database.ExecuteSqlAsync($"SELECT 1 FROM [ImportBatches] WITH (UPDLOCK, ROWLOCK) WHERE [Id] = {importBatchId}", cancellationToken);
}
