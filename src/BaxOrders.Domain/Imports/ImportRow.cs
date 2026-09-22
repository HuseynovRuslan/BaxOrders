using BaxOrders.Domain.Orders;

namespace BaxOrders.Domain.Imports;

/// <summary>
/// Staging record of one Excel row. Original cell text is preserved verbatim for auditing,
/// debugging and correcting mappings; it is never inserted directly into order requests.
/// </summary>
public sealed class ImportRow
{
    public const int SheetNameMaxLength = 100;

    /// <summary>Limit for free-text cells (names, categories).</summary>
    public const int SourceTextMaxLength = 1000;

    /// <summary>Limit for short cells (numbers, units, codes, dates).</summary>
    public const int SourceValueMaxLength = 255;

    public const int LineTotalPrecision = 18;
    public const int LineTotalScale = 4;

    /// <summary>Longest exclusion reason; short enough to stay a reason, long enough to be one.</summary>
    public const int ExclusionReasonMaxLength = 500;

    private readonly List<ImportRowIssue> _issues = [];
    private readonly List<ImportRowCorrection> _corrections = [];

    private ImportRow()
    {
    }

    internal ImportRow(ImportBatch importBatch, string sheetName, int rowNumber, ImportRowOriginalValues original)
    {
        ArgumentNullException.ThrowIfNull(original);

        if (string.IsNullOrEmpty(sheetName))
        {
            throw new DomainException("Sheet name is required.");
        }

        if (rowNumber <= 0)
        {
            throw new DomainException("Row number must be greater than zero.");
        }

        ImportBatch = importBatch;
        ImportBatchId = importBatch.Id;
        SheetName = Guard.SourceText(sheetName, SheetNameMaxLength, nameof(SheetName))!;
        RowNumber = rowNumber;

        OriginalSequenceNumber = Guard.SourceText(original.SequenceNumber, SourceValueMaxLength, nameof(OriginalSequenceNumber));
        OriginalMainCategory = Guard.SourceText(original.MainCategory, SourceTextMaxLength, nameof(OriginalMainCategory));
        OriginalMiddleCategory = Guard.SourceText(original.MiddleCategory, SourceTextMaxLength, nameof(OriginalMiddleCategory));
        OriginalSubCategory = Guard.SourceText(original.SubCategory, SourceTextMaxLength, nameof(OriginalSubCategory));
        OriginalProductName = Guard.SourceText(original.ProductName, SourceTextMaxLength, nameof(OriginalProductName));
        OriginalSpecificationValue = Guard.SourceText(original.SpecificationValue, SourceValueMaxLength, nameof(OriginalSpecificationValue));
        OriginalSpecificationUnit = Guard.SourceText(original.SpecificationUnit, SourceValueMaxLength, nameof(OriginalSpecificationUnit));
        OriginalModelCode = Guard.SourceText(original.ModelCode, SourceValueMaxLength, nameof(OriginalModelCode));
        OriginalQuantity = Guard.SourceText(original.Quantity, SourceValueMaxLength, nameof(OriginalQuantity));
        OriginalOrderUnit = Guard.SourceText(original.OrderUnit, SourceValueMaxLength, nameof(OriginalOrderUnit));
        OriginalUnitPrice = Guard.SourceText(original.UnitPrice, SourceValueMaxLength, nameof(OriginalUnitPrice));
        OriginalLineTotal = Guard.SourceText(original.LineTotal, SourceValueMaxLength, nameof(OriginalLineTotal));
        OriginalSupplierName = Guard.SourceText(original.SupplierName, SourceTextMaxLength, nameof(OriginalSupplierName));
        OriginalLocationName = Guard.SourceText(original.LocationName, SourceTextMaxLength, nameof(OriginalLocationName));
        OriginalRequestDate = Guard.SourceText(original.RequestDate, SourceValueMaxLength, nameof(OriginalRequestDate));
        OriginalResponsiblePersonName = Guard.SourceText(original.ResponsiblePersonName, SourceTextMaxLength, nameof(OriginalResponsiblePersonName));

        RefreshSourceKeys();

        ValidationStatus = ImportRowValidationStatus.Pending;
    }

    public long Id { get; private set; }

    public long ImportBatchId { get; private set; }

    public ImportBatch ImportBatch { get; private set; } = null!;

    public string SheetName { get; private set; } = null!;

