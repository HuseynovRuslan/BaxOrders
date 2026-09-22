using BaxOrders.Application.Common;

namespace BaxOrders.Application.Orders.Revisions;

/// <summary>
/// The request's row version as the client carries it: hexadecimal, so it survives a URL and a JSON body
/// alike without escaping.
/// </summary>
/// <remarks>
/// Every edit of a correction sends back the token it read. If anybody changed the correction in between, the
/// tokens differ and the edit is refused with a 409 — it is never applied on top of a state the person did not
/// see.
/// </remarks>
public static class ConcurrencyToken
{
    public static string Of(byte[] rowVersion)
    {
        ArgumentNullException.ThrowIfNull(rowVersion);
        return Convert.ToHexString(rowVersion);
    }

    public static byte[] Parse(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new ValidationException(
                "rowVersion is required: send back the one you read, so a change made meanwhile is not overwritten.");
        }

        try
        {
            return Convert.FromHexString(token.Trim());
        }
        catch (FormatException)
        {
            throw new ValidationException("rowVersion is not a value this server issued.");
        }
    }

    public static bool Matches(byte[] current, byte[] sent) => current.AsSpan().SequenceEqual(sent);
}
