using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Imports.Review;

/// <summary>
/// Read-side of the import review center. Everything is grouped by distinct source value, not by row, so an
/// operator sees "98 unresolved suppliers affecting 2,672 rows" instead of thousands of issues.
/// </summary>
public sealed class ImportReviewQueries(IBaxOrdersDbContext db)
{
    public const int MaxPageSize = 100;
    private const int SampleRowCount = 3;
    private const int SampleValueCount = 5;

    /// <summary>Kinds an operator can resolve. Products and variants come last: their identity depends on the rest.</summary>
    public static readonly IReadOnlyList<ImportResolutionKind> ReviewKinds =
    [
        ImportResolutionKind.Location,
        ImportResolutionKind.Supplier,
        ImportResolutionKind.ResponsiblePerson,
        ImportResolutionKind.OrderUnit,
        ImportResolutionKind.SpecificationUnit,
        ImportResolutionKind.CategoryPath,
        ImportResolutionKind.Product,
        ImportResolutionKind.ProductVariant,
    ];

    /// <summary>
    /// Staging columns of each kind: the source key, the matched id, the original text column (null where the value
    /// spans several columns) and the Excel column label.
    /// </summary>
    public static ReviewColumns Columns(ImportResolutionKind kind) => kind switch
    {
        ImportResolutionKind.Location => new(nameof(ImportRow.NormalizedLocationName), nameof(ImportRow.MatchedLocationId), nameof(ImportRow.OriginalLocationName), "Obyekt"),
        ImportResolutionKind.Supplier => new(nameof(ImportRow.NormalizedSupplierName), nameof(ImportRow.MatchedSupplierId), nameof(ImportRow.OriginalSupplierName), "Şirkət"),
        ImportResolutionKind.ResponsiblePerson => new(nameof(ImportRow.NormalizedResponsiblePersonName), nameof(ImportRow.MatchedResponsiblePersonId), nameof(ImportRow.OriginalResponsiblePersonName), "Cavabdeh şəxs"),
        ImportResolutionKind.OrderUnit => new(nameof(ImportRow.NormalizedOrderUnit), nameof(ImportRow.MatchedOrderUnitId), nameof(ImportRow.OriginalOrderUnit), "Ö/v"),
        ImportResolutionKind.SpecificationUnit => new(nameof(ImportRow.NormalizedSpecificationUnit), nameof(ImportRow.MatchedSpecificationUnitId), nameof(ImportRow.OriginalSpecificationUnit), "Vahid"),
        ImportResolutionKind.CategoryPath => new(nameof(ImportRow.NormalizedCategoryPath), nameof(ImportRow.MatchedCategoryId), null, "Kateqoriya"),
        ImportResolutionKind.Product => new(nameof(ImportRow.NormalizedProductName), nameof(ImportRow.MatchedProductId), nameof(ImportRow.OriginalProductName), "Malın adı", MatchedIsLong: true),
        ImportResolutionKind.ProductVariant => new(nameof(ImportRow.VariantSourceKey), nameof(ImportRow.MatchedProductVariantId), null, "Malın adı", MatchedIsLong: true),
        _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "This kind cannot be reviewed yet."),
    };

    public async Task<IReadOnlyList<UnresolvedSummaryItem>?> GetSummaryAsync(long importBatchId, CancellationToken cancellationToken)
    {
        if (!await db.ImportBatches.AnyAsync(batch => batch.Id == importBatchId, cancellationToken))
        {
            return null;
        }

        var summary = new List<UnresolvedSummaryItem>();

        foreach (var kind in ReviewKinds)
        {
            var keyProperty = Columns(kind).KeyProperty;
            var rows = UnresolvedRows(importBatchId, kind);

            var affectedRows = await rows.CountAsync(cancellationToken);
            var distinctValues = affectedRows == 0
                ? 0
                : await rows.Select(row => EF.Property<string>(row, keyProperty)).Distinct().CountAsync(cancellationToken);

            var blocked = kind == ImportResolutionKind.ProductVariant
                ? await VariantsWaitingForDependenciesQuery(importBatchId).CountAsync(cancellationToken)
                : 0;

            // The work queue needs a denominator: every distinct value of this kind, decided or not.
            var totalValues = await db.ImportRows.AsNoTracking()
                .Where(row => row.ImportBatchId == importBatchId && !row.IsExcluded && EF.Property<string?>(row, keyProperty) != null)
                .Select(row => EF.Property<string>(row, keyProperty))
                .Distinct()
                .CountAsync(cancellationToken);

            summary.Add(new UnresolvedSummaryItem(
                kind, distinctValues, affectedRows, blocked, totalValues, Math.Max(0, totalValues - distinctValues)));
        }

        return summary;
    }

    public async Task<PagedResult<UnresolvedValue>?> GetUnresolvedAsync(long importBatchId, UnresolvedQuery query, CancellationToken cancellationToken)
    {
        if (!await db.ImportBatches.AnyAsync(batch => batch.Id == importBatchId, cancellationToken))
        {
            return null;
        }

        var columns = Columns(query.Kind);
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var rows = UnresolvedRows(importBatchId, query.Kind);
        var search = TextNormalizer.Normalize(query.Search);
        if (search.Length > 0)
        {
            rows = query.Kind == ImportResolutionKind.ProductVariant
                ? rows.Where(row => row.NormalizedProductName != null && row.NormalizedProductName.Contains(search))
                : rows.Where(row => EF.Property<string>(row, columns.KeyProperty).Contains(search));
        }

        var groups = rows
            .GroupBy(row => EF.Property<string>(row, columns.KeyProperty))
            .Select(group => new { SourceKey = group.Key, AffectedRowCount = group.Count() });

        var totalCount = await groups.CountAsync(cancellationToken);
        var pageGroups = await groups
            .OrderByDescending(group => group.AffectedRowCount)
            .ThenBy(group => group.SourceKey)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var keys = pageGroups.Select(group => group.SourceKey).ToList();
        var samples = await SampleRowsAsync(importBatchId, columns.KeyProperty, keys, cancellationToken);
        var ambiguousKeys = await AmbiguousKeysAsync(importBatchId, columns.KeyProperty, columns.FieldName, keys, cancellationToken);
        var productLabels = query.Kind == ImportResolutionKind.ProductVariant
            ? await ProductLabelsAsync(keys, cancellationToken)
            : [];

        var items = pageGroups.Select(group =>
        {
            var rowsOfKey = samples.TryGetValue(group.SourceKey, out var found) ? found : [];
            var originals = Spellings(query.Kind, rowsOfKey);

            string? parentLabel = null;
            if (query.Kind == ImportResolutionKind.ProductVariant && ImportSourceKeys.TryReadProduct(group.SourceKey, out var productId))
            {
                parentLabel = productLabels.GetValueOrDefault(productId);
            }

            return new UnresolvedValue(
                group.SourceKey,
                originals.FirstOrDefault() ?? group.SourceKey,
                group.SourceKey,
                group.AffectedRowCount,
                originals.Take(SampleValueCount).ToList(),
                rowsOfKey.Take(SampleRowCount)
                    .Select(row => new UnresolvedSampleRow(row.SheetName, row.RowNumber, Trimmed(row.ProductName), Trimmed(row.LocationName), row.Period))
                    .ToList(),
                Status(query.Kind, group.SourceKey, ambiguousKeys),
                parentLabel);
        }).ToList();

        return new PagedResult<UnresolvedValue>(items, page, pageSize, totalCount);
    }

    /// <summary>
    /// Shows which levels of an unresolved category path already exist and which would be created.
    /// Null when the batch has no row with that path.
    /// </summary>
    public async Task<CategoryPathPlan?> GetCategoryPathPlanAsync(long importBatchId, string sourceKey, CancellationToken cancellationToken)
    {
        // With its corrections: the path is keyed by the levels the row effectively has, so the names created
        // under it have to be those same levels and not the spelling the operator already corrected.
        var sample = await db.ImportRows.AsNoTracking()
            .Include(row => row.Corrections)
            .Where(row => row.ImportBatchId == importBatchId && row.NormalizedCategoryPath == sourceKey)
            .FirstOrDefaultAsync(cancellationToken);

        if (sample is null)
        {
            return null;
        }

        if (ImportSourceKeys.HasMissingCategoryLevel(sourceKey))
        {
            return new CategoryPathPlan(sourceKey, [], false,
                "The path has a blank level between filled levels, so the hierarchy cannot be created. Map it to an existing category instead.");
        }

        var normalizedLevels = ImportSourceKeys.CategoryLevels(sourceKey);
        var displayLevels = new[]
            {
                sample.Effective(ImportCorrectionField.MainCategory),
                sample.Effective(ImportCorrectionField.MiddleCategory),
                sample.Effective(ImportCorrectionField.SubCategory),
            }
            .Select(level => level?.Trim())
            .Where(level => !string.IsNullOrEmpty(level))
            .ToList();

        var levels = new List<CategoryPathLevel>();
        int? parentId = null;
        var parentExists = true;

        for (var index = 0; index < normalizedLevels.Count; index++)
        {
            var name = index < displayLevels.Count ? displayLevels[index]! : normalizedLevels[index];
            int? existingId = null;

            if (parentExists)
            {
                existingId = await FindCategoryAsync(parentId, normalizedLevels[index], cancellationToken);
                parentExists = existingId is not null;
                parentId = existingId;
            }

            levels.Add(new CategoryPathLevel(name, existingId));
        }

        return new CategoryPathPlan(sourceKey, levels, true, null);
    }

    /// <summary>
    /// What creating this variant would produce: the resolved product, the specification as written, and the
    /// canonical units the identity is built from. Null when the batch has no row with that variant key.
    /// </summary>
    public async Task<VariantPlan?> GetVariantPlanAsync(long importBatchId, string sourceKey, CancellationToken cancellationToken)
    {
        // With its corrections, because what would be created is the cell as the operator settled it — the
        // workbook text is what the correction exists to replace.
        var sample = await db.ImportRows.AsNoTracking()
            .Include(row => row.Corrections)
            .Where(row => row.ImportBatchId == importBatchId && row.VariantSourceKey == sourceKey)
            .FirstOrDefaultAsync(cancellationToken);

        if (sample is null)
        {
            return null;
        }

        if (sample.MatchedProductId is not { } productId)
        {
            return new VariantPlan(
                sourceKey, 0, sample.Effective(ImportCorrectionField.ProductName)?.Trim() ?? string.Empty,
                null, null, null, string.Empty, false,
                "The product and its units must be resolved before the variant can be created.");
        }

        var product = await db.Products.AsNoTracking()
            .Where(item => item.Id == productId)
            .Select(item => $"{item.Name} ({item.Code})")
            .SingleAsync(cancellationToken);

        // A row carries a variant key only once matching accepted its units, so a missing order unit here is
        // the reviewed "this line has none", not an outstanding decision.
        var orderUnit = sample.MatchedOrderUnitId is { } orderUnitId
            ? await UnitLabelAsync(orderUnitId, cancellationToken)
            : string.Empty;
        var specificationUnit = sample.MatchedSpecificationUnitId is { } specificationUnitId
            ? await UnitLabelAsync(specificationUnitId, cancellationToken)
            : null;

        return new VariantPlan(
            sourceKey,
            productId,
            product,
            Trimmed(sample.Effective(ImportCorrectionField.SpecificationValue)),
            specificationUnit,
            Trimmed(sample.Effective(ImportCorrectionField.ModelCode)),
            orderUnit,
            true,
            null,
            sample.SpecificationDescriptor);
    }

    /// <summary>
    /// Facts about the given distinct values, in one query per kind: the spelling to show, how many staged rows
    /// still wait for a decision, and how many raw spellings fall into the value. Used to plan bulk operations.
    /// </summary>
    public async Task<IReadOnlyDictionary<string, SourceValueFacts>> SourceValuesAsync(
        long importBatchId, ImportResolutionKind kind, IReadOnlyCollection<string> sourceKeys, CancellationToken cancellationToken)
    {
        var keys = sourceKeys.Distinct(StringComparer.Ordinal).ToList();
        if (keys.Count == 0)
        {
            return new Dictionary<string, SourceValueFacts>(StringComparer.Ordinal);
        }

        var rows = await ProjectAsync(UnresolvedRows(importBatchId, kind), Columns(kind).KeyProperty, keys, cancellationToken);

        return rows
            .GroupBy(row => row.SourceKey, StringComparer.Ordinal)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var spellings = Spellings(kind, group);
                    return new SourceValueFacts(group.Key, spellings.FirstOrDefault() ?? group.Key, group.Count(), spellings.Count);
                },
                StringComparer.Ordinal);
    }

    internal Task<int?> FindCategoryAsync(int? parentId, string normalizedName, CancellationToken cancellationToken)
    {
        var categories = db.Categories.AsNoTracking().Where(category => category.IsActive && category.NormalizedName == normalizedName);
        categories = parentId is null
            ? categories.Where(category => category.ParentId == null)
            : categories.Where(category => category.ParentId == parentId);

        return categories.Select(category => (int?)category.Id).FirstOrDefaultAsync(cancellationToken);
    }

    /// <summary>Rows whose variant cannot be reviewed yet because the product or a unit is still unresolved.</summary>
    internal IQueryable<ImportRow> VariantsWaitingForDependenciesQuery(long importBatchId) =>
        db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == importBatchId
                          && !row.IsExcluded
                          && row.NormalizedProductName != null
                          && row.MatchedProductVariantId == null
                          && row.VariantSourceKey == null);

    private IQueryable<ImportRow> UnresolvedRows(long importBatchId, ImportResolutionKind kind)
    {
        var columns = Columns(kind);
        // An excluded row never becomes an order request, so it never asks for a decision either.
        var rows = db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == importBatchId && !row.IsExcluded && EF.Property<string?>(row, columns.KeyProperty) != null);

        rows = columns.MatchedIsLong
            ? rows.Where(row => EF.Property<long?>(row, columns.MatchedProperty) == null)
            : rows.Where(row => EF.Property<int?>(row, columns.MatchedProperty) == null);

        // A value someone confirmed is not a unit has been decided: it points at no record, on purpose, and
        // must not keep asking for one.
        if (kind is ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit)
        {
            var decided = db.ImportResolutions
                .Where(resolution => resolution.ImportBatchId == importBatchId
                                     && resolution.Kind == kind
                                     && resolution.Action == ResolutionAction.MarkNotAUnit)
                .Select(resolution => resolution.SourceKey);

            rows = rows.Where(row => !decided.Contains(EF.Property<string?>(row, columns.KeyProperty)!));
        }

        return rows;
    }

    private async Task<Dictionary<long, string>> ProductLabelsAsync(IReadOnlyList<string> variantKeys, CancellationToken cancellationToken)
    {
        var productIds = variantKeys
            .Select(key => ImportSourceKeys.TryReadProduct(key, out var productId) ? productId : 0)
            .Where(productId => productId > 0)
            .Distinct()
            .ToList();

        if (productIds.Count == 0)
        {
            return [];
        }

        return await db.Products.AsNoTracking()
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id, product => $"{product.Name} ({product.Code})", cancellationToken);
    }

    private Task<string> UnitLabelAsync(int unitId, CancellationToken cancellationToken) =>
        db.UnitsOfMeasure.AsNoTracking().Where(unit => unit.Id == unitId).Select(unit => $"{unit.Code} — {unit.Name}").SingleAsync(cancellationToken);

    private async Task<Dictionary<string, List<SampleProjection>>> SampleRowsAsync(
        long importBatchId, string keyProperty, IReadOnlyList<string> keys, CancellationToken cancellationToken)
    {
        if (keys.Count == 0)
        {
            return [];
        }

        var rows = await ProjectAsync(db.ImportRows.AsNoTracking().Where(row => row.ImportBatchId == importBatchId), keyProperty, keys, cancellationToken);

        return rows.GroupBy(row => row.SourceKey, StringComparer.Ordinal).ToDictionary(group => group.Key, group => group.ToList(), StringComparer.Ordinal);
    }

    /// <summary>The staging columns every review screen reads, for the given distinct values.</summary>
    private Task<List<SampleProjection>> ProjectAsync(
        IQueryable<ImportRow> rows, string keyProperty, IReadOnlyCollection<string> keys, CancellationToken cancellationToken)
    {
        return rows
            .Where(row => keys.Contains(EF.Property<string>(row, keyProperty)))
            .OrderBy(row => row.RowNumber)
            .Select(row => new SampleProjection(
                EF.Property<string>(row, keyProperty),
                row.SheetName,
                row.RowNumber,
                row.OriginalProductName,
                row.OriginalLocationName,
                row.ParsedRequestPeriod,
                row.OriginalSupplierName,
                row.OriginalResponsiblePersonName,
                row.OriginalOrderUnit,
                row.OriginalSpecificationUnit,
                row.OriginalMainCategory,
                row.OriginalMiddleCategory,
                row.OriginalSubCategory,
                row.OriginalSpecificationValue,
                row.OriginalModelCode))
            .ToListAsync(cancellationToken);
    }

    /// <summary>Distinct spellings of one value: most common first, ties by first appearance in the sheet.</summary>
    private static List<string> Spellings(ImportResolutionKind kind, IEnumerable<SampleProjection> rows) =>
        rows.Select(row => DisplayOf(kind, row))
            .Where(value => value.Length > 0)
            .Select((value, index) => (Value: value, Index: index))
            .GroupBy(entry => entry.Value, StringComparer.Ordinal)
            .OrderByDescending(byValue => byValue.Count())
            .ThenBy(byValue => byValue.Min(entry => entry.Index))
            .Select(byValue => byValue.Key)
            .ToList();

    private async Task<HashSet<string>> AmbiguousKeysAsync(
        long importBatchId, string keyProperty, string fieldName, IReadOnlyList<string> keys, CancellationToken cancellationToken)
    {
        if (keys.Count == 0)
        {
            return [];
        }

        var ambiguous = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == importBatchId
                          && keys.Contains(EF.Property<string>(row, keyProperty))
                          && row.Issues.Any(issue => issue.IssueType == ImportIssueType.AmbiguousMatch && issue.FieldName == fieldName))
            .Select(row => EF.Property<string>(row, keyProperty))
            .Distinct()
            .ToListAsync(cancellationToken);

        return [.. ambiguous];
    }

    private static UnresolvedStatus Status(ImportResolutionKind kind, string sourceKey, HashSet<string> ambiguousKeys)
    {
        if (kind == ImportResolutionKind.CategoryPath && ImportSourceKeys.HasMissingCategoryLevel(sourceKey))
        {
            return UnresolvedStatus.IncompletePath;
        }

        return ambiguousKeys.Contains(sourceKey) ? UnresolvedStatus.Ambiguous : UnresolvedStatus.Unknown;
    }

    private static string DisplayOf(ImportResolutionKind kind, SampleProjection row) => kind switch
    {
        ImportResolutionKind.Location => Trimmed(row.LocationName) ?? string.Empty,
        ImportResolutionKind.Supplier => Trimmed(row.SupplierName) ?? string.Empty,
        ImportResolutionKind.ResponsiblePerson => Trimmed(row.ResponsiblePersonName) ?? string.Empty,
        ImportResolutionKind.OrderUnit => Trimmed(row.OrderUnit) ?? string.Empty,
        ImportResolutionKind.SpecificationUnit => Trimmed(row.SpecificationUnit) ?? string.Empty,
        ImportResolutionKind.Product => Trimmed(row.ProductName) ?? string.Empty,
        ImportResolutionKind.ProductVariant => VariantDisplay(row),
        ImportResolutionKind.CategoryPath => string.Join(" → ",
            new[] { row.MainCategory, row.MiddleCategory, row.SubCategory }
                .Select(Trimmed)
                .Where(level => !string.IsNullOrEmpty(level))),
        _ => string.Empty,
    };

    /// <summary>The variant as the author wrote it: "50 sm · AB-12 · ədəd".</summary>
    private static string VariantDisplay(SampleProjection row) =>
        VariantDescription.Of(row.SpecificationValue, row.SpecificationUnit, row.ModelCode, row.OrderUnit);

    private static string? Trimmed(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed record SampleProjection(
        string SourceKey,
        string SheetName,
        int RowNumber,
        string? ProductName,
        string? LocationName,
        DateOnly? Period,
        string? SupplierName,
        string? ResponsiblePersonName,
        string? OrderUnit,
        string? SpecificationUnit,
        string? MainCategory,
        string? MiddleCategory,
        string? SubCategory,
        string? SpecificationValue,
        string? ModelCode);
}
