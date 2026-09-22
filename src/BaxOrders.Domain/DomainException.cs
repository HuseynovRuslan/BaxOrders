namespace BaxOrders.Domain;

/// <summary>
/// Thrown when an operation would violate a business invariant.
/// </summary>
/// <remarks>
/// Open for a rule that a caller can answer rather than only be told about — see
/// <see cref="Orders.MissingPriceAcknowledgementRequiredException"/>, which carries what the caller has to
/// acknowledge. A derived type stays a business-rule violation, so everything that already handles this one
/// keeps handling it.
/// </remarks>
public class DomainException(string message) : Exception(message);
