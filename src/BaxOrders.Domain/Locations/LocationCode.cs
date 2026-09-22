using System.Globalization;

namespace BaxOrders.Domain.Locations;

/// <summary>
/// Format of system-issued location codes: LOC-000001, LOC-000002, … Locations seeded earlier keep their own codes.
/// </summary>
public static class LocationCode
{
    public const string Prefix = "LOC-";

    public static string FromNumber(long number) =>
        number > 0
            ? Prefix + number.ToString("D6", CultureInfo.InvariantCulture)
            : throw new DomainException("Location code number must be greater than zero.");
}