    /// <summary>Physical worksheet row number (1-based), not the "№" column.</summary>
    public int RowNumber { get; private set; }

    public string? OriginalSequenceNumber { get; private set; }

    public string? OriginalMainCategory { get; private set; }

    public string? OriginalMiddleCategory { get; private set; }

    public string? OriginalSubCategory { get; private set; }

    public string? OriginalProductName { get; private set; }

    public string? OriginalSpecificationValue { get; private set; }

    public string? OriginalSpecificationUnit { get; private set; }

    public string? OriginalModelCode { get; private set; }

    public string? OriginalQuantity { get; private set; }

    public string? OriginalOrderUnit { get; private set; }

    public string? OriginalUnitPrice { get; private set; }

    public string? OriginalLineTotal { get; private set; }

    public string? OriginalSupplierName { get; private set; }

    public string? OriginalLocationName { get; private set; }

    public string? OriginalRequestDate { get; private set; }

    public string? OriginalResponsiblePersonName { get; private set; }

    public string? NormalizedProductName { get; private set; }

    public string? NormalizedSupplierName { get; private set; }

    public string? NormalizedLocationName { get; private set; }

    public string? NormalizedResponsiblePersonName { get; private set; }

    public string? NormalizedOrderUnit { get; private set; }

    public string? NormalizedSpecificationUnit { get; private set; }

    /// <summary>Category levels from the root, joined by <see cref="ImportSourceKeys.CategoryPathSeparator"/>.</summary>
    public string? NormalizedCategoryPath { get; private set; }

    public decimal? ParsedQuantity { get; private set; }

    public decimal? ParsedUnitPrice { get; private set; }

    /// <summary>The Excel "Cəmi" value as a number. Compared against <see cref="CalculatedLineTotal"/>, never trusted.</summary>
    public decimal? ParsedLineTotal { get; private set; }

    /// <summary>First day of the analytical month. For the order workbook this comes from "Tarix".</summary>
    public DateOnly? ParsedRequestPeriod { get; private set; }

    /// <summary>
    /// Day the request was written, only for sources that state it separately from the period (legacy request forms).
    /// Always null for the order workbook, whose "Tarix" is a period.
    /// </summary>
    public DateOnly? ParsedRequestDate { get; private set; }

    public long? MatchedProductId { get; private set; }

    public long? MatchedProductVariantId { get; private set; }

    public int? MatchedSupplierId { get; private set; }

    public int? MatchedLocationId { get; private set; }

    public int? MatchedResponsiblePersonId { get; private set; }

    public int? MatchedCategoryId { get; private set; }

    public int? MatchedOrderUnitId { get; private set; }

    public int? MatchedSpecificationUnitId { get; private set; }

    /// <summary>
    /// The "Vahid" value once the review confirmed it is not a unit of measure but a word describing what the
    /// specification counts ("diş", "qat", "lik"). It is part of the variant identity, so it is stored next to
    /// the matched ids instead of being re-derived from the key.
    /// </summary>
    public string? SpecificationDescriptor { get; private set; }

    /// <summary>
    /// Identity of the variant this row describes, once the product and its units are resolved
    /// (<see cref="ImportSourceKeys.ProductVariant"/>). Null means the variant cannot be reviewed yet.
    /// </summary>
    public string? VariantSourceKey { get; private set; }

    /// <summary>
    /// Hash of the business values that decide whether two rows are possible duplicates. Stored so a single
    /// correction only has to refresh the two fingerprint groups it touches instead of the whole batch.
    /// </summary>
    public string? DuplicateFingerprint { get; private set; }

    /// <summary>An operator decided this row does not belong in the import. The row itself is kept.</summary>
    public bool IsExcluded { get; private set; }

    public string? ExclusionReason { get; private set; }

    public DateTime? ExcludedAtUtc { get; private set; }

    public ImportRowValidationStatus ValidationStatus { get; private set; }

    public IReadOnlyCollection<ImportRowIssue> Issues => _issues;

    /// <summary>What an operator says single cells of this row should have said. Requires loading.</summary>
    public IReadOnlyCollection<ImportRowCorrection> Corrections => _corrections;

    public DateTime CreatedAtUtc { get; private set; }

    /// <summary>Quantity × unit price from the parsed values; null if either is missing.</summary>
    public decimal? CalculatedLineTotal =>
        ParsedQuantity is { } quantity && ParsedUnitPrice is { } price ? quantity * price : null;

