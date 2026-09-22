using System.Globalization;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain;
using BaxOrders.Domain.Imports;

namespace BaxOrders.Application.Imports.Evaluation;

/// <summary>
/// One row's values as the importer sees them — straight from the workbook while it is being read, or from a
/// staged row with the operator's corrections applied. Everything that parses, validates, matches or fingerprints
/// a row works on this, so a corrected row goes through exactly the same pipeline as a freshly read one.
/// </summary>
public interface IRowValues
{
    /// <summary>The cell as stored: a workbook cell keeps its type, a staged cell is text.</summary>
    object? Cell(ImportField field);

    string? Text(ImportField field);

    /// <summary>True when Excel itself turned this cell into a date, so what the author typed may be lost.</summary>
    bool StoredAsDate(ImportField field);

    /// <summary>
    /// True when an operator reviewed this cell and confirmed it is empty on purpose. A workbook row being read
    /// for the first time has no such decision, so it always answers false.
    /// </summary>
    bool IsExplicitlyEmpty(ImportField field) => false;
}

/// <summary>
/// The effective values of a staged row: the operator's correction where there is one, the workbook value
/// everywhere else. This is the only place that choice is made, so no service has to remember it.
/// </summary>
/// <remarks>
/// The workbook values stay untouched on <see cref="ImportRow"/>; a correction is applied on top of them here.
/// A corrected cell is no longer reported as "stored as a date", because the correction is exactly the fix for it.
/// </remarks>
public sealed class EffectiveRowValues(ImportRow row) : IRowValues
{
    private static readonly Dictionary<ImportField, ImportCorrectionField> Correctable = new()
    {
        [ImportField.MainCategory] = ImportCorrectionField.MainCategory,
        [ImportField.MiddleCategory] = ImportCorrectionField.MiddleCategory,
        [ImportField.SubCategory] = ImportCorrectionField.SubCategory,
        [ImportField.ProductName] = ImportCorrectionField.ProductName,
        [ImportField.SpecificationValue] = ImportCorrectionField.SpecificationValue,
        [ImportField.SpecificationUnit] = ImportCorrectionField.SpecificationUnit,
        [ImportField.ModelCode] = ImportCorrectionField.ModelCode,
        [ImportField.Quantity] = ImportCorrectionField.Quantity,
        [ImportField.OrderUnit] = ImportCorrectionField.OrderUnit,
        [ImportField.UnitPrice] = ImportCorrectionField.UnitPrice,
        [ImportField.Supplier] = ImportCorrectionField.Supplier,
        [ImportField.Location] = ImportCorrectionField.Location,
        [ImportField.RequestDate] = ImportCorrectionField.RequestPeriod,
        [ImportField.ResponsiblePerson] = ImportCorrectionField.ResponsiblePerson,
    };

    private static readonly Dictionary<ImportCorrectionField, ImportField> Columns =
        Correctable.ToDictionary(pair => pair.Value, pair => pair.Key);

    public static EffectiveRowValues Of(ImportRow row) => new(row);

    /// <summary>The workbook column a correctable field belongs to, for labels and issue fields.</summary>
    public static ImportField ColumnOf(ImportCorrectionField field) =>
        Columns.TryGetValue(field, out var column) ? column : throw new DomainException($"{field} is not a workbook column.");

    public object? Cell(ImportField field) => Text(field);

    public string? Text(ImportField field) =>
        Correctable.TryGetValue(field, out var correctable)
            ? row.Effective(correctable)
            : field switch
            {
                ImportField.SequenceNumber => row.OriginalSequenceNumber,
                ImportField.LineTotal => row.OriginalLineTotal,
                _ => null,
            };

    /// <summary>Only the cells whose meaning a date destroys; the "Tarix" column is a date by design.</summary>
    private static readonly HashSet<ImportField> DateSuspects =
    [
        ImportField.SpecificationValue,
        ImportField.SpecificationUnit,
        ImportField.ModelCode,
    ];

    public bool StoredAsDate(ImportField field) =>
        DateSuspects.Contains(field) && !IsCorrected(field) && LooksLikeExcelDate(Text(field));

    public bool IsCorrected(ImportField field) =>
        Correctable.TryGetValue(field, out var correctable) && row.CorrectionOf(correctable) is not null;

    public bool IsExplicitlyEmpty(ImportField field) =>
        Correctable.TryGetValue(field, out var correctable) && row.IsIntentionallyEmpty(correctable);

    /// <summary>
    /// A staged cell is text, so the date Excel produced is recognised by its shape. The importer only reports it;
    /// what the author actually typed cannot be recovered from the workbook and only a person can supply it.
    /// </summary>
    private static bool LooksLikeExcelDate(string? text) =>
        text is { Length: 10 }
        && DateTime.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
}
