namespace BaxOrders.Application.Abstractions;

/// <summary>
/// Serializes the review decisions of one import batch: the lock is held until the current transaction ends, so
/// two decisions cannot re-match rows and recount the summary at the same time.
/// </summary>
public interface IImportBatchLock
{
    Task AcquireAsync(long importBatchId, CancellationToken cancellationToken);
}
