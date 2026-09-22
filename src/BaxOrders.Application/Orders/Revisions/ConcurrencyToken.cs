using BaxOrders.Application.Common;

namespace BaxOrders.Application.Orders.Revisions;

/// <summary>
/// The request's row version as the client carries it: 32 hexadecimal characters, so it survives a URL and a
/// JSON body alike without escaping.
/// </summary>
/// <remarks>
/// Every edit of a correction sends back the token it read. If anybody changed the correction in between, the
/// tokens differ and the edit is refused with a 409 — it is never applied on top of a state the person did not
/// see.
/// <para>
/// The value behind it is the application's own stamp rather than anything the database keeps for itself, so
/// the contract does not change with the provider and a caller cannot read anything into it. It stays named
/// <c>rowVersion</c> on the wire, which is what it is: the version of that row.
/// </para>
/// </remarks>
public static class ConcurrencyToken
{
    public static string Of(Guid stamp) => stamp.ToString("N").ToUpperInvariant();

    public static Guid Parse(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new ValidationException(
                "rowVersion is required: send back the one you read, so a change made meanwhile is not overwritten.");
        }

        return Guid.TryParseExact(token.Trim(), "N", out var stamp)
            ? stamp
            : throw new ValidationException("rowVersion is not a value this server issued.");
    }

    public static bool Matches(Guid current, Guid sent) => current == sent;
}
