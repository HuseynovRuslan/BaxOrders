namespace BaxOrders.Domain;

/// <summary>
/// Thrown when an operation would violate a business invariant.
/// </summary>
public sealed class DomainException(string message) : Exception(message);
