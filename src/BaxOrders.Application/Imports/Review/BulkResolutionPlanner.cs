using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BaxOrders.Application.Imports.Review;

/// <summary>
/// Works out what a bulk operation would do — and refuses to guess. It only reads: the same plan is shown to the
/// operator before anything happens and is built again, under the batch lock, when the operation is applied.
/// </summary>
/// <remarks>
/// Every rule of the single-value workflow applies here as well: an unknown or inactive target, a name that
/// already belongs to another record, an alias that would point at two records, a variant of another product or
/// order unit, or a missing dependency all mark the value instead of being worked around.
/// </remarks>
public sealed class BulkResolutionPlanner(IBaxOrdersDbContext db, ImportReviewQueries reviewQueries, IOptions<ImportOptions> options)
{
    public int MaxItems => options.Value.MaxBulkResolutionItems;

    /// <summary>Request shape, checked before the database is touched at all.</summary>
    public void Validate(BulkResolutionRequest request) => BulkResolutionRules.Validate(request, MaxItems);

    public async Task<BulkResolutionPlan> PlanAsync(long importBatchId, BulkResolutionRequest request, CancellationToken cancellationToken)
    {
        Validate(request);

        if (!await db.ImportBatches.AnyAsync(batch => batch.Id == importBatchId, cancellationToken))
        {
            throw new NotFoundException($"Import #{importBatchId} was not found.");
        }

        var contexts = new Dictionary<ImportResolutionKind, KindContext>();
        foreach (var byKind in request.Items.GroupBy(item => item.Kind))
        {
            contexts[byKind.Key] = await ContextAsync(importBatchId, byKind.Key, [.. byKind], cancellationToken);
        }

        var planned = new List<PlannedItem>(request.Items.Count);
        foreach (var item in request.Items)
        {
            planned.Add(Plan(item, contexts[item.Kind]));
        }

        return new BulkResolutionPlan(importBatchId, planned);
    }

    private PlannedItem Plan(BulkResolutionItem item, KindContext context)
    {
        var existing = context.Resolutions.GetValueOrDefault(ImportSourceKeys.Hash(item.SourceKey));

        if (!context.Values.TryGetValue(item.SourceKey, out var facts))
        {
            // Nothing is waiting for this value any more: it was decided, or it is not in the batch at all.
            if (existing is not null)
            {
                return Decided(item, $"#{existing.TargetId}", "This value is already resolved in this import.");
            }

            return context.SettledKeys.Contains(item.SourceKey)
                ? Decided(item, null, "This value is already matched to the catalog; no decision is needed.")
                : new PlannedItem(item, BulkItemStatus.NotFound, item.SourceKey, 0, 0, null, null, false, false,
                    "No staged row of this import carries this value any more. Reload the review list.", null, null);
        }

        if (existing is not null)
        {
            return item.Action == BulkResolutionAction.MapExisting && existing.TargetId == item.TargetId
                ? Decided(item, $"#{existing.TargetId}", "This value is already resolved to the same record.", facts)
                : Conflict(item, facts, $"This value is already resolved to record #{existing.TargetId} in this import.");
        }

        return item.Action == BulkResolutionAction.MapExisting
            ? PlanMapping(item, facts, context)
            : PlanCreation(item, facts, context);
    }

