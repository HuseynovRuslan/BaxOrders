using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Normalization;

namespace BaxOrders.Infrastructure.Persistence.Seed;

/// <summary>
/// Reference data seeded through migrations. Only stable master data lives here:
/// no orders, prices or other historical facts. Ids are fixed; append new rows with new ids.
/// </summary>
internal static class ReferenceData
{
    /// <summary>Fixed so the generated migrations are deterministic.</summary>
    private static readonly DateTime SeededAtUtc = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    private static readonly (int Id, string Code, string Name, string Symbol, UnitType UnitType)[] UnitRows =
    [
        (1, "PCS", "Ədəd", "ədəd", UnitType.Count),
        (2, "PACK", "Paçka", "paçka", UnitType.Package),
        (3, "PAIR", "Cüt", "cüt", UnitType.Pair),
        (4, "CM", "Santimetr", "sm", UnitType.Length),
        (5, "M", "Metr", "m", UnitType.Length),
        (6, "G", "Qram", "qr", UnitType.Mass),
        (7, "KG", "Kiloqram", "kq", UnitType.Mass),
        (8, "ML", "Millilitr", "ml", UnitType.Volume),
        (9, "L", "Litr", "lt", UnitType.Volume),
        (10, "MM", "Millimetr", "mm", UnitType.Length),
        (11, "BAG", "Kisə", "kisə", UnitType.Package),
    ];

    /// <summary>
    /// Approved unit spellings, including known typos such as "paçqa".
    /// Deliberately absent: descriptions such as "lik", "lük", "qat" and "yarpaq". They are not synonyms of
    /// any unit and must stay unknown until the business defines them (possibly as separate Other-type units).
    /// </summary>
    private static readonly (int Id, string UnitCode, string Alias)[] UnitAliasRows =
    [
        (1, "PCS", "Ədəd"),
        (2, "PACK", "Paçka"),
        (3, "PAIR", "Cüt"),
        (4, "CM", "Santimetr"),
        (5, "CM", "sm"),
        (6, "M", "Metr"),
        (7, "M", "m"),
        (8, "G", "Qram"),
        (9, "G", "qr"),
        (10, "KG", "Kiloqram"),
        (11, "KG", "kq"),
        (12, "ML", "Millilitr"),
        (13, "ML", "ml"),
        (14, "L", "Litr"),
        (15, "L", "lt"),
        (16, "PCS", "əd"),
        (17, "PCS", "əd."),
        (18, "PACK", "paçqa"),
        (19, "CM", "cm"),
        (20, "M", "mt"),
        (21, "MM", "mm"),
        (22, "G", "gr"),
        (23, "KG", "kg"),
        (24, "L", "l"),
        (25, "BAG", "kisə"),
    ];

    private static readonly (int Id, string Code, string Name)[] LocationRows =
    [
        (1, "RAMANA", "Ramana"),
        (2, "MASTAGA", "Maştağa"),
        (3, "EMIRCAN", "Əmircan"),
        (4, "HEM", "Heydər Əliyev Mərkəzi"),
    ];

    /// <summary>Known abbreviations used in source workbooks (confirmed: "H.Ə.M" = Heydər Əliyev Mərkəzi).</summary>
    private static readonly (int Id, string LocationCode, string Alias)[] LocationAliasRows =
    [
        (1, "HEM", "H.Ə.M"),
    ];

    public static object[] LocationAliases() =>
        LocationAliasRows
            .Select(row => (object)new
            {
                row.Id,
                LocationId = LocationRows.Single(location => location.Code == row.LocationCode).Id,
                row.Alias,
                NormalizedAlias = TextNormalizer.Normalize(row.Alias),
                CreatedAtUtc = SeededAtUtc,
            })
            .ToArray();

    public static object[] Units() =>
        UnitRows
            .Select(unit => (object)new { unit.Id, unit.Code, unit.Name, unit.Symbol, unit.UnitType, IsActive = true })
            .ToArray();

    public static object[] UnitAliases() =>
        UnitAliasRows
            .Select(row => (object)new
            {
                row.Id,
                UnitOfMeasureId = UnitRows.Single(unit => unit.Code == row.UnitCode).Id,
                row.Alias,
                NormalizedAlias = TextNormalizer.Normalize(row.Alias),
                CreatedAtUtc = SeededAtUtc,
            })
            .ToArray();

    public static object[] Locations() =>
        LocationRows
            .Select(location => (object)new
            {
                location.Id,
                location.Code,
                location.Name,
                NormalizedName = TextNormalizer.Normalize(location.Name),
                IsActive = true,
                CreatedAtUtc = SeededAtUtc,
                UpdatedAtUtc = SeededAtUtc,
            })
            .ToArray();
}
