namespace BaxOrders.Application.Abstractions;

/// <summary>
/// The single source of product codes (PRD-000001, PRD-000002, …).
/// </summary>
/// <remarks>
/// Implementations must be safe under concurrent use. Numbers may have gaps (for example when a transaction
/// rolls back) but are never handed out twice.
/// </remarks>
public interface IProductCodeGenerator
{
    Task<string> NextAsync(CancellationToken cancellationToken);
}
