namespace BaxOrders.Application.Common;

/// <summary>The request itself is malformed: too many items, a duplicate value, or an action a kind does not allow.</summary>
public sealed class ValidationException(string message) : Exception(message);

/// <summary>
/// The caller is signed in but may not do this. Distinct from not being signed in at all: the answer is 403,
/// and signing in again would not help.
/// </summary>
public sealed class ForbiddenException(string message) : Exception(message);

/// <summary>The requested record does not exist (or is not visible for this operation).</summary>
public sealed class NotFoundException(string message) : Exception(message);

/// <summary>
/// The request contradicts existing data: a different decision for the same value, a name that already belongs to
/// another record, or an alias that would point at two records.
/// </summary>
public sealed class ConflictException(string message) : Exception(message);
