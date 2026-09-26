using BaxOrders.Domain.Normalization;

namespace BaxOrders.Domain.Orders;

/// <summary>
/// Reads the workbook's "Növ" column into an <see cref="OrderLineType"/>.
/// </summary>
/// <remarks>
/// <para>
/// Only the values the business actually writes are recognised, compared through
/// <see cref="TextNormalizer"/> so that case and stray whitespace do not matter. Everything else — a blank
/// cell, a typo, a word nobody has seen before — is not classified and is not guessed at. Guessing here would
/// put an unplanned purchase into the monthly figures, which is the one thing this column exists to prevent.
/// </para>
/// <para>
/// The list is deliberately short and literal. "Aylıqdan kənar sifarişlər" is in it because that is the label
/// this application itself displays, so a sheet built from one of its own screens reads back correctly; it is
/// a value the system writes, not a spelling anybody inferred.
/// </para>
/// </remarks>
public static class OrderLineTypes
{
    /// <summary>What the business writes in the column, and what each of those means.</summary>
    public static readonly IReadOnlyDictionary<string, OrderLineType> Recognized = new Dictionary<string, OrderLineType>
    {
        ["Aylıq sifariş"] = OrderLineType.Monthly,
        ["Aylıqdan kənar"] = OrderLineType.OutsideMonthly,
        ["Aylıqdan kənar sifarişlər"] = OrderLineType.OutsideMonthly,
    };

    private static readonly Dictionary<string, OrderLineType> ByNormalized =
        Recognized.ToDictionary(pair => TextNormalizer.Normalize(pair.Key), pair => pair.Value);

    /// <summary>
    /// The type this cell states, or null when it states nothing this system knows.
    /// </summary>
    /// <remarks>
    /// Null covers both an empty cell and an unrecognised word, because the two need the same answer from the
    /// import: leave the line unclassified and put it in front of a person. They are told apart by the text
    /// itself, which is kept on the import row either way.
    /// </remarks>
    public static OrderLineType? Read(string? cell) =>
        string.IsNullOrWhiteSpace(cell)
            ? null
            : ByNormalized.TryGetValue(TextNormalizer.Normalize(cell), out var type) ? type : null;

    /// <summary>True when the cell holds something, but nothing this system recognises.</summary>
    public static bool IsUnrecognized(string? cell) =>
        !string.IsNullOrWhiteSpace(cell) && Read(cell) is null;
}