    private PlannedItem PlanMapping(BulkResolutionItem item, SourceValueFacts facts, KindContext context)
    {
        if (context.Targets.GetValueOrDefault(item.TargetId!.Value) is not { } target)
        {
            return Conflict(item, facts, $"Record #{item.TargetId} was not found or is inactive.");
        }

        if (item.Kind == ImportResolutionKind.ProductVariant)
        {
            if (context.Variants.GetValueOrDefault(item.SourceKey) is not { } variant)
            {
                return DependencyBlocked(item, facts);
            }

            if (target.ProductId != variant.ProductId)
            {
                return Conflict(item, facts,
                    $"Variant #{target.Id} belongs to product #{target.ProductId}, but these rows were resolved to product #{variant.ProductId}.");
            }

            if (target.OrderUnitId != variant.OrderUnitId)
            {
                return Conflict(item, facts,
                    $"Variant #{target.Id} is ordered in another unit than these rows. Quantities of different order units cannot be merged.");
            }

            return Ready(item, facts, target.Id, target.Label, createsRecord: false, createsAlias: false, context.ParentLabel(item.SourceKey), variant);
        }

        var createsAlias = false;
        if (item.Scope == ResolutionScope.GlobalAlias)
        {
            var canonicalOwner = Owner(context.CanonicalOwners, item.SourceKey);
            if (canonicalOwner is { } namedBy && namedBy != target.Id)
            {
                return Conflict(item, facts, $"'{facts.DisplayValue}' is already the name of record #{namedBy}; it cannot become an alias of another record.");
            }

            var aliasOwner = Owner(context.AliasOwners, item.SourceKey);
            if (aliasOwner is { } aliasedBy && aliasedBy != target.Id)
            {
                return Conflict(item, facts, $"'{facts.DisplayValue}' is already an alias of record #{aliasedBy}.");
            }

            // Needed only when the spelling is neither the target's own name nor already its alias.
            createsAlias = canonicalOwner is null && aliasOwner is null;
        }

        return Ready(item, facts, target.Id, target.Label, createsRecord: false, createsAlias, context.ParentLabel(item.SourceKey));
    }

    private PlannedItem PlanCreation(BulkResolutionItem item, SourceValueFacts facts, KindContext context)
    {
        if (item.Kind == ImportResolutionKind.ProductVariant)
        {
            if (context.Variants.GetValueOrDefault(item.SourceKey) is not { } variant)
            {
                return DependencyBlocked(item, facts);
            }

            if (context.ExistingVariants.TryGetValue((variant.ProductId, variant.VariantKey), out var duplicate))
            {
                return Conflict(item, facts, $"This variant already exists as #{duplicate}. Map the value to it instead of creating a new one.");
            }

            return Ready(item, facts, null, variant.Label, createsRecord: true, createsAlias: false, context.ParentLabel(item.SourceKey), variant);
        }

        // The record would carry the spelling as its name, so the two must still agree.
        if (TextNormalizer.Normalize(facts.DisplayValue) != item.SourceKey)
        {
            return Conflict(item, facts, "The spelling of this value changed since the list was loaded. Reload the review list.");
        }

        if (Owner(context.CanonicalOwners, item.SourceKey) is { } owner)
        {
            return Conflict(item, facts, $"'{facts.DisplayValue}' is already the name of record #{owner}. Map the value to it instead of creating a new record.");
        }

        if (Owner(context.AliasOwners, item.SourceKey) is { } aliasOwner)
        {
            return Conflict(item, facts, $"'{facts.DisplayValue}' is already an alias of record #{aliasOwner}. Map the value to it instead of creating a new record.");
        }

        return Ready(item, facts, null, facts.DisplayValue, createsRecord: true, createsAlias: false, null);
    }

    private static long? Owner(IReadOnlyDictionary<string, long> owners, string sourceKey) =>
        owners.TryGetValue(sourceKey, out var id) ? id : null;

    private static PlannedItem Ready(
        BulkResolutionItem item,
        SourceValueFacts facts,
        long? targetId,
        string? targetLabel,
        bool createsRecord,
        bool createsAlias,
        string? parentLabel,
        PlannedVariant? variant = null) =>
        new(item, BulkItemStatus.Ready, facts.DisplayValue, facts.AffectedRowCount, facts.SourceSpellings,
            targetId, targetLabel, createsRecord, createsAlias, null, parentLabel, variant);

    private static PlannedItem Conflict(BulkResolutionItem item, SourceValueFacts facts, string problem) =>
        new(item, BulkItemStatus.Conflict, facts.DisplayValue, facts.AffectedRowCount, facts.SourceSpellings,
            item.TargetId, null, false, false, problem, null, null);

