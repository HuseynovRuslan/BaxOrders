using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;

namespace BaxOrders.Domain.Orders;

/// <summary>
/// A material request of one location for one analytical period.
/// </summary>
/// <remarks>
/// One Excel workbook is not necessarily one request: an import batch may produce several requests
/// (different locations, periods or responsible persons) after human review.
/// <para>
/// One logical request exists per location + request period. Corrections and resubmissions are stored as
/// new versions (1, 2, 3, …) of that logical request; earlier versions are never overwritten.
/// (LocationId, RequestPeriod, Version) is unique in the database.
/// </para>
/// <para>
/// The period is what analytics compare. The request date is the day the request was written and is optional:
/// the order workbook only states a period ("Tarix" = first day of the month), while request forms state both
/// ("Tarix: 22.06.2026", "Dövr: 01.07.2026 – 31.07.2026"), and the date may fall before the period.
/// </para>
/// </remarks>
public sealed class OrderRequest
{
    public const int InitialVersion = 1;

    private readonly List<OrderRequestItem> _items = [];

    private OrderRequest()
    {
    }

    /// <param name="location">Requesting location; must be active.</param>
    /// <param name="requestPeriod">Analytical month; must be the first day of a month.</param>
    /// <param name="requestDate">Day the request was written, when the source states one.</param>
    /// <param name="responsiblePerson">Optional responsible person; must be active.</param>
    /// <param name="sourceImportBatch">The import batch this request was created from, if any.</param>
    public OrderRequest(
        Location location,
        DateOnly requestPeriod,
        DateOnly? requestDate = null,
        ResponsiblePerson? responsiblePerson = null,
        ImportBatch? sourceImportBatch = null)
        : this(location, requestPeriod, requestDate, responsiblePerson, sourceImportBatch, InitialVersion)
    {
    }

    private OrderRequest(
        Location location,
        DateOnly requestPeriod,
        DateOnly? requestDate,
        ResponsiblePerson? responsiblePerson,
        ImportBatch? sourceImportBatch,
        int version)
    {
        ArgumentNullException.ThrowIfNull(location);

        if (!location.IsActive)
        {
            throw new DomainException($"Location '{location.Name}' is inactive.");
        }

        if (responsiblePerson is { IsActive: false })
        {
            throw new DomainException($"Responsible person '{responsiblePerson.Name}' is inactive.");
        }

        if (requestPeriod.Day != 1)
        {
            throw new DomainException("Request period must be the first day of a month.");
        }

        Location = location;
        LocationId = location.Id;
        RequestPeriod = requestPeriod;
        RequestDate = requestDate;
        ResponsiblePerson = responsiblePerson;
        ResponsiblePersonId = responsiblePerson is { Id: > 0 } ? responsiblePerson.Id : null;
        SourceImportBatch = sourceImportBatch;
        SourceImportBatchId = sourceImportBatch is { Id: > 0 } ? sourceImportBatch.Id : null;
        Status = OrderRequestStatus.Draft;
        Version = version;
    }

    public long Id { get; private set; }

    public int LocationId { get; private set; }

    public Location Location { get; private set; } = null!;

    /// <summary>Analytical month, always the first day of that month. Required.</summary>
    public DateOnly RequestPeriod { get; private set; }

    /// <summary>
    /// Business date the request was written, when the source states one. Not a timestamp and not UTC.
    /// Null for requests from the order workbook, which only states a period.
    /// </summary>
    public DateOnly? RequestDate { get; private set; }

    public OrderRequestStatus Status { get; private set; }

    public int Version { get; private set; }

    public int? ResponsiblePersonId { get; private set; }

    public ResponsiblePerson? ResponsiblePerson { get; private set; }

    public long? SourceImportBatchId { get; private set; }

    public ImportBatch? SourceImportBatch { get; private set; }

    public IReadOnlyCollection<OrderRequestItem> Items => _items;

    public DateTime CreatedAtUtc { get; private set; }

    public DateTime UpdatedAtUtc { get; private set; }

    public DateTime? SubmittedAtUtc { get; private set; }

    public DateTime? ApprovedAtUtc { get; private set; }

    public DateTime? RejectedAtUtc { get; private set; }

    public static DateOnly PeriodOf(DateOnly date) => new(date.Year, date.Month, 1);

    /// <summary>
    /// Starts the next version of this logical request (same location and period) as a new draft.
    /// This version stays unchanged. Call it on the latest version; the database rejects duplicate versions.
    /// </summary>
    /// <param name="requestDate">Business date of the corrected request, if known; may fall outside the period.</param>
    /// <param name="responsiblePerson">Optional responsible person of the correction.</param>
    /// <param name="sourceImportBatch">The import batch the correction comes from, if any.</param>
    public OrderRequest CreateNextVersion(
        DateOnly? requestDate = null,
        ResponsiblePerson? responsiblePerson = null,
        ImportBatch? sourceImportBatch = null)
    {
        if (Status == OrderRequestStatus.Draft)
        {
            throw new DomainException("A draft is corrected in place; only submitted, approved or rejected requests get a new version.");
        }

        if (Location is null)
        {
            throw new InvalidOperationException("The location must be loaded to create a new version.");
        }

        return new OrderRequest(Location, RequestPeriod, requestDate, responsiblePerson, sourceImportBatch, Version + 1);
    }

    public OrderRequestItem AddItem(
        ProductVariant productVariant,
        decimal quantity,
        decimal? unitPrice,
        Supplier? supplier = null,
        string? originalProductName = null,
        string? notes = null)
    {
        EnsureStatus(OrderRequestStatus.Draft, "add items to");

        var item = new OrderRequestItem(this, productVariant, supplier, quantity, unitPrice, originalProductName, notes);
        _items.Add(item);
        return item;
    }

    public void RemoveItem(OrderRequestItem item)
    {
        EnsureStatus(OrderRequestStatus.Draft, "remove items from");

        if (!_items.Remove(item))
        {
            throw new DomainException("The item does not belong to this request.");
        }
    }

    /// <remarks>Requires <see cref="Items"/> to be loaded; an unloaded request is treated as empty and rejected.</remarks>
    public void Submit(DateTime utcNow)
    {
        EnsureStatus(OrderRequestStatus.Draft, "submit");

        if (_items.Count == 0)
        {
            throw new DomainException("A request without items cannot be submitted.");
        }

        SubmittedAtUtc = Guard.Utc(utcNow, nameof(utcNow));
        Status = OrderRequestStatus.PendingApproval;
    }

    public void Approve(DateTime utcNow)
    {
        EnsureStatus(OrderRequestStatus.PendingApproval, "approve");
        ApprovedAtUtc = Guard.Utc(utcNow, nameof(utcNow));
        Status = OrderRequestStatus.Approved;
    }

    public void Reject(DateTime utcNow)
    {
        EnsureStatus(OrderRequestStatus.PendingApproval, "reject");
        RejectedAtUtc = Guard.Utc(utcNow, nameof(utcNow));
        Status = OrderRequestStatus.Rejected;
    }

    private void EnsureStatus(OrderRequestStatus required, string action)
    {
        if (Status != required)
        {
            throw new DomainException($"Cannot {action} a request in status {Status}; it must be {required}.");
        }
    }
}
