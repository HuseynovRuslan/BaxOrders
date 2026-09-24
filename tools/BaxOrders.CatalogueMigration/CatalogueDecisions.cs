namespace BaxOrders.CatalogueMigration;

/// <summary>An object the owner confirmed does not exist, identified by its code.</summary>
/// <param name="Name">The name it must still carry; a different name under the code means a different object.</param>
public sealed record DeletionDecision(string Code, string Name);

/// <summary>An object the owner confirmed exists and is missing from the catalogue.</summary>
public sealed record InsertDecision(string Code, string Name);

/// <summary>A display name corrected by the owner. The object, its id and its code stay what they are.</summary>
public sealed record RenameDecision(string Code, string From, string To);

/// <summary>A spelling that has to reach an object on import, and where the requirement comes from.</summary>
public sealed record SpellingDecision(string Spelling, string Code, string Source);

/// <summary>
/// The owner's catalogue decisions for Task 3, as data. Everything the migration does is read from here, and
/// every object is named by its code — never by an id, which differs from one database to the next.
/// </summary>
/// <remarks>
/// The codes are the ones <c>--inspect</c> found on the development database on 2026-09-24. On any other
/// database the dry run checks that each code still carries the name it is expected to carry, and stops if it
/// does not, rather than renaming or deleting whatever object happens to hold the code there.
/// </remarks>
public static class CatalogueDecisions
{
    /// <summary>Recorded in every output so a log can be matched to the decisions it applied.</summary>
    public const string Version = "task3-2026-09-24";

    /// <summary>Decision 1: they do not exist in reality and have no orders.</summary>
    public static readonly IReadOnlyList<DeletionDecision> Deletions =
    [
        new("MASTAGA", "Maştağa"),
        new("RAMANA", "Ramana"),
        new("EMIRCAN", "Əmircan"),
    ];

    /// <summary>Decision 2, with the code A4 asks for: the next one in the existing LOC-nnnnnn sequence.</summary>
    public static readonly IReadOnlyList<InsertDecision> Inserts =
    [
        new("LOC-000047", "Çadır"),
    ];

    /// <summary>Decision 5: full display names, typos fixed. Every other name stays as it is.</summary>
    public static readonly IReadOnlyList<RenameDecision> Renames =
    [
        new("LOC-000033", "Hökümət evi və ətrafı parklar", "Hökumət evi və ətrafı parklar"),
        new("LOC-000045", "Space Tv qarşısı", "Space TV qarşısı"),
        new("LOC-000041", "Qara Qarayev", "Qara Qarayev parkı"),
        new("LOC-000039", "Axundov", "Axundov parkı"),
        new("LOC-000042", "EXPO", "EXPO Center"),
        new("LOC-000029", "Təmir-tikinti", "Təmir-tikinti (ərazidə olan dibçəklərə qulluq)"),
    ];

    /// <summary>
    /// A4: spellings that must resolve to these objects through the existing alias mechanism.
    /// </summary>
    /// <remarks>
    /// Each renamed object's previous name is added by the plan itself, so it is not repeated here. A spelling
    /// that already equals the object's name, or is already one of its aliases, is reported and left alone:
    /// the domain refuses an alias equal to the name, and it would add nothing.
    /// </remarks>
    public static readonly IReadOnlyList<SpellingDecision> Spellings =
    [
        new("H.Ə.M Təmizlik", "HEM", "owner's list — a category of Heydər Əliyev Mərkəzi, not a second object (decision 4)"),
        new("H.Ə.M Yaşıllıq", "HEM", "owner's list — a category of Heydər Əliyev Mərkəzi, not a second object (decision 4)"),
        new("B.K.M", "LOC-000034", "owner's list"),
        new("EXPO Center", "LOC-000042", "owner's list"),
        new("Spacde qarşısı", "LOC-000045", "owner's list"),
        new("Novxanı Təmizlik", "LOC-000037", "owner's list"),
        new("Xətai", "LOC-000030", "owner's list"),
        new("Axundov Parkı", "LOC-000039", "owner's list"),
        new("Qara Qarayev parkı", "LOC-000041", "owner's list"),
        new("Milli konservatoriya", "LOC-000009", "owner's list"),
        new("Hökumət evi və ətrafı parklar", "LOC-000033", "owner's list"),
        new("Çadır", "LOC-000047", "A4 — Çadır gets the alias \"Çadır\""),
        new("Qafur Məmmədov parkı", "LOC-000035",
            "amendment 0.3 — docs/business-decisions.md DB-04 (accepted) records it as the long form of Qafur Məmmədov"),
    ];

    /// <summary>
    /// B6, and the result the owner expects: 27 objects, in this order, 26 of them with order history.
    /// </summary>
    public static readonly IReadOnlyList<string> ExpectedCatalogue =
    [
        "ADNSU",
        "Ağır Cinayətlərin qarşısı",
        "Axundov parkı",
        "Bakı Konqres Mərkəzi",
        "Bayıl yolu",
        "Bibiheybət",
        "Bülbül parkı",
        "Çadır",
        "Dədə Qorqud",
        "EXPO Center",
        "Fəvvarələr meydanı",
        "Heydər Əliyev Mərkəzi",
        "Hökumət evi və ətrafı parklar",
        "Xətai parkı",
        "İDEA",
        "Qafur Məmmədov",
        "Qala baza",
        "Qara Qarayev parkı",
        "Milli Konservatoriya qarşısı",
        "Muzey Mərkəzi",
        "Nərimanov heykəli",
        "Novxanı",
        "Parlament parkı",
        "Puşkin parkı",
        "Space TV qarşısı",
        "Təmir-tikinti (ərazidə olan dibçəklərə qulluq)",
        "Zabitlər parkı",
    ];

    /// <summary>The objects that have never ordered once the catalogue is as the owner wants it.</summary>
    public static readonly IReadOnlyList<string> ExpectedWithoutOrders = ["Çadır"];
}