    private static PlannedItem DependencyBlocked(BulkResolutionItem item, SourceValueFacts facts) =>
        new(item, BulkItemStatus.DependencyBlocked, facts.DisplayValue, facts.AffectedRowCount, facts.SourceSpellings,
            null, null, false, false,
            "The product and the units of these rows must be resolved before the variant can be decided.", null, null);

    private static PlannedItem Decided(BulkResolutionItem item, string? targetLabel, string problem, SourceValueFacts? facts = null) =>
        new(item, BulkItemStatus.AlreadyResolved, facts?.DisplayValue ?? item.SourceKey, facts?.AffectedRowCount ?? 0,
            facts?.SourceSpellings ?? 0, item.TargetId, targetLabel, false, false, problem, null, null);

    private async Task<KindContext> ContextAsync(
        long importBatchId, ImportResolutionKind kind, IReadOnlyList<BulkResolutionItem> items, CancellationToken cancellationToken)
    {
        var keys = items.Select(item => item.SourceKey).Distinct(StringComparer.Ordinal).ToList();
        var values = await reviewQueries.SourceValuesAsync(importBatchId, kind, keys, cancellationToken);

        var hashes = keys.Select(ImportSourceKeys.Hash).ToList();
        var resolutions = (await db.ImportResolutions.AsNoTracking()
                .Where(resolution => resolution.ImportBatchId == importBatchId && resolution.Kind == kind && hashes.Contains(resolution.SourceKeyHash))
                .Select(resolution => new { resolution.SourceKeyHash, resolution.TargetId })
                .ToListAsync(cancellationToken))
            .ToDictionary(resolution => resolution.SourceKeyHash, resolution => new DecidedValue(resolution.TargetId), StringComparer.Ordinal);

        // Values with neither waiting rows nor a decision: are they in the batch at all?
        var missing = keys.Where(key => !values.ContainsKey(key)).ToList();
        var settled = missing.Count == 0
            ? []
            : await SettledKeysAsync(importBatchId, kind, missing, cancellationToken);

        var targetIds = items.Where(item => item.TargetId is > 0).Select(item => item.TargetId!.Value).Distinct().ToList();
        var targets = await TargetsAsync(kind, targetIds, cancellationToken);

        var aliasNeeded = items.Any(item => item.Scope == ResolutionScope.GlobalAlias)
                          || items.Any(item => item.Action == BulkResolutionAction.CreateFromValue);
        var (canonicalOwners, aliasOwners) = aliasNeeded
            ? await OwnersAsync(kind, keys, cancellationToken)
            : ([], []);

        var variants = new Dictionary<string, PlannedVariant>(StringComparer.Ordinal);
        var existingVariants = new Dictionary<(long, string), long>();
        var parents = new Dictionary<long, string>();

        if (kind == ImportResolutionKind.ProductVariant)
        {
            (variants, existingVariants, parents) = await VariantContextAsync(importBatchId, keys, cancellationToken);
        }

        return new KindContext(values, resolutions, settled, targets, canonicalOwners, aliasOwners, variants, existingVariants, parents);
    }

    private async Task<HashSet<string>> SettledKeysAsync(
        long importBatchId, ImportResolutionKind kind, IReadOnlyCollection<string> keys, CancellationToken cancellationToken)
    {
        var keyProperty = ImportReviewQueries.Columns(kind).KeyProperty;
        var found = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == importBatchId && keys.Contains(EF.Property<string>(row, keyProperty)))
            .Select(row => EF.Property<string>(row, keyProperty))
            .Distinct()
            .ToListAsync(cancellationToken);

