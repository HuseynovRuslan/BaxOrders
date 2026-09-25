namespace BaxOrders.Application.Abstractions;

/// <summary>
/// Serializes every product-match decision in the application: the lock is held until the current transaction
/// ends, so two administrators cannot, at the same moment, approve two matches that together make a chain.
/// </summary>
/// <remarks>
/// A row lock cannot do this job. The rows that would conflict do not exist yet — each approval inserts one — and
/// the rule they would break ("a variant is folded into at most one other, and never into one that is itself
/// folded") spans rows no single index can see.
/// </remarks>
public interface IProductMatchLock
{
    Task AcquireAsync(CancellationToken cancellationToken);
}
