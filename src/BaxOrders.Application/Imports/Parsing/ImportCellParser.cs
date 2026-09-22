using System.Globalization;
using System.Text.RegularExpressions;

namespace BaxOrders.Application.Imports.Parsing;

public enum ParseOutcome
{
    Blank,
    Parsed,
    Invalid,
}

public readonly record struct ParseResult<T>(ParseOutcome Outcome, T Value, string? Problem)
    where T : struct
{
    public static ParseResult<T> Blank => new(ParseOutcome.Blank, default, null);

    public static ParseResult<T> Parsed(T value) => new(ParseOutcome.Parsed, value, null);

    public static ParseResult<T> Invalid(string problem) => new(ParseOutcome.Invalid, default, problem);

    public T? ValueOrNull => Outcome == ParseOutcome.Parsed ? Value : null;
}

/// <summary>
/// Converts workbook cells into source text and typed values. Nothing is guessed: anything that cannot be
/// read unambiguously is reported as invalid.
/// </summary>
public static partial class ImportCellParser
{
    private static readonly string[] DateFormats = ["dd.MM.yyyy", "d.M.yyyy", "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd"];

    public static bool IsBlank(object? cell) => cell is null || cell is string text && string.IsNullOrWhiteSpace(text);

    /// <summary>
    /// What the workbook stores in the cell, for audit. Text is returned unchanged (including spaces).
    /// Numbers use invariant round-trip notation, dates ISO 8601. Null for an empty cell.
    /// </summary>
    public static string? ToSourceText(object? cell) => cell switch
    {
        null => null,
        string text => text,
        double number => number.ToString("R", CultureInfo.InvariantCulture),
        DateTime date when date.TimeOfDay == TimeSpan.Zero => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        DateTime date => date.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
        bool flag => flag ? "TRUE" : "FALSE",
        IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
        _ => cell.ToString(),
    };

    /// <summary>
    /// Reads a decimal that must fit decimal(<paramref name="precision"/>, <paramref name="scale"/>) without rounding.
    /// </summary>
    /// <remarks>
    /// Native numeric cells are preferred. Excel stores them as binary doubles; converting to decimal keeps
    /// 15 significant digits, which removes binary noise (0.30000000000000004) but never rounds a real value.
    /// Text is accepted only as a plain number with at most one '.' or ',' decimal separator. Text such as
    /// "1,500" or "1.500" is rejected as ambiguous, because the separator could also group thousands.
    /// </remarks>
    public static ParseResult<decimal> ParseDecimal(object? cell, int precision, int scale)
    {
        decimal value;

        switch (cell)
        {
            case var _ when IsBlank(cell):
                return ParseResult<decimal>.Blank;

            case double number:
                if (!double.IsFinite(number))
                {
                    return ParseResult<decimal>.Invalid("The cell does not contain a finite number.");
                }

                try
                {
                    value = (decimal)number;
                }
                catch (OverflowException)
                {
                    return ParseResult<decimal>.Invalid("The number is too large.");
                }

                break;

            case string text:
                var trimmed = text.Trim();
                if (!PlainDecimal().IsMatch(trimmed))
                {
                    return ParseResult<decimal>.Invalid($"'{trimmed}' is not a plain decimal number.");
                }

                if (AmbiguousThousands().IsMatch(trimmed))
                {
                    return ParseResult<decimal>.Invalid(
                        $"'{trimmed}' is ambiguous: the separator could be a decimal or a thousands separator.");
                }

                if (!decimal.TryParse(trimmed.Replace(',', '.'), NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint,
                        CultureInfo.InvariantCulture, out value))
                {
                    return ParseResult<decimal>.Invalid($"'{trimmed}' is too large.");
                }

                break;

            case DateTime:
                return ParseResult<decimal>.Invalid("The cell contains a date, not a number.");

            default:
                return ParseResult<decimal>.Invalid("The cell does not contain a number.");
        }

        if (decimal.Round(value, scale) != value)
        {
            return ParseResult<decimal>.Invalid($"{value.ToString(CultureInfo.InvariantCulture)} has more than {scale} decimal places.");
        }

        var integerLimit = 1m;
        for (var i = 0; i < precision - scale; i++)
        {
            integerLimit *= 10;
        }

        return Math.Abs(value) < integerLimit
            ? ParseResult<decimal>.Parsed(value)
            : ParseResult<decimal>.Invalid($"{value.ToString(CultureInfo.InvariantCulture)} is too large.");
    }

    /// <summary>
    /// Reads a business date. Native date cells are preferred; any time part is ignored. Text is accepted in
    /// day-first formats (dd.MM.yyyy, dd/MM/yyyy) or ISO yyyy-MM-dd. Plain numbers are rejected rather than
    /// interpreted as Excel serial dates.
    /// </summary>
    public static ParseResult<DateOnly> ParseDate(object? cell)
    {
        DateOnly date;

        switch (cell)
        {
            case var _ when IsBlank(cell):
                return ParseResult<DateOnly>.Blank;

            case DateTime dateTime:
                date = DateOnly.FromDateTime(dateTime);
                break;

            case string text when DateOnly.TryParseExact(text.Trim(), DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out date):
                break;

            case string text:
                return ParseResult<DateOnly>.Invalid($"'{text.Trim()}' is not a recognised date (expected dd.MM.yyyy).");

            case double:
                return ParseResult<DateOnly>.Invalid("The cell contains a plain number, not a date.");

            default:
                return ParseResult<DateOnly>.Invalid("The cell does not contain a date.");
        }

        return date.Year is >= 2000 and <= 2100
            ? ParseResult<DateOnly>.Parsed(date)
            : ParseResult<DateOnly>.Invalid($"{date:yyyy-MM-dd} is outside the plausible range 2000–2100.");
    }

    [GeneratedRegex(@"^[+-]?\d+(?:[.,]\d+)?$")]
    private static partial Regex PlainDecimal();

    [GeneratedRegex(@"^[+-]?[1-9]\d{0,2}[.,]\d{3}$")]
    private static partial Regex AmbiguousThousands();
}
