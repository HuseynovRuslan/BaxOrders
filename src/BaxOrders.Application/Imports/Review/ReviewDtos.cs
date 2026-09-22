using BaxOrders.Domain.Imports;

namespace BaxOrders.Application.Imports.Review;

/// <param name="DistinctValues">Distinct unresolved source values of this kind in the batch.</param>
/// <param name="AffectedRows">Staged rows waiting for those decisions.</param>
/// <param name="DependencyBlockedRows">
/// Rows that cannot be reviewed for this kind yet because an earlier decision is missing. Only product variants
/// have such rows today: their identity needs the resolved product and units.
/// </param>
/// <param name="TotalValues">Distinct values of this kind in the batch, decided or not: the work queue's denominator.</param>
/// <param name="ResolvedValues">Values that already point at a canonical record.</param>
public sealed record UnresolvedSummaryItem(
    ImportResolutionKind Kind,
    int DistinctValues,
    int AffectedRows,
    int DependencyBlockedRows = 0,
    int TotalValues = 0,
    int ResolvedValues = 0);

public enum UnresolvedStatus
{
    /// <summary>No canonical record or alias matches the value.</summary>
    Unknown,

    /// <summary>The value matches more than one record; a person must choose.</summary>
    Ambiguous,

    /// <summary>A category level between filled levels is blank, so the hierarchy cannot be created.</summary>
    IncompletePath,
}

public sealed record UnresolvedSampleRow(string SheetName, int RowNumber, string? ProductName, string? LocationName, DateOnly? Period);

/// <param name="SourceKey">Deterministic key of the distinct value; resolutions are stored against it.</param>
/// <param name="DisplayValue">The most common original spelling, shown to the operator.</param>
/// <param name="ParentLabel">Context for values that belong to another record, such as the product of a variant.</param>
public sealed record UnresolvedValue(
    string SourceKey,
    string DisplayValue,
    string NormalizedValue,
    int AffectedRowCount,
    IReadOnlyList<string> SampleOriginalValues,
    IReadOnlyList<UnresolvedSampleRow> SampleRows,
    UnresolvedStatus CurrentStatus,
    string? ParentLabel = null);

public sealed record UnresolvedQuery(ImportResolutionKind Kind, string? Search = null, int Page = 1, int PageSize = 25);

public sealed record CategoryPathLevel(string Name, int? ExistingCategoryId);

/// <param name="CanCreate">False when the path has a blank level; only mapping to an existing category is possible.</param>
public sealed record CategoryPathPlan(
    string SourceKey,
    IReadOnlyList<CategoryPathLevel> Levels,
    bool CanCreate,
    string? Problem);

/// <summary>What creating this variant would produce. Built from canonical values, not from raw cell text.</summary>
/// <param name="CanCreate">False while a prerequisite decision is missing.</param>
/// <param name="SpecificationDescriptor">A word from "Vahid" that is not a unit ("diş", "qat"), when there is one.</param>
/// <param name="OrderUnitLabel">Empty when the rows were explicitly reviewed as having no order unit.</param>
public sealed record VariantPlan(
    string SourceKey,
    long ProductId,
    string ProductLabel,
    string? SpecificationValue,
    string? SpecificationUnitLabel,
    string? ModelCode,
    string OrderUnitLabel,
    bool CanCreate,
    string? Problem,
    string? SpecificationDescriptor = null);

/// <summary>What one distinct source value looks like in the batch, for a bulk plan.</summary>
/// <param name="DisplayValue">Most common spelling; ties keep the order the sheet shows them in.</param>
/// <param name="SourceSpellings">How many different raw spellings fall into this one value.</param>
public sealed record SourceValueFacts(string SourceKey, string DisplayValue, int AffectedRowCount, int SourceSpellings);

/// <param name="Secondary">Extra context for the operator, such as a code or the full category path.</param>
public sealed record ReferenceOption(long Id, string Label, string? Secondary);

/// <summary>Staging columns a review kind works on.</summary>
/// <param name="MatchedIsLong">True when the matched id column is a long (products and variants).</param>
public sealed record ReviewColumns(
    string KeyProperty,
    string MatchedProperty,
    string? OriginalProperty,
    string FieldName,
    bool MatchedIsLong = false);
