using BaxOrders.Domain.Normalization;

namespace BaxOrders.Application.Imports.Parsing;

/// <summary>
/// Which worksheet of the order workbook an import reads.
/// </summary>
/// <remarks>
/// One, and it is named. The order workbook ships with a second sheet, "Əsas", that holds the same lines
/// without the "Növ" column; the business has decided "Aylıq" is the authoritative one. Reading both put every
/// line in twice — each one then the other's duplicate — and blocked the whole import on three and a half
/// thousand rows that could not state a classification they were never asked for.
/// <para>
/// So the rule is by name, not by shape: a sheet that is not this one takes no part in staging, validation,
/// duplicate detection, issues or confirmation. There is deliberately no fallback. A workbook without "Aylıq"
/// is refused and says so, because quietly reading "Əsas" instead is exactly the mistake this prevents.
/// </para>
/// </remarks>
public static class ImportSheets
{
    /// <summary>The one sheet an order import reads.</summary>
    public const string Authoritative = "Aylıq";

    /// <summary>What a workbook with no such sheet is told.</summary>
    public const string MissingAuthoritativeSheet =
        "Aylıq vərəqi tapılmadı. Sifariş idxalı üçün əsas məlumat vərəqi mövcud deyil.";

    /// <summary>What a sheet that is not the authoritative one is reported as, so its absence is never a silence.</summary>
    public const string NotTheAuthoritativeSheet =
        "Bu vərəq idxal edilmir. Sifariş idxalı yalnız «Aylıq» vərəqini oxuyur.";

    private static readonly string AuthoritativeKey = TextNormalizer.Normalize(Authoritative);

    /// <summary>
    /// Whether this is the sheet to read, by the same normalization every other name in the importer uses —
    /// so " aylıq " and "AYLIQ" are the same sheet, and a stray space in a tab name does not refuse a workbook.
    /// </summary>
    public static bool IsAuthoritative(string? sheetName) =>
        sheetName is not null && TextNormalizer.Normalize(sheetName) == AuthoritativeKey;
}