        return [.. found];
    }

    private async Task<Dictionary<long, TargetOption>> TargetsAsync(
        ImportResolutionKind kind, IReadOnlyCollection<long> ids, CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
        {
            return [];
        }

        var intIds = ids.Where(id => id <= int.MaxValue).Select(id => (int)id).ToList();

        List<TargetOption> targets = kind switch
        {
            ImportResolutionKind.Location => await db.Locations.AsNoTracking()
                .Where(location => intIds.Contains(location.Id) && location.IsActive)
                .Select(location => new TargetOption(location.Id, location.Name + " (" + location.Code + ")", null, null))
                .ToListAsync(cancellationToken),

            ImportResolutionKind.Supplier => await db.Suppliers.AsNoTracking()
                .Where(supplier => intIds.Contains(supplier.Id) && supplier.IsActive)
                .Select(supplier => new TargetOption(supplier.Id, supplier.Name, null, null))
                .ToListAsync(cancellationToken),

            ImportResolutionKind.ResponsiblePerson => await db.ResponsiblePeople.AsNoTracking()
                .Where(person => intIds.Contains(person.Id) && person.IsActive)
                .Select(person => new TargetOption(person.Id, person.Name, null, null))
                .ToListAsync(cancellationToken),

            ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit => await db.UnitsOfMeasure.AsNoTracking()
                .Where(unit => intIds.Contains(unit.Id) && unit.IsActive)
                .Select(unit => new TargetOption(unit.Id, unit.Code + " — " + unit.Name, null, null))
                .ToListAsync(cancellationToken),

            ImportResolutionKind.CategoryPath => await db.Categories.AsNoTracking()
                .Where(category => intIds.Contains(category.Id) && category.IsActive)
                .Select(category => new TargetOption(category.Id, category.Name, null, null))
                .ToListAsync(cancellationToken),

            ImportResolutionKind.Product => await db.Products.AsNoTracking()
                .Where(product => ids.Contains(product.Id) && product.IsActive)
                .Select(product => new TargetOption(product.Id, product.Name + " (" + product.Code + ")", null, null))
                .ToListAsync(cancellationToken),

            _ => await db.ProductVariants.AsNoTracking()
                .Where(variant => ids.Contains(variant.Id) && variant.IsActive)
                .Select(variant => new TargetOption(
                    variant.Id,
                    variant.Product.Name + " (" + variant.Product.Code + ")",
                    variant.ProductId,
                    variant.OrderUnitId))
                .ToListAsync(cancellationToken),
        };

        return targets.ToDictionary(target => target.Id);
    }

    /// <summary>Who already owns these spellings: as a canonical name, or as an approved alias.</summary>
    private async Task<(Dictionary<string, long> Canonical, Dictionary<string, long> Aliases)> OwnersAsync(
        ImportResolutionKind kind, IReadOnlyCollection<string> keys, CancellationToken cancellationToken)
    {
        switch (kind)
        {
            case ImportResolutionKind.Location:
                return (
                    await db.Locations.AsNoTracking().Where(l => l.IsActive && keys.Contains(l.NormalizedName))
                        .ToDictionaryAsync(l => l.NormalizedName, l => (long)l.Id, StringComparer.Ordinal, cancellationToken),
                    await db.LocationAliases.AsNoTracking().Where(a => keys.Contains(a.NormalizedAlias))
                        .ToDictionaryAsync(a => a.NormalizedAlias, a => (long)a.LocationId, StringComparer.Ordinal, cancellationToken));

            case ImportResolutionKind.Supplier:
                return (
                    await db.Suppliers.AsNoTracking().Where(s => s.IsActive && keys.Contains(s.NormalizedName))
                        .ToDictionaryAsync(s => s.NormalizedName, s => (long)s.Id, StringComparer.Ordinal, cancellationToken),
                    await db.SupplierAliases.AsNoTracking().Where(a => keys.Contains(a.NormalizedAlias))
                        .ToDictionaryAsync(a => a.NormalizedAlias, a => (long)a.SupplierId, StringComparer.Ordinal, cancellationToken));

            case ImportResolutionKind.ResponsiblePerson:
                return (
                    await db.ResponsiblePeople.AsNoTracking().Where(p => p.IsActive && keys.Contains(p.NormalizedName))
                        .ToDictionaryAsync(p => p.NormalizedName, p => (long)p.Id, StringComparer.Ordinal, cancellationToken),
                    await db.ResponsiblePersonAliases.AsNoTracking().Where(a => keys.Contains(a.NormalizedAlias))
                        .ToDictionaryAsync(a => a.NormalizedAlias, a => (long)a.ResponsiblePersonId, StringComparer.Ordinal, cancellationToken));

            case ImportResolutionKind.Product:
                return (
                    await db.Products.AsNoTracking().Where(p => p.IsActive && keys.Contains(p.NormalizedName))
                        .ToDictionaryAsync(p => p.NormalizedName, p => p.Id, StringComparer.Ordinal, cancellationToken),
                    await db.ProductAliases.AsNoTracking().Where(a => keys.Contains(a.NormalizedAlias))
                        .ToDictionaryAsync(a => a.NormalizedAlias, a => a.ProductId, StringComparer.Ordinal, cancellationToken));

            case ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit:
            {
                // A unit is known by its code, name and symbol; all three must stay unambiguous.
                var units = await db.UnitsOfMeasure.AsNoTracking().Where(unit => unit.IsActive)
                    .Select(unit => new { unit.Id, unit.Code, unit.Name, unit.Symbol })
                    .ToListAsync(cancellationToken);

                var canonical = new Dictionary<string, long>(StringComparer.Ordinal);
                foreach (var unit in units)
                {
                    foreach (var spelling in new[] { unit.Code, unit.Name, unit.Symbol })
                    {
                        var normalized = TextNormalizer.Normalize(spelling);
                        if (keys.Contains(normalized))
                        {
                            canonical.TryAdd(normalized, unit.Id);
                        }
                    }
                }

                return (
                    canonical,
                    await db.UnitOfMeasureAliases.AsNoTracking().Where(a => keys.Contains(a.NormalizedAlias))
                        .ToDictionaryAsync(a => a.NormalizedAlias, a => (long)a.UnitOfMeasureId, StringComparer.Ordinal, cancellationToken));
            }

            default:
                return ([], []);
        }
    }

    private async Task<(Dictionary<string, PlannedVariant>, Dictionary<(long, string), long>, Dictionary<long, string>)> VariantContextAsync(
        long importBatchId, IReadOnlyCollection<string> keys, CancellationToken cancellationToken)
    {
        var rows = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == importBatchId && row.VariantSourceKey != null && keys.Contains(row.VariantSourceKey))
            .Select(row => new
            {
                row.VariantSourceKey,
                row.MatchedProductId,
                row.MatchedOrderUnitId,
                row.MatchedSpecificationUnitId,
                row.OriginalSpecificationValue,
                row.OriginalModelCode,
                row.SpecificationDescriptor,
            })
            .ToListAsync(cancellationToken);

        var variants = new Dictionary<string, PlannedVariant>(StringComparer.Ordinal);
        foreach (var row in rows.GroupBy(row => row.VariantSourceKey!, StringComparer.Ordinal))
        {
            var sample = row.First();

            // A row only carries a variant key once matching accepted its units, so a missing order unit here
            // means the review said the line has none.
            if (sample.MatchedProductId is not { } productId
                || !ImportSourceKeys.TryReadProduct(row.Key, out var keyProductId)
                || keyProductId != productId)
            {
                continue;
            }

            variants[row.Key] = new PlannedVariant(
                productId,
                sample.MatchedOrderUnitId,
                sample.MatchedSpecificationUnitId,
                sample.OriginalSpecificationValue,
                sample.OriginalModelCode,
                ImportSourceKeys.ReadVariantKey(row.Key),
                sample.SpecificationDescriptor);
        }

        var productIds = variants.Values.Select(variant => variant.ProductId).Distinct().ToList();
        var variantKeys = variants.Values.Select(variant => variant.VariantKey).Distinct().ToList();

        var existing = productIds.Count == 0
            ? []
            : await db.ProductVariants.AsNoTracking()
                .Where(variant => productIds.Contains(variant.ProductId) && variantKeys.Contains(variant.NormalizedVariantKey))
                .Select(variant => new { variant.Id, variant.ProductId, variant.NormalizedVariantKey })
                .ToListAsync(cancellationToken);

        var parents = productIds.Count == 0
            ? []
            : await db.Products.AsNoTracking()
                .Where(product => productIds.Contains(product.Id))
                .ToDictionaryAsync(product => product.Id, product => $"{product.Name} ({product.Code})", cancellationToken);

        return (
            variants,
            existing.ToDictionary(variant => (variant.ProductId, variant.NormalizedVariantKey), variant => variant.Id),
            parents);
    }

    private sealed record TargetOption(long Id, string Label, long? ProductId, int? OrderUnitId);

    private sealed record DecidedValue(long TargetId);

    private sealed record KindContext(
        IReadOnlyDictionary<string, SourceValueFacts> Values,
        IReadOnlyDictionary<string, DecidedValue> Resolutions,
        IReadOnlySet<string> SettledKeys,
        IReadOnlyDictionary<long, TargetOption> Targets,
        IReadOnlyDictionary<string, long> CanonicalOwners,
        IReadOnlyDictionary<string, long> AliasOwners,
        IReadOnlyDictionary<string, PlannedVariant> Variants,
        IReadOnlyDictionary<(long ProductId, string VariantKey), long> ExistingVariants,
        IReadOnlyDictionary<long, string> ProductLabels)
    {
        public string? ParentLabel(string sourceKey) =>
            Variants.GetValueOrDefault(sourceKey) is { } variant ? ProductLabels.GetValueOrDefault(variant.ProductId) : null;
    }
}

