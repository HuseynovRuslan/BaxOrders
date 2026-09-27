using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Pricing;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Imports.Confirmation;

/// <summary>One staged row as the confirmation sees it: already resolved, already effective, ready to become an item.</summary>
/// <param name="IsPossibleDuplicate">Informational only; the row still becomes an item of its own.</param>
/// <param name="Classification">What a reviewer said about the missing price; null when nobody did.</param>
/// <param name="OrderLineType">
/// What the workbook's "Növ" column said, read through <see cref="OrderLineTypes"/>. Unclassified when the
/// column is absent, blank, or holds something this system does not recognise — never guessed at.
/// </param>
/// <param name="ClassifiedByUserId">Who said it, answerable for it on the line's history.</param>
/// <param name="ResponsiblePersonId">
/// The canonical person the row's "Cavabdeh şəxs" cell was resolved to, null when the cell was empty or its
/// name is still unresolved. It travels to the line it becomes: dropping it here is what used to leave every
/// imported line answerable to nobody.
/// </param>
internal sealed record PlannedRow(
    long ImportRowId,
    int LocationId,
    DateOnly RequestPeriod,
    long ProductVariantId,
    decimal Quantity,
    decimal? UnitPrice,
    int? SupplierId,
    string? OriginalProductName,
    bool IsPossibleDuplicate,
    bool IsUnitlessVariant,
    bool HasSpecificationDescriptor,
    PricingMode? Classification,
    Guid? ClassifiedByUserId,
    string? ClassifiedByDisplayName,
    OrderLineType OrderLineType,
    int? ResponsiblePersonId)
{
    /// <summary>The mode the line is written with (<see cref="ImportLinePricing.ModeOf"/>).</summary>
    public PricingMode PricingMode => ImportLinePricing.ModeOf(UnitPrice, Classification);

    /// <summary>
    /// The review's classification when it is what the line ends up saying — never for a row that carries a price,
    /// where a classification left over from before a correction answers nothing.
    /// </summary>
    public PricingMode? EffectiveClassification => UnitPrice is null ? Classification : null;

    public static ImportPricingCounts CountsOf(IEnumerable<PlannedRow> rows) =>
        ImportPricingCounts.Of(rows.Select(row => (row.UnitPrice, row.Classification)));
}

/// <summary>Everything the confirmation needs about one location + period group.</summary>
internal sealed record PlannedGroup(
    int LocationId,
    string LocationCode,
    string LocationName,
    DateOnly RequestPeriod,
    IReadOnlyList<PlannedRow> Rows,
    bool ExistingRequest,
    int ExistingVersions,
    int? LatestVersion,
    OrderRequestStatus? LatestStatus)
{
    public GroupConflictState ConflictState => !ExistingRequest
        ? GroupConflictState.New
        : LatestStatus == OrderRequestStatus.Draft
            ? GroupConflictState.ExistingDraft
            : GroupConflictState.ExistingRequest;

    /// <summary>Only rows with a known price count towards money; a missing price is never read as zero.</summary>
    public decimal? KnownAmountTotal
    {
        get
        {
            var priced = Rows.Where(row => row.UnitPrice is not null).ToList();
            return priced.Count == 0 ? null : priced.Sum(row => row.Quantity * row.UnitPrice!.Value);
        }
    }
}

internal sealed record ConfirmationPlan(
    ImportBatch Batch,
    IReadOnlyList<PlannedGroup> Groups,
    int IncludedRows,
    int ExcludedRows,
    ImportMaterialization? Existing);