    /// <summary>The workbook value of one correctable cell, exactly as it was read.</summary>
    public string? Source(ImportCorrectionField field) => field switch
    {
        ImportCorrectionField.MainCategory => OriginalMainCategory,
        ImportCorrectionField.MiddleCategory => OriginalMiddleCategory,
        ImportCorrectionField.SubCategory => OriginalSubCategory,
        ImportCorrectionField.ProductName => OriginalProductName,
        ImportCorrectionField.SpecificationValue => OriginalSpecificationValue,
        ImportCorrectionField.SpecificationUnit => OriginalSpecificationUnit,
        ImportCorrectionField.ModelCode => OriginalModelCode,
        ImportCorrectionField.Quantity => OriginalQuantity,
        ImportCorrectionField.OrderUnit => OriginalOrderUnit,
        ImportCorrectionField.UnitPrice => OriginalUnitPrice,
        ImportCorrectionField.Supplier => OriginalSupplierName,
        ImportCorrectionField.Location => OriginalLocationName,
        ImportCorrectionField.RequestPeriod => OriginalRequestDate,
        ImportCorrectionField.ResponsiblePerson => OriginalResponsiblePersonName,
        _ => throw new DomainException($"{field} is not a correctable cell."),
    };

    /// <summary>
    /// The value this row is parsed, matched and imported with: the operator's correction when there is one,
    /// otherwise the workbook value. This is the single place that decision is made.
    /// </summary>
    /// <summary>
    /// What the cell says once the operator's decision is applied: the corrected text, nothing at all when the
    /// correction says the cell is empty on purpose, and otherwise the workbook value.
    /// </summary>
    public string? Effective(ImportCorrectionField field) =>
        CorrectionOf(field) is { } correction ? correction.CorrectedValue : Source(field);

    /// <summary>True when an operator reviewed this cell and confirmed it is empty on purpose.</summary>
    public bool IsIntentionallyEmpty(ImportCorrectionField field) =>
        CorrectionOf(field) is { IsIntentionallyEmpty: true };

    public ImportRowCorrection? CorrectionOf(ImportCorrectionField field) =>
        _corrections.FirstOrDefault(correction => correction.Field == field);

    /// <summary>
    /// Records what the cell should have said. One field carries at most one correction, so setting it again
    /// updates that correction. Requires <see cref="Corrections"/> to be loaded.
    /// </summary>
    public ImportRowCorrection SetCorrection(ImportCorrectionField field, string? correctedValue)
    {
        var correction = CorrectionOf(field);
        if (correction is null)
        {
            correction = new ImportRowCorrection(this, field, correctedValue);
            _corrections.Add(correction);
        }
        else
        {
            correction.Update(correctedValue);
        }

        RefreshSourceKeys();
        return correction;
    }

    /// <summary>Drops the correction, so the row falls back to what the workbook said.</summary>
    public ImportRowCorrection? RemoveCorrection(ImportCorrectionField field)
    {
        var correction = CorrectionOf(field);
        if (correction is null)
        {
            return null;
        }

        _corrections.Remove(correction);
        RefreshSourceKeys();
        return correction;
    }

    /// <summary>
    /// Recomputes the distinct-value keys from the effective values, so a corrected row is reviewed and
    /// resolved under the value it should have had â and never inherits a decision made for the old one.
    /// </summary>
    public void RefreshSourceKeys()
    {
        NormalizedProductName = ImportSourceKeys.Name(Effective(ImportCorrectionField.ProductName));
        NormalizedSupplierName = ImportSourceKeys.Name(Effective(ImportCorrectionField.Supplier));
        NormalizedLocationName = ImportSourceKeys.Name(Effective(ImportCorrectionField.Location));
        NormalizedResponsiblePersonName = ImportSourceKeys.Name(Effective(ImportCorrectionField.ResponsiblePerson));
        NormalizedOrderUnit = ImportSourceKeys.Name(Effective(ImportCorrectionField.OrderUnit));
        NormalizedSpecificationUnit = ImportSourceKeys.Name(Effective(ImportCorrectionField.SpecificationUnit));
        NormalizedCategoryPath = ImportSourceKeys.CategoryPath(
            Effective(ImportCorrectionField.MainCategory),
            Effective(ImportCorrectionField.MiddleCategory),
            Effective(ImportCorrectionField.SubCategory));
    }

