using BaxOrders.Domain.Orders;

namespace BaxOrders.Domain.Imports;

/// <summary>What the operator decided for one location + period group of a confirmed import.</summary>
public enum MaterializationAction
{
    /// <summary>No request existed for this location and period; version 1 was created.</summary>
    Created = 1,

    /// <summary>A request already existed; a new version was created and the earlier ones were left untouched.</summary>
    CreatedNewVersion = 2,

    /// <summary>The operator deliberately left this group out. Its rows stay staged and become no order.</summary>
    Skipped = 3,
}

/// <summary>
/// The record that one import batch was turned into permanent order requests, and how.
/// </summary>
/// <remarks>
/// One batch materializes at most once: <c>ImportBatchId</c> is unique, so a retry or a second operator can
/// never produce a second set of orders. The rows themselves stay in staging untouched — this is the link
/// between them and what they became, not a copy of them.
/// </remarks>
public sealed class ImportMaterialization
{
    private readonly List<ImportMaterializationGroup> _groups = [];
    private readonly List<ImportRowMaterialization> _rows = [];

    private ImportMaterialization()
    {
    }

    public ImportMaterialization(ImportBatch importBatch, DateTime confirmedAtUtc)
    {
        ArgumentNullException.ThrowIfNull(importBatch);

        ImportBatch = importBatch;
        ImportBatchId = importBatch.Id;
        ConfirmedAtUtc = Guard.Utc(confirmedAtUtc, nameof(confirmedAtUtc));
    }

    public long Id { get; private set; }

    public long ImportBatchId { get; private set; }

    public ImportBatch ImportBatch { get; private set; } = null!;

    public DateTime ConfirmedAtUtc { get; private set; }

    public IReadOnlyCollection<ImportMaterializationGroup> Groups => _groups;

    public IReadOnlyCollection<ImportRowMaterialization> Rows => _rows;

    public int CreatedRequests => _groups.Count(group => group.Action != MaterializationAction.Skipped);

    public int CreatedItems => _rows.Count;

    /// <summary>
    /// The requests this import wrote, in the order it wrote them.
    /// </summary>
    /// <remarks>
    /// Said out loud because the coordinator's next act is on exactly this set: an import of the company's
    /// workbook leaves 166 drafts, and sending them for approval one screen at a time is not work anybody
    /// should be asked to do. A skipped group wrote nothing and is not here.
    /// </remarks>
    public IReadOnlyList<long> CreatedOrderRequestIds =>
        [.. _groups
            .Where(group => group.Action != MaterializationAction.Skipped && group.OrderRequest is not null)
            .Select(group => group.OrderRequest!.Id)];

    public int SkippedGroups => _groups.Count(group => group.Action == MaterializationAction.Skipped);

    public int SkippedRows => _groups.Where(group => group.Action == MaterializationAction.Skipped).Sum(group => group.SourceRowCount);

    public ImportMaterializationGroup AddGroup(
        int locationId, DateOnly requestPeriod, MaterializationAction action, OrderRequest? orderRequest, int sourceRowCount, string? skipReason)
    {
        var group = new ImportMaterializationGroup(this, locationId, requestPeriod, action, orderRequest, sourceRowCount, skipReason);
        _groups.Add(group);
        return group;
    }

    /// <summary>Links one staged row to the one permanent item it became.</summary>
    public ImportRowMaterialization AddRow(ImportRow importRow, OrderRequestItem item, DateTime createdAtUtc)
    {
        var row = new ImportRowMaterialization(this, importRow, item, createdAtUtc);
        _rows.Add(row);
        return row;
    }
}

/// <summary>One location + period group of a confirmed import, and the request it produced.</summary>
public sealed class ImportMaterializationGroup
{
    public const int SkipReasonMaxLength = 500;

    private ImportMaterializationGroup()
    {
    }

    internal ImportMaterializationGroup(
        ImportMaterialization materialization,
        int locationId,
        DateOnly requestPeriod,
        MaterializationAction action,
        OrderRequest? orderRequest,
        int sourceRowCount,
        string? skipReason)
    {
        ArgumentNullException.ThrowIfNull(materialization);

        Action = Guard.DefinedEnum(action, nameof(Action));

        if (requestPeriod.Day != 1)
        {
            throw new DomainException("Request period must be the first day of a month.");
        }

        if (sourceRowCount < 0)
        {
            throw new DomainException("A group cannot have a negative row count.");
        }

        if (Action == MaterializationAction.Skipped)
        {
            if (orderRequest is not null)
            {
                throw new DomainException("A skipped group has no order request.");
            }

            // A future reader must be able to tell "left out on purpose" from "the system forgot these rows".
            SkipReason = Guard.RequiredText(skipReason, SkipReasonMaxLength, nameof(SkipReason));
        }
        else
        {
            if (skipReason is not null)
            {
                throw new DomainException("Only a skipped group carries a reason.");
            }

            ArgumentNullException.ThrowIfNull(orderRequest);

            OrderRequest = orderRequest;
            OrderRequestId = orderRequest.Id;
            Version = orderRequest.Version;
        }

        Materialization = materialization;
        ImportMaterializationId = materialization.Id;
        LocationId = locationId;
        RequestPeriod = requestPeriod;
        SourceRowCount = sourceRowCount;
    }

    public long Id { get; private set; }

    public long ImportMaterializationId { get; private set; }

    public ImportMaterialization Materialization { get; private set; } = null!;

    public int LocationId { get; private set; }

    public DateOnly RequestPeriod { get; private set; }

    public MaterializationAction Action { get; private set; }

    /// <summary>Null only for a skipped group.</summary>
    public long? OrderRequestId { get; private set; }

    public OrderRequest? OrderRequest { get; private set; }

    /// <summary>Version of the request that was created; null for a skipped group.</summary>
    public int? Version { get; private set; }

    /// <summary>Included staged rows this group covered, whether or not they became items.</summary>
    public int SourceRowCount { get; private set; }

    /// <summary>Why the operator left the group out. Required for a skipped group, forbidden otherwise.</summary>
    public string? SkipReason { get; private set; }
}

/// <summary>
/// One staged row and the single permanent item it became. Both sides are unique: a source row is never
/// imported twice, and an item never claims two source rows.
/// </summary>
public sealed class ImportRowMaterialization
{
    private ImportRowMaterialization()
    {
    }

    internal ImportRowMaterialization(
        ImportMaterialization materialization, ImportRow importRow, OrderRequestItem orderRequestItem, DateTime createdAtUtc)
    {
        ArgumentNullException.ThrowIfNull(materialization);
        ArgumentNullException.ThrowIfNull(importRow);
        ArgumentNullException.ThrowIfNull(orderRequestItem);

        Materialization = materialization;
        ImportMaterializationId = materialization.Id;
        ImportRow = importRow;
        ImportRowId = importRow.Id;
        OrderRequestItem = orderRequestItem;
        OrderRequestItemId = orderRequestItem.Id;
        CreatedAtUtc = Guard.Utc(createdAtUtc, nameof(createdAtUtc));
    }

    public long Id { get; private set; }

    public long ImportMaterializationId { get; private set; }

    public ImportMaterialization Materialization { get; private set; } = null!;

    public long ImportRowId { get; private set; }

    public ImportRow ImportRow { get; private set; } = null!;

    public long OrderRequestItemId { get; private set; }

    public OrderRequestItem OrderRequestItem { get; private set; } = null!;

    public DateTime CreatedAtUtc { get; private set; }
}
