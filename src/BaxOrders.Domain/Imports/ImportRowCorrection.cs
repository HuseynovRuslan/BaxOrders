namespace BaxOrders.Domain.Imports;

/// <summary>
/// A cell of a staged row an operator may correct. The Excel columns that are never business input — the "№"
/// column and the "Cəmi" total, which is always recalculated from quantity × price — are deliberately missing.
/// </summary>
public enum ImportCorrectionField
{
    MainCategory,
    MiddleCategory,
    SubCategory,
    ProductName,
    SpecificationValue,
    SpecificationUnit,
    ModelCode,
    Quantity,
    OrderUnit,
    UnitPrice,
    Supplier,
    Location,

    /// <summary>The "Tarix" column, which this workbook uses as the request period.</summary>
    RequestPeriod,
    ResponsiblePerson,
}

/// <summary>
/// What an operator says one cell of a staged row should have said: "the Obyekt column holds 'Təhvil verdi',
/// it should be 'Dədə Qorqud'".
/// </summary>
/// <remarks>
/// A correction never touches the Excel value: <see cref="ImportRow"/> keeps every <c>Original*</c> field exactly
/// as the workbook had it, and the correction is applied on top when the row is parsed, matched and imported.
/// It answers "what should this cell have said", not "which canonical record is this" — that stays the job of
/// matching and <see cref="ImportResolution"/>, which run on the corrected text like on any other value.
/// One field carries at most one correction; removing it returns the row to the workbook value.
/// </remarks>
public sealed class ImportRowCorrection
{
    public const int ValueMaxLength = ImportRow.SourceTextMaxLength;

    private ImportRowCorrection()
    {
    }

    internal ImportRowCorrection(ImportRow importRow, ImportCorrectionField field, string? correctedValue)
    {
        ArgumentNullException.ThrowIfNull(importRow);

        ImportRow = importRow;
        ImportRowId = importRow.Id;
        Field = Guard.DefinedEnum(field, nameof(Field));
        Update(correctedValue);
    }

    public long Id { get; private set; }

    public long ImportRowId { get; private set; }

    public ImportRow ImportRow { get; private set; } = null!;

    public ImportCorrectionField Field { get; private set; }

    /// <summary>
    /// The value the operator entered, kept as text: it is parsed by the same rules as a workbook cell.
    /// Null when the operator confirmed the cell should be empty — see <see cref="IsIntentionallyEmpty"/>.
    /// </summary>
    public string? CorrectedValue { get; private set; }

    /// <summary>
    /// True when the correction says "this cell is empty on purpose". It is not the same as having no
    /// correction: a missing value is a problem, an intentionally empty one is a reviewed decision. The
    /// workbook value is still kept on the row, so the original text remains auditable.
    /// </summary>
    public bool IsIntentionallyEmpty => CorrectedValue is null;

    public DateTime CreatedAtUtc { get; private set; }

    public DateTime UpdatedAtUtc { get; private set; }

    /// <param name="correctedValue">
    /// The text the cell should have said, or null to record that it is empty on purpose. An empty or
    /// whitespace-only string is refused: it would be indistinguishable from having no correction at all.
    /// </param>
    internal void Update(string? correctedValue)
    {
        if (correctedValue is null)
        {
            CorrectedValue = null;
            return;
        }

        var text = correctedValue.Trim();
        if (text.Length == 0)
        {
            throw new DomainException("A correction needs a value. Remove the correction to fall back to the Excel value.");
        }

        if (text.Length > ValueMaxLength)
        {
            throw new DomainException($"A correction must not exceed {ValueMaxLength} characters.");
        }

        CorrectedValue = text;
    }
}
