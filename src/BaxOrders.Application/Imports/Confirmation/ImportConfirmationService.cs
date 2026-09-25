using System.Diagnostics;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BaxOrders.Application.Imports.Confirmation;

/// <summary>
/// Turns an approved staging batch into permanent order requests — the one step that writes company orders.
/// </summary>
/// <remarks>
/// Everything happens in a single transaction under the batch lock: either the whole approved plan becomes
/// orders and the batch is <see cref="ImportStatus.Imported"/>, or nothing is written and the batch stays
/// <see cref="ImportStatus.ReadyToImport"/>. There is no half-imported state.
/// <para>
/// The client never sends business values. It sends decisions for the groups that need one; the products,
/// variants, quantities, prices, suppliers, locations and periods all come from the staged rows as they are
/// at the moment of confirmation. A preview the operator read a minute ago cannot decide what is written:
/// the plan is built again here, and anything that no longer matches is a conflict, not an assumption.
/// </para>
/// </remarks>
public sealed class ImportConfirmationService(
    IBaxOrdersDbContext db,
    ImportConfirmationPlanner planner,
    IImportBatchLock batchLock,
    TimeProvider timeProvider,
    ILogger<ImportConfirmationService> logger)
{
    public async Task<ImportConfirmationResult> ConfirmAsync(
        long importBatchId, ImportConfirmationCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        var stopwatch = Stopwatch.StartNew();
        var decisions = Validate(command);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await batchLock.AcquireAsync(importBatchId, cancellationToken);

        // Built again under the lock: the preview is a reading aid, never the source of truth.
        var plan = await planner.BuildAsync(importBatchId, cancellationToken)
                   ?? throw new NotFoundException($"Import #{importBatchId} was not found.");

        // A retry, a double click or a second operator finds the work already done and changes nothing.
        if (plan.Existing is { } already)
        {
            EnsureSameDecisions(already, decisions);
            await transaction.CommitAsync(cancellationToken);
            stopwatch.Stop();

            logger.LogInformation("Import {ImportBatchId}: already imported; confirmation returned the existing result", importBatchId);
            return ImportConfirmationPlanner.ResultOf(already, plan.Batch, stopwatch.ElapsedMilliseconds);
        }

        if (plan.Batch.Status != ImportStatus.ReadyToImport)
        {
            throw new ConflictException(
                $"Import #{importBatchId} is {plan.Batch.Status}; only a {ImportStatus.ReadyToImport} import can be confirmed.");
        }

        var preview = ImportConfirmationPlanner.Describe(plan, decisions);
        EnsureMatchesWhatTheOperatorSaw(command, preview);

        if (!preview.CanConfirm)
        {
            var undecided = preview.Groups
                .Where(group => group.RequiredDecision is not null)
                .Where(group => !decisions.ContainsKey((group.LocationId, group.RequestPeriod)))
                .Select(group => $"{group.LocationName} {group.RequestPeriod:yyyy-MM}")
                .ToList();

            throw new ConflictException(undecided.Count > 0
                ? $"{undecided.Count} group(s) already have an order request and need an explicit decision: {string.Join(", ", undecided)}."
                : $"Import #{importBatchId} cannot be confirmed in its current state.");
        }

        EnsureEveryDecisionMatchesAGroup(plan, decisions);

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var materialization = new ImportMaterialization(plan.Batch, now);
        db.ImportMaterializations.Add(materialization);

        var catalog = await LoadCatalogAsync(plan, cancellationToken);
        var createdItems = new List<(ImportRowMaterializationDraft Draft, OrderRequestItem Item)>();

        foreach (var group in plan.Groups)
        {
            var decision = decisions.GetValueOrDefault((group.LocationId, group.RequestPeriod));

            if (decision?.Action == GroupDecisionAction.Skip)
            {
                materialization.AddGroup(
                    group.LocationId, group.RequestPeriod, MaterializationAction.Skipped, null, group.Rows.Count, decision.Reason);
                continue;
            }

            var request = CreateRequest(plan, group, decision, catalog);
            db.OrderRequests.Add(request);

            foreach (var row in group.Rows)
            {
                var variant = catalog.Variants[row.ProductVariantId];
                var supplier = row.SupplierId is { } supplierId ? catalog.Suppliers[supplierId] : null;

                // Quantity and price come from the staged row as it stands; an unknown price stays unknown. The
                // mode comes from the price and the review and never from the supplier, which is still attached
                // exactly as before: one source can be both (brief 16). A row the review classified starts as
                // «Təsnif edilməyib» and is moved by the person who classified it, so its history on Qiymət
                // təsnifatı reads as if they had decided there.
                var classification = row.EffectiveClassification;
                var item = request.AddItem(
                    variant, row.Quantity, row.UnitPrice, supplier, row.OriginalProductName,
                    pricingMode: classification is null ? row.PricingMode : PricingMode.Unresolved);

                if (classification is { } mode)
                {
                    var pricingDecision = item.SetPricingMode(mode, ClassifierOf(row), ClassifiedInReview(plan.Batch.Id), now)
                                          ?? throw new InvalidOperationException("A classified line starts unclassified, so classifying it is a change.");
                    db.OrderItemPricingDecisions.Add(pricingDecision);
                }

                createdItems.Add((new ImportRowMaterializationDraft(row.ImportRowId), item));
            }

            materialization.AddGroup(
                group.LocationId,
                group.RequestPeriod,
                group.ExistingRequest ? MaterializationAction.CreatedNewVersion : MaterializationAction.Created,
                request,
                group.Rows.Count,
                null);
        }

        // The requests and their items need their generated ids before the provenance rows can point at them.
        await db.SaveChangesAsync(cancellationToken);

        var importRows = await db.ImportRows
            .Where(row => row.ImportBatchId == importBatchId && !row.IsExcluded)
            .ToDictionaryAsync(row => row.Id, cancellationToken);

        foreach (var (draft, item) in createdItems)
        {
            materialization.AddRow(importRows[draft.ImportRowId], item, now);
        }

        plan.Batch.MarkImported(now);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        stopwatch.Stop();

        var rows = plan.Groups
            .Where(group => decisions.GetValueOrDefault((group.LocationId, group.RequestPeriod))?.Action != GroupDecisionAction.Skip)
            .SelectMany(group => group.Rows)
            .ToList();
        var priced = rows.Where(row => row.UnitPrice is not null).ToList();
        var pricing = PlannedRow.CountsOf(rows);

        logger.LogInformation(
            "Import {ImportBatchId}: confirmed — {Requests} request(s), {Items} item(s), {SkippedGroups} group(s) skipped, in {Duration} ms",
            importBatchId, materialization.CreatedRequests, materialization.CreatedItems, materialization.SkippedGroups, stopwatch.ElapsedMilliseconds);

        return new ImportConfirmationResult(
            plan.Batch.Id,
            plan.Batch.Status,
            AlreadyImported: false,
            materialization.ConfirmedAtUtc,
            materialization.CreatedRequests,
            materialization.CreatedItems,
            materialization.SkippedGroups,
            materialization.SkippedRows,
            pricing.MissingPrice,
            rows.Count(row => row.IsPossibleDuplicate),
            rows.Count(row => row.SupplierId is null),
            priced.Count == 0 ? null : priced.Sum(row => row.Quantity * row.UnitPrice!.Value),
            stopwatch.ElapsedMilliseconds,
            pricing.Unclassified,
            pricing.PriceRequired,
            pricing.InternalSupply);
    }

    /// <summary>The person who classified the row in review: the one answerable for the line's mode.</summary>
    private static WorkflowActor ClassifierOf(PlannedRow row) =>
        row is { ClassifiedByUserId: { } userId, ClassifiedByDisplayName: { } displayName }
            ? WorkflowActor.User(userId, displayName)
            : throw new InvalidOperationException(
                $"Row #{row.ImportRowId} is classified without a recorded person; the database refuses that shape.");

    private static string ClassifiedInReview(long importBatchId) => $"Import #{importBatchId} yoxlamasında təsnif edilib";

    /// <summary>
    /// Version 1 for a group that has none, the next version for one that does. The request carries no
    /// responsible person and no request date: the order workbook states a period, not a day, and a group may
    /// hold rows of several people. Both stay traceable through the staged rows.
    /// </summary>
    private static OrderRequest CreateRequest(
        ConfirmationPlan plan, PlannedGroup group, ConfirmationGroupDecision? decision, ConfirmationCatalog catalog)
    {
        var location = catalog.Locations[group.LocationId];

        if (!group.ExistingRequest)
        {
            return new OrderRequest(location, group.RequestPeriod, requestDate: null, responsiblePerson: null, sourceImportBatch: plan.Batch);
        }

        if (decision?.Action != GroupDecisionAction.CreateNewVersion)
        {
            throw new ConflictException(
                $"{group.LocationName} {group.RequestPeriod:yyyy-MM} already has an order request; it needs an explicit decision.");
        }

        var latest = catalog.LatestRequests.GetValueOrDefault((group.LocationId, group.RequestPeriod))
                     ?? throw new ConflictException(
                         $"The existing request of {group.LocationName} {group.RequestPeriod:yyyy-MM} disappeared while the import was being confirmed. Reload the preview.");

        if (latest.Version != group.LatestVersion)
        {
            throw new ConflictException(
                $"{group.LocationName} {group.RequestPeriod:yyyy-MM} changed while the import was being confirmed: it is now version {latest.Version}. Reload the preview.");
        }

        // The domain refuses to version a draft — a draft is corrected in place — and says so itself.
        return latest.CreateNextVersion(requestDate: null, responsiblePerson: null, sourceImportBatch: plan.Batch);
    }

    private static Dictionary<(int LocationId, DateOnly RequestPeriod), ConfirmationGroupDecision> Validate(ImportConfirmationCommand command)
    {
        var decisions = new Dictionary<(int, DateOnly), ConfirmationGroupDecision>();

        foreach (var decision in command.Decisions ?? [])
        {
            if (decision.RequestPeriod.Day != 1)
            {
                throw new ValidationException("A request period must be the first day of a month.");
            }

            var reason = decision.Reason?.Trim();
            if (decision.Action == GroupDecisionAction.Skip)
            {
                if (string.IsNullOrEmpty(reason))
                {
                    throw new ValidationException("Skipping a group needs a reason.");
                }

                if (reason.Length > ImportMaterializationGroup.SkipReasonMaxLength)
                {
                    throw new ValidationException($"A skip reason accepts at most {ImportMaterializationGroup.SkipReasonMaxLength} characters.");
                }
            }
            else if (!string.IsNullOrEmpty(reason))
            {
                throw new ValidationException("Only a skipped group carries a reason.");
            }

            if (!decisions.TryAdd((decision.LocationId, decision.RequestPeriod), decision with { Reason = reason }))
            {
                throw new ValidationException($"Location #{decision.LocationId} {decision.RequestPeriod:yyyy-MM} has two decisions.");
            }
        }

        return decisions;
    }

    private static void EnsureEveryDecisionMatchesAGroup(
        ConfirmationPlan plan, IReadOnlyDictionary<(int, DateOnly), ConfirmationGroupDecision> decisions)
    {
        var groups = plan.Groups.Select(group => (group.LocationId, group.RequestPeriod)).ToHashSet();

        foreach (var key in decisions.Keys.Where(key => !groups.Contains(key)))
        {
            throw new ConflictException(
                $"The decision for location #{key.Item1} {key.Item2:yyyy-MM} has no group in this import any more. Reload the preview.");
        }

        foreach (var group in plan.Groups)
        {
            var decision = decisions.GetValueOrDefault((group.LocationId, group.RequestPeriod));
            if (decision is null)
            {
                continue;
            }

            var valid = decision.Action switch
            {
                GroupDecisionAction.Create => !group.ExistingRequest,
                GroupDecisionAction.CreateNewVersion => group.ConflictState == GroupConflictState.ExistingRequest,
                _ => true,
            };

            if (!valid)
            {
                throw new ConflictException(
                    $"{group.LocationName} {group.RequestPeriod:yyyy-MM} cannot be handled with '{decision.Action}' any more: it is now {group.ConflictState}. Reload the preview.");
            }
        }
    }

    /// <summary>The operator confirms what they read; a batch that changed underneath is refused, not imported.</summary>
    private static void EnsureMatchesWhatTheOperatorSaw(ImportConfirmationCommand command, ImportConfirmationPreview preview)
    {
        if (command.ExpectedRowsToImport is { } rows && rows != preview.RowsToImport)
        {
            throw new ConflictException(
                $"The import now has {preview.RowsToImport} rows to import, not {rows}. Reload the preview before confirming.");
        }

        if (command.ExpectedGroupCount is { } groups && groups != preview.GroupCount)
        {
            throw new ConflictException(
                $"The import now has {preview.GroupCount} groups, not {groups}. Reload the preview before confirming.");
        }
    }

    /// <summary>A repeat of the same confirmation is idempotent; a different one is refused.</summary>
    private static void EnsureSameDecisions(
        ImportMaterialization existing, IReadOnlyDictionary<(int, DateOnly), ConfirmationGroupDecision> decisions)
    {
        foreach (var decision in decisions.Values)
        {
            var group = existing.Groups.FirstOrDefault(
                item => item.LocationId == decision.LocationId && item.RequestPeriod == decision.RequestPeriod);

            var applied = group?.Action switch
            {
                MaterializationAction.Created => GroupDecisionAction.Create,
                MaterializationAction.CreatedNewVersion => GroupDecisionAction.CreateNewVersion,
                MaterializationAction.Skipped => GroupDecisionAction.Skip,
                _ => (GroupDecisionAction?)null,
            };

            if (applied != decision.Action)
            {
                throw new ConflictException(
                    $"Import #{existing.ImportBatchId} is already imported and cannot be confirmed again with different decisions.");
            }
        }
    }

    private async Task<ConfirmationCatalog> LoadCatalogAsync(ConfirmationPlan plan, CancellationToken cancellationToken)
    {
        var rows = plan.Groups.SelectMany(group => group.Rows).ToList();
        var variantIds = rows.Select(row => row.ProductVariantId).Distinct().ToList();
        var supplierIds = rows.Where(row => row.SupplierId is not null).Select(row => row.SupplierId!.Value).Distinct().ToList();
        var locationIds = plan.Groups.Select(group => group.LocationId).Distinct().ToList();
        var versionedGroups = plan.Groups.Where(group => group.ExistingRequest).ToList();

        var variants = await db.ProductVariants
            .Where(variant => variantIds.Contains(variant.Id))
            .ToDictionaryAsync(variant => variant.Id, cancellationToken);
        var suppliers = await db.Suppliers
            .Where(supplier => supplierIds.Contains(supplier.Id))
            .ToDictionaryAsync(supplier => supplier.Id, cancellationToken);
        var locations = await db.Locations
            .Where(location => locationIds.Contains(location.Id))
            .ToDictionaryAsync(location => location.Id, cancellationToken);

        var latestRequests = new Dictionary<(int, DateOnly), OrderRequest>();
        if (versionedGroups.Count > 0)
        {
            var periods = versionedGroups.Select(group => group.RequestPeriod).Distinct().ToList();
            var candidateLocations = versionedGroups.Select(group => group.LocationId).Distinct().ToList();

            var requests = await db.OrderRequests
                .Include(request => request.Location)
                .Where(request => candidateLocations.Contains(request.LocationId) && periods.Contains(request.RequestPeriod))
                .ToListAsync(cancellationToken);

            foreach (var group in requests.GroupBy(request => (request.LocationId, request.RequestPeriod)))
            {
                latestRequests[group.Key] = group.OrderByDescending(request => request.Version).First();
            }
        }

        var missingVariant = variantIds.FirstOrDefault(id => !variants.ContainsKey(id));
        if (missingVariant != 0)
        {
            throw new ConflictException($"Product variant #{missingVariant} disappeared while the import was being confirmed. Reload the preview.");
        }

        return new ConfirmationCatalog(variants, suppliers, locations, latestRequests);
    }

    private sealed record ConfirmationCatalog(
        Dictionary<long, ProductVariant> Variants,
        Dictionary<int, Supplier> Suppliers,
        Dictionary<int, Location> Locations,
        Dictionary<(int LocationId, DateOnly RequestPeriod), OrderRequest> LatestRequests);

    private sealed record ImportRowMaterializationDraft(long ImportRowId);
}