    public void SetDuplicateFingerprint(string? fingerprint) => DuplicateFingerprint = fingerprint;

    /// <summary>
    /// Keeps the row out of the future order import. Nothing is deleted: the row, its issues and its
    /// corrections stay visible, and it still counts in the batch total.
    /// </summary>
    public void Exclude(string reason, DateTime excludedAtUtc)
    {
        ExclusionReason = Guard.RequiredText(reason, ExclusionReasonMaxLength, nameof(ExclusionReason));
        ExcludedAtUtc = Guard.Utc(excludedAtUtc, nameof(excludedAtUtc));
        IsExcluded = true;
    }

    /// <summary>Puts the row back into the import. Its corrections are kept.</summary>
    public void Include()
    {
        IsExcluded = false;
        ExclusionReason = null;
        ExcludedAtUtc = null;
    }

    public void SetParsedValues(decimal? quantity, decimal? unitPrice, decimal? lineTotal, DateOnly? requestPeriod, DateOnly? requestDate = null)
    {
        if (requestPeriod is { Day: not 1 })
        {
            throw new DomainException("A parsed request period must be the first day of a month.");
        }

        if (quantity is { } q)
        {
            Guard.FitsDecimal(q, OrderRequestItem.QuantityPrecision, OrderRequestItem.QuantityScale, nameof(ParsedQuantity));
        }

        if (unitPrice is { } p)
        {
            Guard.FitsDecimal(p, OrderRequestItem.UnitPricePrecision, OrderRequestItem.UnitPriceScale, nameof(ParsedUnitPrice));
        }

        if (lineTotal is { } t)
        {
            Guard.FitsDecimal(t, LineTotalPrecision, LineTotalScale, nameof(ParsedLineTotal));
        }

        ParsedQuantity = quantity;
        ParsedUnitPrice = unitPrice;
        ParsedLineTotal = lineTotal;
        ParsedRequestPeriod = requestPeriod;
        ParsedRequestDate = requestDate;
    }

    /// <summary>A row may carry any number of independent issues (unknown product, unknown supplier, bad quantity, ...).</summary>
    public ImportRowIssue AddIssue(
        ImportIssueType issueType,
        IssueSeverity severity,
        ImportIssueOrigin origin,
        string message,
        string? fieldName = null,
        long? suggestedEntityId = null)
    {
        var issue = new ImportRowIssue(this, issueType, severity, origin, message, fieldName, suggestedEntityId);
        _issues.Add(issue);
        return issue;
    }

    /// <summary>
    /// Removes the issues of one processing step, so that step can be re-run. Other issues are kept.
    /// Requires <see cref="Issues"/> to be loaded.
    /// </summary>
    public int RemoveIssues(ImportIssueOrigin origin) => _issues.RemoveAll(issue => issue.Origin == origin);

    public void ApplyMatches(ImportRowMatches matches)
    {
        ArgumentNullException.ThrowIfNull(matches);

        if (matches.ProductVariantId is not null && matches.ProductId is null)
        {
            throw new DomainException("A matched product variant requires a matched product.");
        }

        MatchedLocationId = matches.LocationId;
        MatchedSupplierId = matches.SupplierId;
        MatchedResponsiblePersonId = matches.ResponsiblePersonId;
        MatchedCategoryId = matches.CategoryId;
        MatchedProductId = matches.ProductId;
        MatchedProductVariantId = matches.ProductVariantId;
        MatchedOrderUnitId = matches.OrderUnitId;
        MatchedSpecificationUnitId = matches.SpecificationUnitId;
        SpecificationDescriptor = matches.SpecificationDescriptor;
        VariantSourceKey = matches.VariantSourceKey;
    }

    /// <summary>
    /// Derives the row status from its issues: any Error → Invalid; otherwise any Warning → NeedsReview;
    /// otherwise Valid. Info issues do not change the status. Requires <see cref="Issues"/> to be loaded.
    /// </summary>
    public ImportRowValidationStatus RefreshValidationStatus()
    {
        ValidationStatus = _issues.Any(issue => issue.Severity == IssueSeverity.Error)
            ? ImportRowValidationStatus.Invalid
            : _issues.Any(issue => issue.Severity == IssueSeverity.Warning)
                ? ImportRowValidationStatus.NeedsReview
                : ImportRowValidationStatus.Valid;

        return ValidationStatus;
    }
}
