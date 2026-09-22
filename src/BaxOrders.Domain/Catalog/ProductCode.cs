using System.Globalization;
using System.Text.RegularExpressions;

namespace BaxOrders.Domain.Catalog;

/// <summary>
/// Format of system-issued product codes: PRD-000001, PRD-000002, …
/// </summary>
/// <remarks>
/// Numbers come from a database sequence behind the application's product code generator.
/// They never derive from Excel row numbers or product names.
/// </remarks>
public static partial class ProductCode
{
    public const string Prefix = "PRD-";

    public static string FromNumber(long number) =>
        number > 0
            ? Prefix + number.ToString("D6", CultureInfo.InvariantCulture)
            : throw new DomainException("Product code number must be greater than zero.");

    public static bool IsValid(string? code) => code is not null && Pattern().IsMatch(code);

    // Six zero-padded digits (not all zeros), or more digits without a leading zero once 999999 is exceeded.
    [GeneratedRegex(@"^PRD-(?:(?!000000)\d{6}|[1-9]\d{6,})$")]
    private static partial Regex Pattern();
}
