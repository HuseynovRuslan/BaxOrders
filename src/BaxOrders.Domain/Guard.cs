using System.Text.RegularExpressions;
using BaxOrders.Domain.Normalization;

namespace BaxOrders.Domain;

/// <summary>
/// Argument checks shared by entities. Violations surface as <see cref="DomainException"/>.
/// </summary>
internal static partial class Guard
{
    public static string RequiredText(string? value, int maxLength, string fieldName)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            throw new DomainException($"{fieldName} is required.");
        }

        return MaxLength(trimmed, maxLength, fieldName);
    }

    public static string? OptionalText(string? value, int maxLength, string fieldName)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : MaxLength(trimmed, maxLength, fieldName);
    }

    /// <summary>
    /// Keeps source text exactly as received (no trimming, no normalization); only enforces the storage limit.
    /// </summary>
    public static string? SourceText(string? value, int maxLength, string fieldName) =>
        value is null ? null : MaxLength(value, maxLength, fieldName);

    public static string NormalizedName(string name, int maxLength, string fieldName)
    {
        var normalized = TextNormalizer.Normalize(name);
        if (normalized.Length == 0)
        {
            throw new DomainException($"{fieldName} must contain at least one meaningful character.");
        }

        return MaxLength(normalized, maxLength, fieldName);
    }

    /// <summary>
    /// System codes are upper-case ASCII so they are stable in URLs, exports and integrations.
    /// </summary>
    public static string Code(string? value, int maxLength, string fieldName)
    {
        var code = RequiredText(value, maxLength, fieldName).ToUpperInvariant();
        if (!CodePattern().IsMatch(code))
        {
            throw new DomainException($"{fieldName} may contain only Latin letters A-Z, digits, '.', '-' and '_'.");
        }

        return code;
    }

    public static string? OptionalCode(string? value, int maxLength, string fieldName) =>
        string.IsNullOrWhiteSpace(value) ? null : Code(value, maxLength, fieldName);

    public static DateTime Utc(DateTime value, string fieldName) =>
        value.Kind == DateTimeKind.Utc
            ? value
            : throw new DomainException($"{fieldName} must be a UTC timestamp.");

    public static TEnum DefinedEnum<TEnum>(TEnum value, string fieldName)
        where TEnum : struct, Enum =>
        Enum.IsDefined(value) ? value : throw new DomainException($"{fieldName} has an unknown value '{value}'.");

    /// <summary>
    /// Rejects values that SQL Server would silently round or overflow for decimal(precision, scale).
    /// </summary>
    public static void FitsDecimal(decimal value, int precision, int scale, string fieldName)
    {
        if (decimal.Round(value, scale) != value)
        {
            throw new DomainException($"{fieldName} must not have more than {scale} decimal places.");
        }

        var integerLimit = 1m;
        for (var i = 0; i < precision - scale; i++)
        {
            integerLimit *= 10;
        }

        if (Math.Abs(value) >= integerLimit)
        {
            throw new DomainException($"{fieldName} is too large.");
        }
    }

    private static string MaxLength(string value, int maxLength, string fieldName) =>
        value.Length <= maxLength
            ? value
            : throw new DomainException($"{fieldName} must not exceed {maxLength} characters.");

    [GeneratedRegex("^[A-Z0-9][A-Z0-9._-]*$")]
    private static partial Regex CodePattern();
}
