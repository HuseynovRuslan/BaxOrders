using BaxOrders.CatalogueMigration;
using BaxOrders.Domain.Normalization;

namespace BaxOrders.TestSupport;

/// <summary>
/// The object catalogue exactly as <c>--inspect</c> found it on the development database on 2026-09-24:
/// 29 objects, 15 aliases, the code sequence at 46.
/// </summary>
/// <remarks>
/// Shared by the unit tests of the plan and the integration test of the migration (linked into that project),
/// so both run against the catalogue the owner's decisions were written for — not against a smaller one that
/// could pass for the wrong reason.
/// </remarks>
public static class CatalogueAsFound
{
    public const long SequenceLastValue = 46;

    public static readonly IReadOnlyList<(int Id, string Code, string Name)> Locations =
    [
        (1, "RAMANA", "Ramana"),
        (2, "MASTAGA", "Maştağa"),
        (3, "EMIRCAN", "Əmircan"),
        (4, "HEM", "Heydər Əliyev Mərkəzi"),
        (11, "LOC-000007", "Parlament parkı"),
        (12, "LOC-000008", "Nərimanov heykəli"),
        (13, "LOC-000009", "Milli Konservatoriya qarşısı"),
        (14, "LOC-000010", "Ağır Cinayətlərin qarşısı"),
        (21, "LOC-000017", "Fəvvarələr meydanı"),
        (27, "LOC-000023", "Dədə Qorqud"),
        (32, "LOC-000028", "Puşkin parkı"),
        (33, "LOC-000029", "Təmir-tikinti"),
        (34, "LOC-000030", "Xətai parkı"),
        (35, "LOC-000031", "Bülbül parkı"),
        (36, "LOC-000032", "Zabitlər parkı"),
        (37, "LOC-000033", "Hökümət evi və ətrafı parklar"),
        (38, "LOC-000034", "Bakı Konqres Mərkəzi"),
        (39, "LOC-000035", "Qafur Məmmədov"),
        (40, "LOC-000036", "Bayıl yolu"),
        (41, "LOC-000037", "Novxanı"),
        (42, "LOC-000038", "Bibiheybət"),
        (43, "LOC-000039", "Axundov"),
        (44, "LOC-000040", "Muzey Mərkəzi"),
        (45, "LOC-000041", "Qara Qarayev"),
        (46, "LOC-000042", "EXPO"),
        (47, "LOC-000043", "ADNSU"),
        (48, "LOC-000044", "İDEA"),
        (49, "LOC-000045", "Space Tv qarşısı"),
        (50, "LOC-000046", "Qala baza"),
    ];

    public static readonly IReadOnlyList<(string Alias, string Code)> Aliases =
    [
        ("H.Ə.M", "HEM"),
        ("F.M", "LOC-000017"),
        ("Sabir bağı", "LOC-000017"),
        ("Dədəd Qorqud", "LOC-000023"),
        ("Puşkin", "LOC-000028"),
        ("Təmir Tikinti", "LOC-000029"),
        ("Xətai", "LOC-000030"),
        ("Bülbül", "LOC-000031"),
        ("Zabitlər", "LOC-000032"),
        ("Hökümət evi", "LOC-000033"),
        ("B.K.M", "LOC-000034"),
        ("Parlament", "LOC-000007"),
        ("Nərimanov", "LOC-000008"),
        ("Milli Konservatoriya", "LOC-000009"),
        ("Ağır Cinayətlərin", "LOC-000010"),
    ];

    /// <summary>The same catalogue as a <see cref="CatalogueState"/>, with ids optionally shifted to show they do not matter.</summary>
    public static CatalogueState State(int idOffset = 0, long sequenceLastValue = SequenceLastValue)
    {
        var locations = Locations
            .Select(location => new CatalogueLocation(
                location.Id + idOffset, location.Code, location.Name, TextNormalizer.Normalize(location.Name), true))
            .ToList();

        var aliases = Aliases
            .Select((alias, index) => new CatalogueAlias(
                index + 1,
                locations.Single(location => location.Code == alias.Code).Id,
                alias.Alias,
                TextNormalizer.Normalize(alias.Alias)))
            .ToList();

        return new CatalogueState(locations, aliases, sequenceLastValue, SequenceIsCalled: true);
    }
}
