using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BaxOrders.Application.Imports.Review;

/// <summary>
/// Applies one human decision about a distinct source value to a whole import batch.
/// </summary>
/// <remarks>
/// Every decision runs in one transaction: create or look up the target, optionally save an alias, store the
/// <see cref="ImportResolution"/>, re-match every staged row with that value, and refresh the batch summary.
/// The batch row is locked first, so two decisions on the same batch cannot interleave. Nothing is matched
/// automatically: the operator always chooses the target.
/// </remarks>
public sealed class ImportResolutionService(
    IBaxOrdersDbContext db,
    ImportRevalidator revalidator,
    ImportPreviewQueries previewQueries,
    ILocationCodeGenerator locationCodeGenerator,
    IProductCodeGenerator productCodeGenerator,
    IImportBatchLock batchLock,
    ILogger<ImportResolutionService> logger)
{
    public Task<ResolutionResult> ResolveLocationToExistingAsync(ResolveToExistingCommand command, CancellationToken cancellationToken) =>
        MapToExistingAsync(ImportResolutionKind.Location, command, cancellationToken);

    public Task<ResolutionResult> ResolveSupplierToExistingAsync(ResolveToExistingCommand command, CancellationToken cancellationToken) =>
        MapToExistingAsync(ImportResolutionKind.Supplier, command, cancellationToken);

    public Task<ResolutionResult> ResolveResponsiblePersonToExistingAsync(ResolveToExistingCommand command, CancellationToken cancellationToken) =>
        MapToExistingAsync(ImportResolutionKind.ResponsiblePerson, command, cancellationToken);

    public Task<ResolutionResult> ResolveUnitToExistingAsync(ImportResolutionKind kind, ResolveToExistingCommand command, CancellationToken cancellationToken)
    {
        EnsureUnitKind(kind);
        return MapToExistingAsync(kind, command, cancellationToken);
    }

    public Task<ResolutionResult> ResolveCategoryPathToExistingAsync(ResolveToExistingCommand command, CancellationToken cancellationToken) =>
        MapToExistingAsync(ImportResolutionKind.CategoryPath, command, cancellationToken);

    public Task<ResolutionResult> ResolveProductToExistingAsync(ResolveToExistingCommand command, CancellationToken cancellationToken) =>
        MapToExistingAsync(ImportResolutionKind.Product, command, cancellationToken);

    /// <summary>
    /// Points one variant value at an existing variant. The target must belong to the product the value was
    /// resolved to and must be ordered in the same unit; nothing is coerced and no closest variant is offered.
    /// </summary>
    public Task<ResolutionResult> ResolveProductVariantToExistingAsync(ResolveToExistingCommand command, CancellationToken cancellationToken)
    {
        // A variant is identified by the ids this import decided on, so it can never become a global alias.
        if (command.Scope == ResolutionScope.GlobalAlias)
        {
            throw new DomainException("A ProductVariant decision cannot be saved as a global alias; it applies to this import only.");
        }

        var key = Trimmed(command.SourceKey);
        return ExecuteAsync(ImportResolutionKind.ProductVariant, command.ImportBatchId, key, ResolutionScope.BatchOnly, ResolutionAction.MapExisting,
            token => LoadVariantTargetAsync(command.ImportBatchId, key, command.TargetId, token),
            cancellationToken);
    }

    public Task<ResolutionResult> CreateLocationAsync(CreateLocationCommand command, CancellationToken cancellationToken) =>
        ExecuteAsync(ImportResolutionKind.Location, command.ImportBatchId, command.SourceKey, command.Scope, ResolutionAction.CreateNew,
            async token =>
            {
                var name = Trimmed(command.Name);
                await EnsureNameIsFreeAsync(ImportResolutionKind.Location, name, token);

                // The code is generated, never typed: LOC-000001 from a SQL Server sequence.
                var location = new Location(await locationCodeGenerator.NextAsync(token), name);
                db.Locations.Add(location);
                await db.SaveChangesAsync(token);
                return new TargetInfo(location.Id, $"{location.Name} ({location.Code})", CatalogChanged: true);
            },
            cancellationToken);

    public Task<ResolutionResult> CreateSupplierAsync(CreateSupplierCommand command, CancellationToken cancellationToken) =>
        ExecuteAsync(ImportResolutionKind.Supplier, command.ImportBatchId, command.SourceKey, command.Scope, ResolutionAction.CreateNew,
            async token =>
            {
                var name = Trimmed(command.Name);
                await EnsureNameIsFreeAsync(ImportResolutionKind.Supplier, name, token);

                var code = string.IsNullOrWhiteSpace(command.Code) ? null : command.Code.Trim().ToUpperInvariant();
                if (code is not null && await db.Suppliers.AnyAsync(supplier => supplier.Code == code, token))
                {
                    throw new ConflictException($"Supplier code '{code}' is already used.");
                }

                var supplier = new Supplier(name, code);
                db.Suppliers.Add(supplier);
                await db.SaveChangesAsync(token);
                return new TargetInfo(supplier.Id, supplier.Name, CatalogChanged: true);
            },
            cancellationToken);

    public Task<ResolutionResult> CreateResponsiblePersonAsync(CreateResponsiblePersonCommand command, CancellationToken cancellationToken) =>
        ExecuteAsync(ImportResolutionKind.ResponsiblePerson, command.ImportBatchId, command.SourceKey, command.Scope, ResolutionAction.CreateNew,
            async token =>
            {
                var name = Trimmed(command.Name);
                await EnsureNameIsFreeAsync(ImportResolutionKind.ResponsiblePerson, name, token);

                // A business label only: never a user account, and never merged with a similar name.
                var person = new ResponsiblePerson(name);
                db.ResponsiblePeople.Add(person);
                await db.SaveChangesAsync(token);
                return new TargetInfo(person.Id, person.Name, CatalogChanged: true);
            },
            cancellationToken);

    public Task<ResolutionResult> CreateUnitAsync(CreateUnitCommand command, CancellationToken cancellationToken)
    {
        EnsureUnitKind(command.Kind);

        return ExecuteAsync(command.Kind, command.ImportBatchId, command.SourceKey, command.Scope, ResolutionAction.CreateNew,
            async token =>
            {
                var name = Trimmed(command.Name);
                var code = Trimmed(command.Code).ToUpperInvariant();
                var symbol = string.IsNullOrWhiteSpace(command.Symbol) ? name : command.Symbol.Trim();
                await EnsureUnitIsFreeAsync(code, name, symbol, token);

                // The unit type is the operator's decision; the importer never guesses what "kv.m" or "top" means.
                var unit = new UnitOfMeasure(code, name, symbol, command.UnitType);
                db.UnitsOfMeasure.Add(unit);
                await db.SaveChangesAsync(token);
                return new TargetInfo(unit.Id, $"{unit.Code} — {unit.Name}", CatalogChanged: true);
            },
            cancellationToken);
    }

    public Task<ResolutionResult> CreateCategoryPathAsync(CreateCategoryPathCommand command, CancellationToken cancellationToken) =>
        ExecuteAsync(ImportResolutionKind.CategoryPath, command.ImportBatchId, command.SourceKey, ResolutionScope.BatchOnly, ResolutionAction.CreateNew,
            token => CreateCategoryPathAsync(command.ImportBatchId, Trimmed(command.SourceKey), token),
            cancellationToken);

    public Task<ResolutionResult> CreateProductAsync(CreateProductCommand command, CancellationToken cancellationToken) =>
        ExecuteAsync(ImportResolutionKind.Product, command.ImportBatchId, command.SourceKey, command.Scope, ResolutionAction.CreateNew,
            async token =>
            {
                var name = Trimmed(command.Name);
                await EnsureProductNameIsFreeAsync(name, token);

                // The category is the operator's choice: an unresolved category path never becomes one by itself.
                Category? category = null;
                if (command.CategoryId is { } categoryId)
                {
                    category = await db.Categories.FirstOrDefaultAsync(item => item.Id == categoryId && item.IsActive, token)
                               ?? throw new NotFoundException($"Category #{categoryId} was not found or is inactive.");
                }

                // The code is generated, never typed: PRD-000001 from a SQL Server sequence.
                var product = new Product(await productCodeGenerator.NextAsync(token), name, category);
                db.Products.Add(product);
                await db.SaveChangesAsync(token);
                return new TargetInfo(product.Id, $"{product.Name} ({product.Code})", CatalogChanged: true);
            },
            cancellationToken);

    /// <summary>
    /// Creates the variant the staged rows describe. Its identity comes from the resolved product and the
    /// resolved units; only the specification text and the model code are taken from the sheet, verbatim.
    /// </summary>
    public Task<ResolutionResult> CreateProductVariantAsync(CreateProductVariantCommand command, CancellationToken cancellationToken) =>
        ExecuteAsync(ImportResolutionKind.ProductVariant, command.ImportBatchId, command.SourceKey, ResolutionScope.BatchOnly, ResolutionAction.CreateNew,
            token => CreateVariantAsync(command.ImportBatchId, Trimmed(command.SourceKey), token),
            cancellationToken);

    /// <summary>
    /// Records that a value in a unit column is not a unit of measure. No <see cref="UnitOfMeasure"/> is created
    /// and no alias is written: in "Vahid" the word stays with the specification as a descriptor, in "Ö/v" the
    /// rows become explicitly unitless. The workbook keeps the value it always had.
    /// </summary>
    public async Task<ResolutionResult> MarkNotAUnitAsync(MarkNotAUnitCommand command, CancellationToken cancellationToken)
    {
        EnsureUnitKind(command.Kind);

        var key = Trimmed(command.SourceKey);
        if (key.Length == 0)
        {
            throw new NotFoundException("A source value is required.");
        }

        var importBatchId = command.ImportBatchId;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await batchLock.AcquireAsync(importBatchId, cancellationToken);

        var batch = await db.ImportBatches.FirstOrDefaultAsync(b => b.Id == importBatchId, cancellationToken)
                    ?? throw new NotFoundException($"Import #{importBatchId} was not found.");
        batch.EnsureReviewable();

        var affectedRows = await RowsWithKey(importBatchId, command.Kind, key).CountAsync(cancellationToken);
        if (affectedRows == 0)
        {
            throw new NotFoundException($"No staged row of import #{importBatchId} has the {command.Kind} value '{key}'.");
        }

        var sourceKeyHash = ImportSourceKeys.Hash(key);
        var existing = await db.ImportResolutions.FirstOrDefaultAsync(
            resolution => resolution.ImportBatchId == importBatchId && resolution.Kind == command.Kind && resolution.SourceKeyHash == sourceKeyHash,
            cancellationToken);

        ImportResolution resolution;
        var outcome = ResolutionOutcome.Applied;

        if (existing is not null)
        {
            if (!existing.IsNotAUnit)
            {
                throw new ConflictException(
                    $"'{key}' is already resolved to unit #{existing.TargetId} in this import. Remove that decision before marking the value as not a unit.");
            }

            resolution = existing;
            outcome = ResolutionOutcome.AlreadyApplied;
        }
        else
        {
            // A value the catalog already reads as a unit is working as intended; overriding it would quietly
            // change what those rows measure.
            var units = await db.UnitsOfMeasure.AsNoTracking()
                .Where(unit => unit.IsActive)
                .Select(unit => new { unit.Code, unit.Name, unit.Symbol })
                .ToListAsync(cancellationToken);

            var known = units.Any(unit =>
                            TextNormalizer.Normalize(unit.Code) == key
                            || TextNormalizer.Normalize(unit.Name) == key
                            || TextNormalizer.Normalize(unit.Symbol) == key)
                        || await db.UnitOfMeasureAliases.AnyAsync(alias => alias.NormalizedAlias == key, cancellationToken);
            if (known)
            {
                throw new ConflictException(
                    $"'{key}' is a unit of measure in the catalog. Remove or rename that unit before calling the value something else.");
            }

            resolution = ImportResolution.NotAUnit(importBatchId, command.Kind, key);
            db.ImportResolutions.Add(resolution);
            await db.SaveChangesAsync(cancellationToken);
        }

        // Nothing in the catalog changed, so only the rows carrying this value are re-matched.
        var rows = await RowsToRevalidateAsync(importBatchId, command.Kind, key, catalogChanged: false, cancellationToken);
        await revalidator.RevalidateAsync(batch, rows, cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        logger.LogInformation(
            "Import {ImportBatchId}: {Kind} '{SourceKey}' marked as not a unit; {RowCount} rows re-matched, status {Status}",
            importBatchId, command.Kind, key, rows.Count, batch.Status);

        var preview = await previewQueries.GetPreviewAsync(importBatchId, cancellationToken)
                      ?? throw new NotFoundException($"Import #{importBatchId} was not found.");

        var label = command.Kind == ImportResolutionKind.SpecificationUnit
            ? $"vahid deyil — spesifikasiya təsviri '{SpecificationDescriptorNormalizer.Normalize(key)}'"
            : "vahid deyil — sətir vahidsizdir";

        return new ResolutionResult(outcome, resolution.Id, command.Kind, key, 0, label, AliasSaved: false, affectedRows, preview);
    }

    private Task<ResolutionResult> MapToExistingAsync(ImportResolutionKind kind, ResolveToExistingCommand command, CancellationToken cancellationToken) =>
        ExecuteAsync(kind, command.ImportBatchId, command.SourceKey, command.Scope, ResolutionAction.MapExisting,
            token => LoadTargetAsync(kind, command.TargetId, token),
            cancellationToken);

    private async Task<ResolutionResult> ExecuteAsync(
        ImportResolutionKind kind,
        long importBatchId,
        string sourceKey,
        ResolutionScope scope,
        ResolutionAction action,
        Func<CancellationToken, Task<TargetInfo>> resolveTarget,
        CancellationToken cancellationToken)
    {
        var key = Trimmed(sourceKey);
        if (key.Length == 0)
        {
            throw new NotFoundException("A source value is required.");
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        // Serialize the decisions of this batch so row statuses and counters stay consistent.
        await batchLock.AcquireAsync(importBatchId, cancellationToken);

        var batch = await db.ImportBatches.FirstOrDefaultAsync(b => b.Id == importBatchId, cancellationToken)
                    ?? throw new NotFoundException($"Import #{importBatchId} was not found.");
        batch.EnsureReviewable();

        var affectedRows = await RowsWithKey(importBatchId, kind, key).CountAsync(cancellationToken);
        if (affectedRows == 0)
        {
            throw new NotFoundException($"No staged row of import #{importBatchId} has the {kind} value '{key}'.");
        }

        var sourceKeyHash = ImportSourceKeys.Hash(key);
        var existing = await db.ImportResolutions.FirstOrDefaultAsync(
            resolution => resolution.ImportBatchId == importBatchId && resolution.Kind == kind && resolution.SourceKeyHash == sourceKeyHash,
            cancellationToken);

        TargetInfo target;
        ImportResolution resolution;
        var outcome = ResolutionOutcome.Applied;
        var aliasSaved = false;

        try
        {
            if (existing is not null)
            {
                if (action == ResolutionAction.CreateNew)
                {
                    throw new ConflictException($"'{key}' is already resolved in this import; creating a new record would contradict that decision.");
                }

                target = await resolveTarget(cancellationToken);
                if (existing.TargetId != target.Id)
                {
                    throw new ConflictException($"'{key}' is already resolved to another record (#{existing.TargetId}) in this import.");
                }

                resolution = existing;
                outcome = ResolutionOutcome.AlreadyApplied;

                if (scope == ResolutionScope.GlobalAlias && existing.Scope != ResolutionScope.GlobalAlias)
                {
                    aliasSaved = await EnsureAliasAsync(kind, key, target.Id, importBatchId, cancellationToken);
                    existing.PromoteToGlobalAlias();
                    outcome = ResolutionOutcome.Applied;
                }
            }
            else
            {
                target = await resolveTarget(cancellationToken);

                if (scope == ResolutionScope.GlobalAlias)
                {
                    aliasSaved = await EnsureAliasAsync(kind, key, target.Id, importBatchId, cancellationToken);
                }

                resolution = new ImportResolution(importBatchId, kind, key, scope, action, target.Id);
                db.ImportResolutions.Add(resolution);
            }

            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            logger.LogWarning(exception, "Import {ImportBatchId}: storing the {Kind} decision for '{SourceKey}' conflicted", importBatchId, kind, key);
            throw new ConflictException($"'{key}' was changed by someone else at the same time, or the new record already exists. Reload the review list and try again.");
        }

        var rows = await RowsToRevalidateAsync(importBatchId, kind, key, target.CatalogChanged || aliasSaved, cancellationToken);
        await revalidator.RevalidateAsync(batch, rows, cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        logger.LogInformation(
            "Import {ImportBatchId}: {Kind} '{SourceKey}' → #{TargetId} ({Action}, {Scope}, alias saved: {AliasSaved}); {RowCount} rows re-matched, status {Status}",
            importBatchId, kind, key, target.Id, action, scope, aliasSaved, rows.Count, batch.Status);

        var preview = await previewQueries.GetPreviewAsync(importBatchId, cancellationToken)
                      ?? throw new NotFoundException($"Import #{importBatchId} was not found.");

        return new ResolutionResult(outcome, resolution.Id, kind, key, target.Id, target.Label, aliasSaved, affectedRows, preview);
    }

    private async Task<TargetInfo> LoadTargetAsync(ImportResolutionKind kind, long targetId, CancellationToken cancellationToken)
    {
        switch (kind)
        {
            case ImportResolutionKind.Location:
                var location = await db.Locations.FirstOrDefaultAsync(l => l.Id == targetId && l.IsActive, cancellationToken)
                               ?? throw new NotFoundException($"Location #{targetId} was not found or is inactive.");
                return new TargetInfo(location.Id, $"{location.Name} ({location.Code})", CatalogChanged: false);

            case ImportResolutionKind.Supplier:
                var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Id == targetId && s.IsActive, cancellationToken)
                               ?? throw new NotFoundException($"Supplier #{targetId} was not found or is inactive.");
                return new TargetInfo(supplier.Id, supplier.Name, CatalogChanged: false);

            case ImportResolutionKind.ResponsiblePerson:
                var person = await db.ResponsiblePeople.FirstOrDefaultAsync(p => p.Id == targetId && p.IsActive, cancellationToken)
                             ?? throw new NotFoundException($"Responsible person #{targetId} was not found or is inactive.");
                return new TargetInfo(person.Id, person.Name, CatalogChanged: false);

            case ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit:
                var unit = await db.UnitsOfMeasure.FirstOrDefaultAsync(u => u.Id == targetId && u.IsActive, cancellationToken)
                           ?? throw new NotFoundException($"Unit #{targetId} was not found or is inactive.");
                return new TargetInfo(unit.Id, $"{unit.Code} — {unit.Name}", CatalogChanged: false);

            case ImportResolutionKind.CategoryPath:
                var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == targetId && c.IsActive, cancellationToken)
                               ?? throw new NotFoundException($"Category #{targetId} was not found or is inactive.");
                return new TargetInfo(category.Id, category.Name, CatalogChanged: false);

            case ImportResolutionKind.Product:
                var product = await db.Products.FirstOrDefaultAsync(item => item.Id == targetId && item.IsActive, cancellationToken)
                              ?? throw new NotFoundException($"Product #{targetId} was not found or is inactive.");
                return new TargetInfo(product.Id, $"{product.Name} ({product.Code})", CatalogChanged: false);

            default:
                throw new DomainException($"{kind} values cannot be resolved yet.");
        }
    }

    /// <summary>
    /// Checks that an existing variant may carry these rows: same product, same order unit. A mismatch is a
    /// conflict for the operator to settle, because 30 pieces and 30 packs are not the same quantity.
    /// </summary>
    private async Task<TargetInfo> LoadVariantTargetAsync(long importBatchId, string sourceKey, long targetId, CancellationToken cancellationToken)
    {
        var context = await VariantContextAsync(importBatchId, sourceKey, cancellationToken);

        var variant = await db.ProductVariants.AsNoTracking()
            .Where(candidate => candidate.Id == targetId && candidate.IsActive)
            .Select(candidate => new
            {
                candidate.Id,
                candidate.ProductId,
                candidate.OrderUnitId,
                candidate.SpecificationValue,
                candidate.ModelCode,
                SpecificationUnitCode = candidate.SpecificationUnit != null ? candidate.SpecificationUnit.Code : null,
                OrderUnitCode = candidate.OrderUnit != null ? candidate.OrderUnit.Code : null,
                ProductName = candidate.Product.Name,
                ProductCode = candidate.Product.Code,
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException($"Product variant #{targetId} was not found or is inactive.");

        if (variant.ProductId != context.ProductId)
        {
            throw new ConflictException(
                $"Variant #{targetId} belongs to product #{variant.ProductId}, but these rows were resolved to product #{context.ProductId}. Choose a variant of that product.");
        }

        if (variant.OrderUnitId != context.OrderUnitId)
        {
            var expected = context.OrderUnitId is { } expectedUnitId
                ? await UnitLabelAsync(expectedUnitId, cancellationToken)
                : VariantDescription.Unitless;
            throw new ConflictException(
                $"Variant #{targetId} is ordered in {variant.OrderUnitCode ?? VariantDescription.Unitless}, but these rows are ordered in {expected}. Quantities of different order units cannot be merged.");
        }

        return new TargetInfo(
            variant.Id,
            VariantLabel(variant.ProductName, variant.ProductCode, variant.SpecificationValue, variant.SpecificationUnitCode, variant.ModelCode, variant.OrderUnitCode),
            CatalogChanged: false);
    }

    private async Task<TargetInfo> CreateVariantAsync(long importBatchId, string sourceKey, CancellationToken cancellationToken)
    {
        var context = await VariantContextAsync(importBatchId, sourceKey, cancellationToken);
        var variantKey = ImportSourceKeys.ReadVariantKey(sourceKey);

        var duplicateId = await db.ProductVariants.AsNoTracking()
            .Where(existing => existing.ProductId == context.ProductId && existing.NormalizedVariantKey == variantKey)
            .Select(existing => (long?)existing.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (duplicateId is not null)
        {
            throw new ConflictException($"This variant already exists as #{duplicateId}. Map the value to it instead of creating a new one.");
        }

        var product = await db.Products.Include(item => item.Variants)
                          .FirstOrDefaultAsync(item => item.Id == context.ProductId && item.IsActive, cancellationToken)
                      ?? throw new NotFoundException($"Product #{context.ProductId} was not found or is inactive.");
        var orderUnit = context.OrderUnitId is { } orderUnitId
            ? await LoadUnitAsync(orderUnitId, cancellationToken)
            : null;
        var specificationUnit = context.SpecificationUnitId is { } specificationUnitId
            ? await LoadUnitAsync(specificationUnitId, cancellationToken)
            : null;

        // The specification and the model are the author's text; the identity around them is canonical.
        var variant = product.AddVariant(
            context.SpecificationValue, specificationUnit, context.ModelCode, orderUnit, context.SpecificationDescriptor);
        if (variant.NormalizedVariantKey != variantKey)
        {
            throw new ConflictException("The staged rows changed while the variant was being created. Reload the review list and try again.");
        }

        await db.SaveChangesAsync(cancellationToken);

        return new TargetInfo(
            variant.Id,
            VariantLabel(product.Name, product.Code, variant.SpecificationValue, specificationUnit?.Code, variant.ModelCode, orderUnit?.Code),
            CatalogChanged: true);
    }

    /// <summary>
    /// The decisions a variant value rests on, read from a staged row. Missing ones are reported instead of
    /// guessed: a variant built on raw text would be a different item hiding under the same name.
    /// </summary>
    private async Task<VariantContext> VariantContextAsync(long importBatchId, string sourceKey, CancellationToken cancellationToken)
    {
        var sample = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == importBatchId && row.VariantSourceKey == sourceKey)
            .Select(row => new
            {
                row.MatchedProductId,
                row.MatchedOrderUnitId,
                row.MatchedSpecificationUnitId,
                row.OriginalSpecificationValue,
                row.OriginalModelCode,
                row.SpecificationDescriptor,
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException($"No staged row of import #{importBatchId} has the variant '{sourceKey}'.");

        // A row only carries a variant key once matching accepted its units, so a missing order unit here means
        // the review explicitly said the line has none — never that the decision is still outstanding.
        if (sample.MatchedProductId is not { } productId)
        {
            throw new ConflictException("The product and its units must be resolved before this variant can be decided.");
        }

        if (!ImportSourceKeys.TryReadProduct(sourceKey, out var keyProductId) || keyProductId != productId)
        {
            throw new ConflictException("The staged rows now point at another product. Reload the review list and try again.");
        }

        return new VariantContext(
            productId,
            sample.MatchedOrderUnitId,
            sample.MatchedSpecificationUnitId,
            sample.OriginalSpecificationValue,
            sample.OriginalModelCode,
            sample.SpecificationDescriptor);
    }

    private async Task<UnitOfMeasure> LoadUnitAsync(int unitId, CancellationToken cancellationToken) =>
        await db.UnitsOfMeasure.FirstOrDefaultAsync(unit => unit.Id == unitId && unit.IsActive, cancellationToken)
        ?? throw new NotFoundException($"Unit #{unitId} was not found or is inactive.");

    private Task<string> UnitLabelAsync(int unitId, CancellationToken cancellationToken) =>
        db.UnitsOfMeasure.AsNoTracking().Where(unit => unit.Id == unitId)
            .Select(unit => $"{unit.Code} — {unit.Name}").SingleAsync(cancellationToken);

    private static string VariantLabel(
        string productName, string productCode, string? specification, string? specificationUnitCode, string? modelCode, string? orderUnitCode) =>
        $"{productName} ({productCode}){VariantDescription.Separator}"
        + VariantDescription.Of(specification, specificationUnitCode, modelCode, orderUnitCode ?? VariantDescription.Unitless);

    private async Task<TargetInfo> CreateCategoryPathAsync(long importBatchId, string sourceKey, CancellationToken cancellationToken)
    {
        if (ImportSourceKeys.HasMissingCategoryLevel(sourceKey))
        {
            throw new ConflictException("The category path has a blank level, so the hierarchy cannot be created. Map it to an existing category instead.");
        }

        var sample = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == importBatchId && row.NormalizedCategoryPath == sourceKey)
            .Select(row => new { row.OriginalMainCategory, row.OriginalMiddleCategory, row.OriginalSubCategory })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException($"No staged row of import #{importBatchId} has the category path '{sourceKey}'.");

        var normalizedLevels = ImportSourceKeys.CategoryLevels(sourceKey);
        var displayLevels = new[] { sample.OriginalMainCategory, sample.OriginalMiddleCategory, sample.OriginalSubCategory }
            .Select(level => level?.Trim())
            .Where(level => !string.IsNullOrEmpty(level))
            .ToList();

        Category? current = null;
        var names = new List<string>();

        for (var index = 0; index < normalizedLevels.Count; index++)
        {
            var displayName = index < displayLevels.Count ? displayLevels[index]! : normalizedLevels[index];
            var existingId = await FindCategoryIdAsync(current?.Id, normalizedLevels[index], cancellationToken);

            if (existingId is { } categoryId)
            {
                // Existing levels are reused; only missing ones are created.
                current = await db.Categories.FirstAsync(category => category.Id == categoryId, cancellationToken);
            }
            else
            {
                var created = current is null ? Category.CreateRoot(displayName) : current.AddChild(displayName);
                if (current is null)
                {
                    db.Categories.Add(created);
                }

                await db.SaveChangesAsync(cancellationToken);
                current = created;
            }

            names.Add(current.Name);
        }

        return new TargetInfo(current!.Id, string.Join(" → ", names), CatalogChanged: true);
    }

    /// <summary>
    /// Saves the incoming spelling as an alias, unless it already resolves to the target (then nothing is needed)
    /// or to another record (then it would be ambiguous and the decision is refused).
    /// </summary>
    private async Task<bool> EnsureAliasAsync(
        ImportResolutionKind kind, string sourceKey, long targetId, long importBatchId, CancellationToken cancellationToken)
    {
        if (kind is not (ImportResolutionKind.Location or ImportResolutionKind.Supplier or ImportResolutionKind.ResponsiblePerson
            or ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit or ImportResolutionKind.Product))
        {
            throw new DomainException($"A {kind} decision cannot be saved as a global alias; it applies to this import only.");
        }

        var aliasText = await DisplayValueAsync(importBatchId, kind, sourceKey, cancellationToken);

        switch (kind)
        {
            case ImportResolutionKind.Location:
            {
                var canonicalId = await db.Locations.Where(l => l.IsActive && l.NormalizedName == sourceKey)
                    .Select(l => (int?)l.Id).FirstOrDefaultAsync(cancellationToken);
                if (CanonicalBlocks(canonicalId, targetId, aliasText, "location", out var alreadyTarget))
                {
                    return false;
                }

                var aliasOwnerId = await db.LocationAliases.Where(a => a.NormalizedAlias == sourceKey)
                    .Select(a => (int?)a.LocationId).FirstOrDefaultAsync(cancellationToken);
                if (AliasBlocks(aliasOwnerId, targetId, aliasText, "location"))
                {
                    return false;
                }

                var location = await db.Locations.FirstAsync(l => l.Id == targetId, cancellationToken);
                db.LocationAliases.Add(new LocationAlias(location, aliasText));
                return !alreadyTarget;
            }

            case ImportResolutionKind.Supplier:
            {
                var canonicalId = await db.Suppliers.Where(s => s.IsActive && s.NormalizedName == sourceKey)
                    .Select(s => (int?)s.Id).FirstOrDefaultAsync(cancellationToken);
                if (CanonicalBlocks(canonicalId, targetId, aliasText, "supplier", out _))
                {
                    return false;
                }

                var aliasOwnerId = await db.SupplierAliases.Where(a => a.NormalizedAlias == sourceKey)
                    .Select(a => (int?)a.SupplierId).FirstOrDefaultAsync(cancellationToken);
                if (AliasBlocks(aliasOwnerId, targetId, aliasText, "supplier"))
                {
                    return false;
                }

                var supplier = await db.Suppliers.FirstAsync(s => s.Id == targetId, cancellationToken);
                db.SupplierAliases.Add(new SupplierAlias(supplier, aliasText));
                return true;
            }

            case ImportResolutionKind.ResponsiblePerson:
            {
                var canonicalId = await db.ResponsiblePeople.Where(p => p.IsActive && p.NormalizedName == sourceKey)
                    .Select(p => (int?)p.Id).FirstOrDefaultAsync(cancellationToken);
                if (CanonicalBlocks(canonicalId, targetId, aliasText, "responsible person", out _))
                {
                    return false;
                }

                var aliasOwnerId = await db.ResponsiblePersonAliases.Where(a => a.NormalizedAlias == sourceKey)
                    .Select(a => (int?)a.ResponsiblePersonId).FirstOrDefaultAsync(cancellationToken);
                if (AliasBlocks(aliasOwnerId, targetId, aliasText, "responsible person"))
                {
                    return false;
                }

                var person = await db.ResponsiblePeople.FirstAsync(p => p.Id == targetId, cancellationToken);
                db.ResponsiblePersonAliases.Add(new ResponsiblePersonAlias(person, aliasText));
                return true;
            }

            case ImportResolutionKind.Product:
            {
                var canonicalId = await db.Products.Where(p => p.IsActive && p.NormalizedName == sourceKey)
                    .Select(p => (long?)p.Id).FirstOrDefaultAsync(cancellationToken);
                if (CanonicalBlocks(canonicalId, targetId, aliasText, "product", out var alreadyTarget))
                {
                    return false;
                }

                var aliasOwnerId = await db.ProductAliases.Where(a => a.NormalizedAlias == sourceKey)
                    .Select(a => (long?)a.ProductId).FirstOrDefaultAsync(cancellationToken);
                if (AliasBlocks(aliasOwnerId, targetId, aliasText, "product"))
                {
                    return false;
                }

                // Added through the product so its own duplicate check runs as well.
                var product = await db.Products.Include(p => p.Aliases).FirstAsync(p => p.Id == targetId, cancellationToken);
                product.AddAlias(aliasText);
                return !alreadyTarget;
            }

            default:
            {
                // Units are known by code, name, symbol and alias; all four must stay unambiguous.
                var units = await db.UnitsOfMeasure.AsNoTracking().Where(u => u.IsActive)
                    .Select(u => new { u.Id, u.Code, u.Name, u.Symbol }).ToListAsync(cancellationToken);
                var owner = units.FirstOrDefault(u => Normalized(u.Code) == sourceKey || Normalized(u.Name) == sourceKey || Normalized(u.Symbol) == sourceKey);
                if (CanonicalBlocks(owner?.Id, targetId, aliasText, "unit", out _))
                {
                    return false;
                }

                var aliasOwnerId = await db.UnitOfMeasureAliases.Where(a => a.NormalizedAlias == sourceKey)
                    .Select(a => (int?)a.UnitOfMeasureId).FirstOrDefaultAsync(cancellationToken);
                if (AliasBlocks(aliasOwnerId, targetId, aliasText, "unit"))
                {
                    return false;
                }

                var unit = await db.UnitsOfMeasure.FirstAsync(u => u.Id == targetId, cancellationToken);
                db.UnitOfMeasureAliases.Add(new UnitOfMeasureAlias(unit, aliasText));
                return true;
            }
        }
    }

    /// <summary>True when no alias is needed; throws when the value is the canonical name of another record.</summary>
    private static bool CanonicalBlocks(long? canonicalId, long targetId, string aliasText, string label, out bool alreadyTarget)
    {
        alreadyTarget = canonicalId == targetId;
        if (canonicalId is null)
        {
            return false;
        }

        if (alreadyTarget)
        {
            return true;
        }

        throw new ConflictException($"'{aliasText}' is already the name of {label} #{canonicalId}; it cannot become an alias of another {label}.");
    }

    private static bool AliasBlocks(long? aliasOwnerId, long targetId, string aliasText, string label)
    {
        if (aliasOwnerId is null)
        {
            return false;
        }

        if (aliasOwnerId == targetId)
        {
            return true;
        }

        throw new ConflictException($"'{aliasText}' is already an alias of {label} #{aliasOwnerId}.");
    }

    private async Task EnsureNameIsFreeAsync(ImportResolutionKind kind, string name, CancellationToken cancellationToken)
    {
        var normalized = TextNormalizer.Normalize(name);
        if (normalized.Length == 0)
        {
            return;
        }

        var (canonicalId, aliasOwnerId, label) = kind switch
        {
            ImportResolutionKind.Location => (
                await db.Locations.Where(l => l.NormalizedName == normalized).Select(l => (int?)l.Id).FirstOrDefaultAsync(cancellationToken),
                await db.LocationAliases.Where(a => a.NormalizedAlias == normalized).Select(a => (int?)a.LocationId).FirstOrDefaultAsync(cancellationToken),
                "location"),
            ImportResolutionKind.Supplier => (
                await db.Suppliers.Where(s => s.NormalizedName == normalized).Select(s => (int?)s.Id).FirstOrDefaultAsync(cancellationToken),
                await db.SupplierAliases.Where(a => a.NormalizedAlias == normalized).Select(a => (int?)a.SupplierId).FirstOrDefaultAsync(cancellationToken),
                "supplier"),
            _ => (
                await db.ResponsiblePeople.Where(p => p.NormalizedName == normalized).Select(p => (int?)p.Id).FirstOrDefaultAsync(cancellationToken),
                await db.ResponsiblePersonAliases.Where(a => a.NormalizedAlias == normalized).Select(a => (int?)a.ResponsiblePersonId).FirstOrDefaultAsync(cancellationToken),
                "responsible person"),
        };

        if (canonicalId is not null)
        {
            throw new ConflictException($"'{name}' is already the name of {label} #{canonicalId}. Map the value to it instead of creating a new record.");
        }

        if (aliasOwnerId is not null)
        {
            throw new ConflictException($"'{name}' is already an alias of {label} #{aliasOwnerId}. Map the value to it instead of creating a new record.");
        }
    }

    private async Task EnsureProductNameIsFreeAsync(string name, CancellationToken cancellationToken)
    {
        var normalized = TextNormalizer.Normalize(name);
        if (normalized.Length == 0)
        {
            return;
        }

        var canonicalId = await db.Products.Where(product => product.NormalizedName == normalized)
            .Select(product => (long?)product.Id).FirstOrDefaultAsync(cancellationToken);
        if (canonicalId is not null)
        {
            throw new ConflictException($"'{name}' is already the name of product #{canonicalId}. Map the value to it instead of creating a new record.");
        }

        var aliasOwnerId = await db.ProductAliases.Where(alias => alias.NormalizedAlias == normalized)
            .Select(alias => (long?)alias.ProductId).FirstOrDefaultAsync(cancellationToken);
        if (aliasOwnerId is not null)
        {
            throw new ConflictException($"'{name}' is already an alias of product #{aliasOwnerId}. Map the value to it instead of creating a new record.");
        }
    }

    private async Task EnsureUnitIsFreeAsync(string code, string name, string symbol, CancellationToken cancellationToken)
    {
        var units = await db.UnitsOfMeasure.AsNoTracking()
            .Select(unit => new { unit.Id, unit.Code, unit.Name, unit.Symbol })
            .ToListAsync(cancellationToken);

        if (units.FirstOrDefault(unit => string.Equals(unit.Code, code, StringComparison.OrdinalIgnoreCase)) is { } sameCode)
        {
            throw new ConflictException($"Unit code '{code}' is already used by unit #{sameCode.Id}.");
        }

        // A new name or symbol that already identifies another unit would make future matching ambiguous.
        foreach (var value in new[] { name, symbol }.Distinct(StringComparer.Ordinal))
        {
            var normalized = TextNormalizer.Normalize(value);
            if (normalized.Length == 0)
            {
                continue;
            }

            if (units.FirstOrDefault(unit => Normalized(unit.Code) == normalized || Normalized(unit.Name) == normalized || Normalized(unit.Symbol) == normalized) is { } clash)
            {
                throw new ConflictException($"'{value}' already identifies unit #{clash.Id} ({clash.Code}). Map the value to it instead of creating a new unit.");
            }

            var aliasOwnerId = await db.UnitOfMeasureAliases.Where(alias => alias.NormalizedAlias == normalized)
                .Select(alias => (int?)alias.UnitOfMeasureId).FirstOrDefaultAsync(cancellationToken);
            if (aliasOwnerId is not null)
            {
                throw new ConflictException($"'{value}' is already an alias of unit #{aliasOwnerId}.");
            }
        }
    }

    private Task<int?> FindCategoryIdAsync(int? parentId, string normalizedName, CancellationToken cancellationToken)
    {
        var categories = db.Categories.Where(category => category.IsActive && category.NormalizedName == normalizedName);
        categories = parentId is null
            ? categories.Where(category => category.ParentId == null)
            : categories.Where(category => category.ParentId == parentId);

        return categories.Select(category => (int?)category.Id).FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<string> DisplayValueAsync(long importBatchId, ImportResolutionKind kind, string sourceKey, CancellationToken cancellationToken)
    {
        var (keyProperty, _, originalProperty, _, _) = ImportReviewQueries.Columns(kind);
        if (originalProperty is null)
        {
            return sourceKey;
        }

        var original = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == importBatchId && EF.Property<string>(row, keyProperty) == sourceKey)
            .Select(row => EF.Property<string?>(row, originalProperty))
            .FirstOrDefaultAsync(cancellationToken);

        return string.IsNullOrWhiteSpace(original) ? sourceKey : original.Trim();
    }

    private IQueryable<ImportRow> RowsWithKey(long importBatchId, ImportResolutionKind kind, string sourceKey)
    {
        var keyProperty = ImportReviewQueries.Columns(kind).KeyProperty;
        return db.ImportRows.Where(row => row.ImportBatchId == importBatchId && EF.Property<string>(row, keyProperty) == sourceKey);
    }

    /// <summary>
    /// Every row with this source value, plus — when the catalog itself changed (a new record or a new alias) —
    /// the rows still unresolved for the kinds that use the same catalog.
    /// </summary>
    private async Task<IReadOnlyCollection<ImportRow>> RowsToRevalidateAsync(
        long importBatchId, ImportResolutionKind kind, string sourceKey, bool catalogChanged, CancellationToken cancellationToken)
    {
        var rows = await RowsWithKey(importBatchId, kind, sourceKey)
            .Include(row => row.Issues)
            .Include(row => row.Corrections)
            .ToListAsync(cancellationToken);

        if (!catalogChanged)
        {
            return rows;
        }

        var byId = rows.ToDictionary(row => row.Id);
        foreach (var relatedKind in RelatedKinds(kind))
        {
            var columns = ImportReviewQueries.Columns(relatedKind);
            IQueryable<ImportRow> candidates = db.ImportRows
                .Include(row => row.Issues)
                .Include(row => row.Corrections)
                .Where(row => row.ImportBatchId == importBatchId && EF.Property<string?>(row, columns.KeyProperty) != null);

            candidates = columns.MatchedIsLong
                ? candidates.Where(row => EF.Property<long?>(row, columns.MatchedProperty) == null)
                : candidates.Where(row => EF.Property<int?>(row, columns.MatchedProperty) == null);

            var unresolved = await candidates.ToListAsync(cancellationToken);

            foreach (var row in unresolved)
            {
                byId.TryAdd(row.Id, row);
            }
        }

        return byId.Values;
    }

    /// <summary>Kinds that read the same catalog, so a new record or alias can resolve them too.</summary>
    private static IReadOnlyList<ImportResolutionKind> RelatedKinds(ImportResolutionKind kind) => kind switch
    {
        ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit =>
            [ImportResolutionKind.OrderUnit, ImportResolutionKind.SpecificationUnit],
        _ => [kind],
    };

    private static void EnsureUnitKind(ImportResolutionKind kind)
    {
        if (kind is not (ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit))
        {
            throw new DomainException($"{kind} is not a unit column.");
        }
    }

    private static string Normalized(string value) => TextNormalizer.Normalize(value);

    private static string Trimmed(string? value) => (value ?? string.Empty).Trim();

    private sealed record TargetInfo(long Id, string Label, bool CatalogChanged);

    /// <param name="SpecificationValue">The author's text, kept verbatim; it is never reinterpreted as a number.</param>
    /// <param name="OrderUnitId">Null when the rows were explicitly reviewed as having no order unit.</param>
    private sealed record VariantContext(
        long ProductId,
        int? OrderUnitId,
        int? SpecificationUnitId,
        string? SpecificationValue,
        string? ModelCode,
        string? SpecificationDescriptor);
}