/// <param name="VariantKey">The canonical identity inside the product, built from unit codes during matching.</param>
/// <param name="OrderUnitId">Null when the rows were explicitly reviewed as having no order unit.</param>
public sealed record PlannedVariant(
    long ProductId,
    int? OrderUnitId,
    int? SpecificationUnitId,
    string? SpecificationValue,
    string? ModelCode,
    string VariantKey,
    string? SpecificationDescriptor = null)
{
    public string Label => VariantDescription.Of(SpecificationValue, null, ModelCode, null) is { Length: > 0 } text
        ? text
        : VariantKey;
}

/// <summary>One planned decision, with everything the executor needs and everything the operator should see.</summary>
public sealed record PlannedItem(
    BulkResolutionItem Request,
    BulkItemStatus Status,
    string DisplayValue,
    int AffectedRowCount,
    int SourceSpellings,
    long? TargetId,
    string? TargetLabel,
    bool CreatesRecord,
    bool CreatesAlias,
    string? Problem,
    string? ParentLabel,
    PlannedVariant? Variant)
{
    public BulkPreviewItem ToPreview() => new(
        Request.Kind, Request.SourceKey, DisplayValue, AffectedRowCount, Request.Action, Status,
        TargetLabel, CreatesRecord, CreatesAlias, Problem, ParentLabel, SourceSpellings);
}

