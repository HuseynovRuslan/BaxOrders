namespace BaxOrders.Application.Abstractions;

/// <summary>
/// The single source of codes for locations created in review (LOC-000001, LOC-000002, …).
/// Implementations must be safe under concurrent use; numbers may have gaps but are never handed out twice.
/// </summary>
public interface ILocationCodeGenerator
{
    Task<string> NextAsync(CancellationToken cancellationToken);
}