/// <summary>
/// Builds the deterministic plan for turning one staged batch into order requests: which groups exist, what
/// each of them would create, and what the operator still has to decide.
/// </summary>
/// <remarks>
/// It reads and computes only — no writes, no status changes. The confirmation builds the plan again under
/// the batch lock, so a stale preview can never decide what is written.
/// <para>
/// The group is <c>Location + RequestPeriod</c> and nothing else: a request belongs to a place and a month,
/// never to a supplier, a category or a person. Every included row stays a separate item, so identical lines
/// are imported as the two lines they are.
/// </para>
/// </remarks>
public sealed class ImportConfirmationPlanner(IBaxOrdersDbContext db)
{
    internal async Task<ConfirmationPlan?> BuildAsync(long importBatchId, CancellationToken cancellationToken)
    {
        var batch = await db.ImportBatches.FirstOrDefaultAsync(item => item.Id == importBatchId, cancellationToken);
        if (batch is null)
        {
            return null;
        }

        var existing = await db.ImportMaterializations.AsNoTracking()
            .Include(materialization => materialization.Groups)
            .Include(materialization => materialization.Rows)
            .FirstOrDefaultAsync(materialization => materialization.ImportBatchId == importBatchId, cancellationToken);

        var excludedRows = await db.ImportRows
            .CountAsync(row => row.ImportBatchId == importBatchId && row.IsExcluded, cancellationToken);

        // An included row that reached ReadyToImport already has every identity it needs; the query states
        // that requirement again so a row can never be imported on half a decision.
        var rows = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == importBatchId
                          && !row.IsExcluded
                          && row.MatchedLocationId != null
                          && row.MatchedProductVariantId != null
                          && row.ParsedQuantity != null
                          && row.ParsedRequestPeriod != null)
            .Select(row => new
            {
                row.Id,
                LocationId = row.MatchedLocationId!.Value,
                RequestPeriod = row.ParsedRequestPeriod!.Value,
                ProductVariantId = row.MatchedProductVariantId!.Value,
                Quantity = row.ParsedQuantity!.Value,
                row.ParsedUnitPrice,
                row.MatchedSupplierId,
                row.OriginalProductName,
                IsPossibleDuplicate = row.Issues.Any(issue => issue.IssueType == ImportIssueType.DuplicateRow),
                IsUnitlessVariant = row.MatchedOrderUnitId == null,
                HasSpecificationDescriptor = row.SpecificationDescriptor != null,
                row.PricingClassification,
                row.PricingClassifiedByUserId,
                row.PricingClassifiedByDisplayName,
                row.OriginalOrderLineType,
                row.MatchedResponsiblePersonId,
            })
            .ToListAsync(cancellationToken);

        var planned = rows.Select(row => new PlannedRow(
                row.Id,
                row.LocationId,
                row.RequestPeriod,
                row.ProductVariantId,
                row.Quantity,
                row.ParsedUnitPrice,
                row.MatchedSupplierId,
                row.OriginalProductName,
                row.IsPossibleDuplicate,
                row.IsUnitlessVariant,
                row.HasSpecificationDescriptor,
                row.PricingClassification,
                row.PricingClassifiedByUserId,
                row.PricingClassifiedByDisplayName,
                OrderLineTypes.Read(row.OriginalOrderLineType) ?? OrderLineType.Unclassified,
                row.MatchedResponsiblePersonId))
            .ToList();

        var locationIds = planned.Select(row => row.LocationId).Distinct().ToList();
        var periods = planned.Select(row => row.RequestPeriod).Distinct().ToList();

        var locations = await db.Locations.AsNoTracking()
            .Where(location => locationIds.Contains(location.Id))
            .Select(location => new { location.Id, location.Code, location.Name })
            .ToDictionaryAsync(location => location.Id, cancellationToken);

        // Existing requests of exactly these locations and periods, in one query instead of one per group.
        var existingRequests = await db.OrderRequests.AsNoTracking()
            .Where(request => locationIds.Contains(request.LocationId) && periods.Contains(request.RequestPeriod))
            .Select(request => new { request.LocationId, request.RequestPeriod, request.Version, request.Status })
            .ToListAsync(cancellationToken);

        var requestsByGroup = existingRequests
            .GroupBy(request => (request.LocationId, request.RequestPeriod))
            .ToDictionary(group => group.Key, group => group.OrderByDescending(request => request.Version).ToList());

        var groups = planned
            .GroupBy(row => (row.LocationId, row.RequestPeriod))
            .OrderBy(group => group.Key.RequestPeriod)
            .ThenBy(group => locations.TryGetValue(group.Key.LocationId, out var location) ? location.Name : string.Empty, AzerbaijaniCollation.Comparer)
            .Select(group =>
            {
                var location = locations.GetValueOrDefault(group.Key.LocationId);
                var existingForGroup = requestsByGroup.GetValueOrDefault(group.Key) ?? [];

                return new PlannedGroup(
                    group.Key.LocationId,
                    location?.Code ?? string.Empty,
                    location?.Name ?? string.Empty,
                    group.Key.RequestPeriod,
                    [.. group],
                    existingForGroup.Count > 0,
                    existingForGroup.Count,
                    existingForGroup.Count > 0 ? existingForGroup[0].Version : null,
                    existingForGroup.Count > 0 ? existingForGroup[0].Status : null);
            })
            .ToList();

