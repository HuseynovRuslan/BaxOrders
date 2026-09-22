namespace BaxOrders.Application.Abstractions;

/// <summary>
/// Serializes the decisions taken about one order request: the lock is held until the current transaction
/// ends, so two people cannot, at the same moment, correct a returned request and send it back unchanged.
/// </summary>
/// <remarks>
/// A row version cannot do this job on its own. Making a correction version does not change the returned one
/// — it must not — so there is no version for the other action to trip over.
/// </remarks>
public interface IOrderRequestLock
{
    Task AcquireAsync(long orderRequestId, CancellationToken cancellationToken);
}
