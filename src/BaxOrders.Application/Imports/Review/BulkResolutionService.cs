using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BaxOrders.Application.Imports.Review;

/// <summary>
/// Applies many reviewed decisions of one import batch as a single operation: select, preview, confirm, apply.
/// </summary>
/// <remarks>
/// This is the batched path of the same workflow as <see cref="ImportResolutionService"/>, not a second one: the
/// same <see cref="ImportResolution"/> records, the same catalog entities, the same alias rules and the same
/// re-matching. What it adds is doing them once for a set instead of once per value — one batch lock, one
/// transaction, one re-match and one summary refresh — and refusing the whole set if any value is in conflict.
/// <para>
/// A set that would save any product's alternative name needs <see cref="ProductMatchAuthority"/> (13.2), and is
/// refused as a whole without it — previewed or applied — before anything is read.
/// </para>
/// </remarks>
public sealed class BulkResolutionService(
    IBaxOrdersDbContext db,
    BulkResolutionPlanner planner,
    ImportRevalidator revalidator,
    ImportPreviewQueries previewQueries,
    ILocationCodeGenerator locationCodeGenerator,
    IProductCodeGenerator productCodeGenerator,
    IImportBatchLock batchLock,
    ICurrentUserContext currentUser,
    ILogger<BulkResolutionService> logger)
{
    /// <summary>What the operation would do. Reads only: no record, alias or decision is written.</summary>
    public async Task<BulkPreviewResult> PreviewAsync(long importBatchId, BulkResolutionRequest request, CancellationToken cancellationToken)
    {
        EnsureMayNameProducts(request);
        return (await planner.PlanAsync(importBatchId, request, cancellationToken)).ToResult();
    }

    /// <summary>
    /// Applies the selected decisions, all of them or none. The plan is built again under the batch lock, so a
    /// preview the operator has been looking at for a while can never decide what is written.
    /// </summary>
    public async Task<BulkApplyResult> ApplyAsync(long importBatchId, BulkResolutionRequest request, CancellationToken cancellationToken)
    {
        planner.Validate(request);
        EnsureMayNameProducts(request);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        // Serialize the decisions of this batch so row statuses and counters stay consistent.
        await batchLock.AcquireAsync(importBatchId, cancellationToken);

        var batch = await db.ImportBatches.FirstOrDefaultAsync(item => item.Id == importBatchId, cancellationToken)
                    ?? throw new NotFoundException($"Import #{importBatchId} was not found.");
        batch.EnsureReviewable();

        var plan = await planner.PlanAsync(importBatchId, request, cancellationToken);
        if (plan.Blocking.Count > 0)
        {
            throw new BulkResolutionConflictException(
                $"{plan.Blocking.Count} of {plan.Items.Count} values cannot be applied, so nothing was changed.",
                [.. plan.Blocking.Select(item => item.ToPreview())]);
        }

        var ready = plan.Ready;
        var created = new Dictionary<string, long>(StringComparer.Ordinal);
        int createdRecords;
        int aliasesSaved;

        try
        {
            createdRecords = await CreateRecordsAsync(ready, created, cancellationToken);
            aliasesSaved = await SaveAliasesAsync(ready, cancellationToken);
            AddResolutions(importBatchId, ready, created);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            logger.LogWarning(exception, "Import {ImportBatchId}: a bulk decision of {Count} values conflicted", importBatchId, ready.Count);
            throw new ConflictException(
                "Some of these values were decided by someone else at the same time, or a record already exists. Nothing was changed; reload the review list and try again.");
        }

        // One re-match and one summary refresh for the whole set, instead of one per value.
        var rows = await AffectedRowsAsync(importBatchId, ready, cancellationToken);
        await revalidator.RevalidateAsync(batch, rows, cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        logger.LogInformation(
            "Import {ImportBatchId}: bulk decision applied — {Applied} values ({Created} new records, {Aliases} aliases), "
            + "{Skipped} already resolved, {Rows} rows re-matched, status {Status}",
            importBatchId, ready.Count, createdRecords, aliasesSaved,
            plan.Items.Count(item => item.Status == BulkItemStatus.AlreadyResolved), rows.Count, batch.Status);

        var preview = await previewQueries.GetPreviewAsync(importBatchId, cancellationToken)
                      ?? throw new NotFoundException($"Import #{importBatchId} was not found.");

        return new BulkApplyResult(
            ready.Count,
            plan.Items.Count(item => item.Status == BulkItemStatus.AlreadyResolved),
            createdRecords,
            aliasesSaved,
            rows.Count,
            preview,
            [.. plan.Items.Select(item => item.ToPreview())]);
    }

    /// <summary>
    /// Creates the canonical records the operator confirmed. Names come from the staged rows as the review list
    /// shows them; codes come from the same sequences the single-value flow uses, never from the client.
    /// </summary>
    private async Task<int> CreateRecordsAsync(
        IReadOnlyList<PlannedItem> ready, Dictionary<string, long> created, CancellationToken cancellationToken)
    {
        var creations = ready.Where(item => item.CreatesRecord).ToList();
        if (creations.Count == 0)
        {
            return 0;
        }

        var pending = new List<(PlannedItem Item, Func<long> Id)>();

        foreach (var item in creations.Where(item => item.Request.Kind == ImportResolutionKind.Location))
        {
            var location = new Location(await locationCodeGenerator.NextAsync(cancellationToken), item.DisplayValue);
            db.Locations.Add(location);
            pending.Add((item, () => location.Id));
        }

        foreach (var item in creations.Where(item => item.Request.Kind == ImportResolutionKind.Supplier))
        {
            var supplier = new Supplier(item.DisplayValue);
            db.Suppliers.Add(supplier);
            pending.Add((item, () => supplier.Id));
        }

        foreach (var item in creations.Where(item => item.Request.Kind == ImportResolutionKind.ResponsiblePerson))
        {
            // A business label only: no user account, and similar names are never merged.
            var person = new ResponsiblePerson(item.DisplayValue);
            db.ResponsiblePeople.Add(person);
            pending.Add((item, () => person.Id));
        }

        foreach (var item in creations.Where(item => item.Request.Kind == ImportResolutionKind.Product))
        {
            var product = new Product(await productCodeGenerator.NextAsync(cancellationToken), item.DisplayValue);
            db.Products.Add(product);
            pending.Add((item, () => product.Id));
        }

        await db.SaveChangesAsync(cancellationToken);

        pending.AddRange(await CreateVariantsAsync(creations, cancellationToken));

        foreach (var (item, id) in pending)
        {
            created[Key(item)] = id();
        }

        return creations.Count;
    }

    /// <summary>
    /// Creates the variants the staged rows describe. Identity comes from the product and units already decided;
    /// only the specification text and the model code are copied from the sheet, verbatim.
    /// </summary>
    private async Task<List<(PlannedItem Item, Func<long> Id)>> CreateVariantsAsync(
        IReadOnlyList<PlannedItem> creations, CancellationToken cancellationToken)
    {
        var variantItems = creations.Where(item => item.Request.Kind == ImportResolutionKind.ProductVariant).ToList();
        var pending = new List<(PlannedItem Item, Func<long> Id)>();
        if (variantItems.Count == 0)
        {
            return pending;
        }

        var productIds = variantItems.Select(item => item.Variant!.ProductId).Distinct().ToList();
        var products = await db.Products
            .Include(product => product.Variants)
            .Where(product => productIds.Contains(product.Id) && product.IsActive)
            .ToDictionaryAsync(product => product.Id, cancellationToken);

        var unitIds = variantItems
            .SelectMany(item => new[] { item.Variant!.OrderUnitId, item.Variant!.SpecificationUnitId })
            .OfType<int>()
            .Distinct()
            .ToList();
        var units = await db.UnitsOfMeasure
            .Where(unit => unitIds.Contains(unit.Id) && unit.IsActive)
            .ToDictionaryAsync(unit => unit.Id, cancellationToken);

        foreach (var item in variantItems)
        {
            var context = item.Variant!;
            var product = products.GetValueOrDefault(context.ProductId)
                          ?? throw new ConflictException($"Product #{context.ProductId} was not found or is inactive.");
            var orderUnit = context.OrderUnitId is { } orderUnitId
                ? units.GetValueOrDefault(orderUnitId)
                  ?? throw new ConflictException($"Unit #{orderUnitId} was not found or is inactive.")
                : null;
            var specificationUnit = context.SpecificationUnitId is { } specificationUnitId
                ? units.GetValueOrDefault(specificationUnitId)
                  ?? throw new ConflictException($"Unit #{specificationUnitId} was not found or is inactive.")
                : null;

            var variant = product.AddVariant(
                context.SpecificationValue, specificationUnit, context.ModelCode, orderUnit, context.SpecificationDescriptor);
            if (variant.NormalizedVariantKey != context.VariantKey)
            {
                throw new ConflictException("The staged rows changed while the variants were being created. Reload the review list and try again.");
            }

            pending.Add((item, () => variant.Id));
        }

        await db.SaveChangesAsync(cancellationToken);
        return pending;
    }

    /// <summary>Saves the spellings the operator marked as global aliases. The planner checked each one is free.</summary>
    private async Task<int> SaveAliasesAsync(IReadOnlyList<PlannedItem> ready, CancellationToken cancellationToken)
    {
        var aliasItems = ready.Where(item => item.CreatesAlias).ToList();
        if (aliasItems.Count == 0)
        {
            return 0;
        }

        foreach (var byKind in aliasItems.GroupBy(item => item.Request.Kind))
        {
            var ids = byKind.Select(item => item.TargetId!.Value).Distinct().ToList();
            var intIds = ids.Select(id => (int)id).ToList();

            switch (byKind.Key)
            {
                case ImportResolutionKind.Location:
                {
                    var locations = await db.Locations.Where(location => intIds.Contains(location.Id)).ToDictionaryAsync(location => location.Id, cancellationToken);
                    foreach (var item in byKind)
                    {
                        db.LocationAliases.Add(new LocationAlias(locations[(int)item.TargetId!.Value], item.DisplayValue));
                    }

                    break;
                }

                case ImportResolutionKind.Supplier:
                {
                    var suppliers = await db.Suppliers.Where(supplier => intIds.Contains(supplier.Id)).ToDictionaryAsync(supplier => supplier.Id, cancellationToken);
                    foreach (var item in byKind)
                    {
                        db.SupplierAliases.Add(new SupplierAlias(suppliers[(int)item.TargetId!.Value], item.DisplayValue));
                    }

                    break;
                }

                case ImportResolutionKind.ResponsiblePerson:
                {
                    var people = await db.ResponsiblePeople.Where(person => intIds.Contains(person.Id)).ToDictionaryAsync(person => person.Id, cancellationToken);
                    foreach (var item in byKind)
                    {
                        db.ResponsiblePersonAliases.Add(new ResponsiblePersonAlias(people[(int)item.TargetId!.Value], item.DisplayValue));
                    }

                    break;
                }

                case ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit:
                {
                    var units = await db.UnitsOfMeasure.Where(unit => intIds.Contains(unit.Id)).ToDictionaryAsync(unit => unit.Id, cancellationToken);
                    foreach (var item in byKind)
                    {
                        db.UnitOfMeasureAliases.Add(new UnitOfMeasureAlias(units[(int)item.TargetId!.Value], item.DisplayValue));
                    }

                    break;
                }

                case ImportResolutionKind.Product:
                {
                    // Added through the product so its own duplicate check runs as well.
                    var products = await db.Products.Include(product => product.Aliases)
                        .Where(product => ids.Contains(product.Id))
                        .ToDictionaryAsync(product => product.Id, cancellationToken);
                    foreach (var item in byKind)
                    {
                        products[item.TargetId!.Value].AddAlias(item.DisplayValue);
                    }

                    break;
                }

                default:
                    throw new DomainException($"A {byKind.Key} decision cannot be saved as a global alias.");
            }
        }

        return aliasItems.Count;
    }

    private void AddResolutions(long importBatchId, IReadOnlyList<PlannedItem> ready, IReadOnlyDictionary<string, long> created)
    {
        foreach (var item in ready)
        {
            var targetId = item.CreatesRecord ? created[Key(item)] : item.TargetId!.Value;
            var action = item.CreatesRecord ? ResolutionAction.CreateNew : ResolutionAction.MapExisting;

            db.ImportResolutions.Add(new ImportResolution(
                importBatchId, item.Request.Kind, item.Request.SourceKey, item.Request.Scope, action, targetId));
        }
    }

    /// <summary>
    /// Every staged row the decisions touch, in one query per kind. When the catalog itself changed, rows that are
    /// still unresolved for the same catalog are re-matched too, exactly as a single decision does.
    /// </summary>
    private async Task<IReadOnlyCollection<ImportRow>> AffectedRowsAsync(
        long importBatchId, IReadOnlyList<PlannedItem> ready, CancellationToken cancellationToken)
    {
        var rows = new Dictionary<long, ImportRow>();

        foreach (var byKind in ready.GroupBy(item => item.Request.Kind))
        {
            var keyProperty = ImportReviewQueries.Columns(byKind.Key).KeyProperty;
            var keys = byKind.Select(item => item.Request.SourceKey).Distinct(StringComparer.Ordinal).ToList();

            var withKey = await db.ImportRows
                .Include(row => row.Issues)
                .Include(row => row.Corrections)
                .Where(row => row.ImportBatchId == importBatchId && keys.Contains(EF.Property<string>(row, keyProperty)))
                .ToListAsync(cancellationToken);

            foreach (var row in withKey)
            {
                rows.TryAdd(row.Id, row);
            }
        }

        var changedKinds = ready
            .Where(item => item.CreatesRecord || item.CreatesAlias)
            .SelectMany(item => RelatedKinds(item.Request.Kind))
            .Distinct()
            .ToList();

        foreach (var kind in changedKinds)
        {
            var columns = ImportReviewQueries.Columns(kind);
            IQueryable<ImportRow> unresolved = db.ImportRows
                .Include(row => row.Issues)
                .Include(row => row.Corrections)
                .Where(row => row.ImportBatchId == importBatchId && EF.Property<string?>(row, columns.KeyProperty) != null);

            unresolved = columns.MatchedIsLong
                ? unresolved.Where(row => EF.Property<long?>(row, columns.MatchedProperty) == null)
                : unresolved.Where(row => EF.Property<int?>(row, columns.MatchedProperty) == null);

            foreach (var row in await unresolved.ToListAsync(cancellationToken))
            {
                rows.TryAdd(row.Id, row);
            }
        }

        return rows.Values;
    }

    /// <summary>Kinds that read the same catalog, so a new record or alias can settle them too.</summary>
    private static IReadOnlyList<ImportResolutionKind> RelatedKinds(ImportResolutionKind kind) => kind switch
    {
        ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit =>
            [ImportResolutionKind.OrderUnit, ImportResolutionKind.SpecificationUnit],
        _ => [kind],
    };

    private static string Key(PlannedItem item) => $"{item.Request.Kind}|{item.Request.SourceKey}";

    /// <summary>13.2, for the whole set: one product alias the caller may not save refuses all of it.</summary>
    private void EnsureMayNameProducts(BulkResolutionRequest? request)
    {
        foreach (var item in request?.Items ?? [])
        {
            ImportResolutionService.EnsureMayNameProducts(currentUser, item.Kind, item.Scope);
        }
    }
}