        return new ConfirmationPlan(batch, groups, planned.Count, excludedRows, existing);
    }

    /// <summary>The preview an operator reads before confirming. Performs no writes of any kind.</summary>
    public async Task<ImportConfirmationPreview?> PreviewAsync(long importBatchId, CancellationToken cancellationToken)
    {
        var plan = await BuildAsync(importBatchId, cancellationToken);
        return plan is null ? null : Describe(plan, decisions: null);
    }

    /// <summary>
    /// Turns a plan into the preview contract. When decisions are supplied — during a confirmation — a group
    /// that needed one and has it no longer counts against <c>CanConfirm</c>.
    /// </summary>
    internal static ImportConfirmationPreview Describe(
        ConfirmationPlan plan, IReadOnlyDictionary<(int LocationId, DateOnly RequestPeriod), ConfirmationGroupDecision>? decisions)
    {
        var rows = plan.Groups.SelectMany(group => group.Rows).ToList();
        var pricing = PlannedRow.CountsOf(rows);

        var groups = plan.Groups.Select(group =>
        {
            var decided = decisions?.GetValueOrDefault((group.LocationId, group.RequestPeriod));
            var required = RequiredDecision(group);
            var groupPricing = PlannedRow.CountsOf(group.Rows);

            return new ConfirmationGroupPreview(
                group.LocationId,
                group.LocationCode,
                group.LocationName,
                group.RequestPeriod,
                group.Rows.Count,
                group.Rows.Count(row => row.UnitPrice is not null),
                groupPricing.MissingPrice,
                group.Rows.Count(row => row.IsPossibleDuplicate),
                group.KnownAmountTotal,
                group.ExistingRequest,
                group.ExistingVersions,
                group.LatestVersion,
                ProposedVersion(group, decided),
                group.ConflictState,
                required,
                groupPricing.Unclassified,
                groupPricing.PriceRequired,
                groupPricing.InternalSupply);
        }).ToList();

        var undecided = plan.Groups.Count(group =>
            RequiredDecision(group) is not null
            && decisions?.ContainsKey((group.LocationId, group.RequestPeriod)) != true);

        var canConfirm = plan.Existing is null
                         && plan.Batch.Status == ImportStatus.ReadyToImport
                         && plan.IncludedRows > 0
                         && undecided == 0;

        return new ImportConfirmationPreview(
            plan.Batch.Id,
            plan.Batch.Status,
            plan.Batch.Status == ImportStatus.ReadyToImport,
            plan.Batch.TotalRows,
            plan.IncludedRows,
            plan.ExcludedRows,
            plan.Groups.Count,
            rows.Count,
            rows.Count(row => row.UnitPrice is not null),
            pricing.MissingPrice,
            rows.Count(row => row.IsPossibleDuplicate),
            rows.Count(row => row.SupplierId is not null),
            rows.Count(row => row.SupplierId is null),
            rows.Count(row => row.IsUnitlessVariant),
            rows.Count(row => row.HasSpecificationDescriptor),
            plan.Groups.Count(group => group.ExistingRequest),
            canConfirm,
            plan.Existing is not null,
            groups,
            plan.Existing is null ? null : ResultOf(plan.Existing, plan.Batch, durationMilliseconds: 0),
            pricing.Unclassified,
            pricing.PriceRequired,
            pricing.InternalSupply);
    }

    /// <summary>A group with no existing request needs no decision; one with an existing request always does.</summary>
    private static GroupDecisionAction? RequiredDecision(PlannedGroup group) => group.ConflictState switch
    {
        GroupConflictState.New => null,
        GroupConflictState.ExistingRequest => GroupDecisionAction.CreateNewVersion,
        _ => GroupDecisionAction.Skip,
    };

    private static int? ProposedVersion(PlannedGroup group, ConfirmationGroupDecision? decision)
    {
        if (decision?.Action == GroupDecisionAction.Skip)
        {
            return null;
        }

        return group.ConflictState switch
        {
            GroupConflictState.New => OrderRequest.InitialVersion,
            GroupConflictState.ExistingRequest when decision?.Action == GroupDecisionAction.CreateNewVersion => group.LatestVersion + 1,
            _ => null,
        };
    }

    internal static ImportConfirmationResult ResultOf(ImportMaterialization materialization, ImportBatch batch, long durationMilliseconds) =>
        new(
            batch.Id,
            batch.Status,
            AlreadyImported: true,
            materialization.ConfirmedAtUtc,
            materialization.CreatedRequests,
            materialization.CreatedItems,
            materialization.SkippedGroups,
            materialization.SkippedRows,
            MissingPriceItems: 0,
            PossibleDuplicateItems: 0,
            MissingSupplierItems: 0,
            KnownAmountTotal: null,
            durationMilliseconds,
            UnclassifiedPriceItems: 0,
            PriceRequiredItems: 0,
            InternalSupplyItems: 0);
}