public sealed record BulkResolutionPlan(long ImportBatchId, IReadOnlyList<PlannedItem> Items)
{
    /// <summary>Values that can be written as asked.</summary>
    public IReadOnlyList<PlannedItem> Ready => [.. Items.Where(item => item.Status == BulkItemStatus.Ready)];

    /// <summary>Values that stop the whole operation: nothing is written while one of them is present.</summary>
    public IReadOnlyList<PlannedItem> Blocking =>
        [.. Items.Where(item => item.Status is BulkItemStatus.Conflict or BulkItemStatus.DependencyBlocked or BulkItemStatus.NotFound)];

    public BulkPreviewResult ToResult()
    {
        var items = Items.Select(item => item.ToPreview()).ToList();

        return new BulkPreviewResult(
            new BulkPreviewSummary(
                items.Count,
                items.Count(item => item.Status == BulkItemStatus.Ready),
                items.Count(item => item.Status is BulkItemStatus.Conflict or BulkItemStatus.NotFound),
                items.Count(item => item.Status == BulkItemStatus.AlreadyResolved),
                items.Count(item => item.Status == BulkItemStatus.DependencyBlocked),
                items.Count(item => item is { Status: BulkItemStatus.Ready, CreatesRecord: true }),
                items.Count(item => item is { Status: BulkItemStatus.Ready, CreatesAlias: true }),
                items.Where(item => item.Status == BulkItemStatus.Ready).Sum(item => item.AffectedRowCount)),
            items);
    }
}
