using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Matching;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Application.Imports.Reading;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Normalization;

namespace BaxOrders.UnitTests.Imports;

/// <summary>Synthetic rows and catalog modelled on the real workbook. No company file is used.</summary>
internal static class ImportTestData
{
    public const int HemLocationId = 4;
    public const int CleanfixSupplierId = 10;
    public const int EldarPersonId = 20;
    public const int PiecesUnitId = 1;
    public const int PackUnitId = 2;
    public const int CentimeterUnitId = 4;
    public const int FloorCategoryId = 3;
    public const long MopProductId = 100;
    public const long MopVariantId = 1000;

    private static readonly HeaderLayout Layout = new(
        1,
        Enum.GetValues<ImportField>().Select((field, column) => (field, column)).ToDictionary(pair => pair.field, pair => pair.column));

    private static readonly Dictionary<ImportField, object?> ValidValues = new()
    {
        [ImportField.SequenceNumber] = 1d,
        [ImportField.MainCategory] = "Təmizlik",
        [ImportField.MiddleCategory] = "Təmizlik ləvazimatı",
        [ImportField.SubCategory] = "Döşəmə təmizlik ləvazimatı",
        [ImportField.ProductName] = "Makaron mop",
        [ImportField.SpecificationValue] = 50d,
        [ImportField.SpecificationUnit] = "sm",
        [ImportField.ModelCode] = null,
        [ImportField.Quantity] = 43d,
        [ImportField.OrderUnit] = "ədəd",
        [ImportField.UnitPrice] = 4.5d,
        [ImportField.LineTotal] = 193.5d,
        [ImportField.Supplier] = "Cleanfix MMC",
        [ImportField.Location] = "H.Ə.M",
        // Like the real order workbook: "Tarix" holds the first day of the request period.
        [ImportField.RequestDate] = new DateTime(2026, 3, 1),
        [ImportField.ResponsiblePerson] = "Eldar",
    };

    /// <summary>A fully valid row with the given fields replaced.</summary>
    public static SourceRow Row(params (ImportField Field, object? Value)[] overrides) => RowAt(2, overrides);

    public static SourceRow RowAt(int rowNumber, params (ImportField Field, object? Value)[] overrides)
    {
        var values = new Dictionary<ImportField, object?>(ValidValues);
        foreach (var (field, value) in overrides)
        {
            values[field] = value;
        }

        var cells = Enum.GetValues<ImportField>().Select(field => values[field]).ToArray();
        return new SourceRow("Əsas", new ExcelRow(rowNumber, cells), Layout);
    }

    public static ImportCatalog TestCatalog()
    {
        var catalog = new ImportCatalog();
        catalog.Locations.Add(N("H.Ə.M"), HemLocationId);
        catalog.Suppliers.Add(N("Cleanfix MMC"), CleanfixSupplierId);
        catalog.ResponsiblePeople.Add(N("Eldar"), EldarPersonId);

        catalog.AddUnit(PiecesUnitId, "PCS", "Ədəd", "ədəd");
        catalog.Units.Add(N("əd"), PiecesUnitId);
        catalog.AddUnit(PackUnitId, "PACK", "Paçka", "paçka");
        catalog.Units.Add(N("paçqa"), PackUnitId);
        catalog.AddUnit(CentimeterUnitId, "CM", "Santimetr", "sm");

        catalog.Categories.Build(
        [
            (1, null, N("Təmizlik"), true),
            (2, 1, N("Təmizlik ləvazimatı"), true),
            (FloorCategoryId, 2, N("Döşəmə təmizlik ləvazimatı"), true),
        ]);

        catalog.Products.Add(N("Makaron mop"), MopProductId);
        catalog.AddVariant(MopProductId, ProductVariantKey.Create("50", "CM", null, "PCS"), MopVariantId);
        return catalog;
    }

    public static string N(string value) => TextNormalizer.Normalize(value);
}
