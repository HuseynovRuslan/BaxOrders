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
    private readonly List<OrderRequestWorkflowEvent> _workflowEvents = [];

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

    /// <summary>Every workflow action taken on this request, oldest first. Append-only.</summary>
    public IReadOnlyCollection<OrderRequestWorkflowEvent> WorkflowEvents => _workflowEvents;

    /// <summary>
    /// Guards the workflow against two people acting on the same request at once: a transition written from a
    /// copy that is no longer current fails instead of overwriting the one that got there first.
    /// </summary>
    public byte[] RowVersion { get; private set; } = [];

    /// <summary>How many of this request's lines have no price. Requires the items to be loaded.</summary>
    public int MissingPriceItemCount => _items.Count(item => item.UnitPrice is null);

    /// <summary>
    /// Who put the request into its <b>current</b> approval cycle, so that person cannot also decide on it.
    /// </summary>
    /// <remarks>
    /// Rewritten on every submission, so a request that was returned and sent again belongs to whoever sent
    /// it the second time. Null for a request nobody has submitted yet — including every request that was
    /// imported before sign-in existed, which is a fact about them rather than a missing value.
    /// </remarks>
    public Guid? SubmittedByUserId { get; private set; }

    public DateTime CreatedAtUtc { get; private set; }

    public DateTime UpdatedAtUtc { get; private set; }

    public DateTime? SubmittedAtUtc { get; private set; }

    public DateTime? ApprovedAtUtc { get; private set; }

    /// <summary>When it was last handed back for correction, if it ever was.</summary>
    public DateTime? ReturnedAtUtc { get; private set; }

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
            throw new DomainException(
                "A draft is corrected in place; only a submitted, approved or returned request gets a new version.");
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
        EnsureStatus("add items to", OrderRequestStatus.Draft);

        var item = new OrderRequestItem(this, productVariant, supplier, quantity, unitPrice, originalProductName, notes);
        _items.Add(item);
        return item;
    }

    public void RemoveItem(OrderRequestItem item)
    {
        EnsureStatus("remove items from", OrderRequestStatus.Draft);

        if (!_items.Remove(item))
        {
            throw new DomainException("The item does not belong to this request.");
        }
    }

    /// <summary>
    /// Hands the request to whoever approves it. A returned request may be sent again; a status change is not
    /// a new revision, so the version does not move.
    /// </summary>
    /// <remarks>Requires <see cref="Items"/> to be loaded; an unloaded request looks empty and is refused.</remarks>
    public OrderRequestWorkflowEvent SubmitForApproval(WorkflowActor actor, string? comment, DateTime utcNow)
    {
        ArgumentNullException.ThrowIfNull(actor);
        EnsureStatus("submit", OrderRequestStatus.Draft, OrderRequestStatus.ReturnedForCorrection);

        if (_items.Count == 0)
        {
            throw new DomainException("A request without items cannot be submitted.");
        }

        var from = Status;
        SubmittedAtUtc = Guard.Utc(utcNow, nameof(utcNow));
        // Whoever sends it now is the one who may not decide on it — not whoever sent it the first time.
        SubmittedByUserId = actor.UserId;
        Status = OrderRequestStatus.PendingApproval;

        return Record(OrderWorkflowAction.SubmittedForApproval, from, actor, comment, false, utcNow);
    }

    /// <summary>
    /// Approves the request. Approval is the end of the road: an approved month is corrected by a new version,
    /// never by reopening this one.
    /// </summary>
    /// <param name="missingPricesAcknowledged">
    /// Whether the approver said they know some lines have no price. A missing price does not make an order
    /// wrong, so it does not block approval — but it does mean the approved money is not the whole money, and
    /// that has to be a decision somebody took rather than something that slipped past.
    /// </param>
    public OrderRequestWorkflowEvent Approve(
        WorkflowActor actor, string? comment, bool missingPricesAcknowledged, DateTime utcNow)
    {
        ArgumentNullException.ThrowIfNull(actor);
        EnsureStatus("approve", OrderRequestStatus.PendingApproval);
        EnsureNotOwnSubmission(actor, "approve");

        if (MissingPriceItemCount > 0 && !missingPricesAcknowledged)
        {
            throw new MissingPriceAcknowledgementRequiredException(MissingPriceItemCount);
        }

        var from = Status;
        ApprovedAtUtc = Guard.Utc(utcNow, nameof(utcNow));
        Status = OrderRequestStatus.Approved;

        return Record(OrderWorkflowAction.Approved, from, actor, comment, missingPricesAcknowledged, utcNow);
    }

    /// <summary>Hands the request back to be put right. The reason is the point of the action, so it is required.</summary>
    public OrderRequestWorkflowEvent ReturnForCorrection(WorkflowActor actor, string reason, DateTime utcNow)
    {
        ArgumentNullException.ThrowIfNull(actor);
        EnsureStatus("return", OrderRequestStatus.PendingApproval);
        EnsureNotOwnSubmission(actor, "return");

        var trimmed = Guard.RequiredText(reason, OrderRequestWorkflowEvent.CommentMaxLength, "Return reason");

        var from = Status;
        ReturnedAtUtc = Guard.Utc(utcNow, nameof(utcNow));
        Status = OrderRequestStatus.ReturnedForCorrection;

        return Record(OrderWorkflowAction.ReturnedForCorrection, from, actor, trimmed, false, utcNow);
    }

    /// <summary>
    /// An approval is a second pair of eyes. A request decided on by the person who submitted it has not had
    /// any, whatever role that person holds.
    /// </summary>
    private void EnsureNotOwnSubmission(WorkflowActor actor, string action)
    {
        if (actor.UserId is { } userId && SubmittedByUserId == userId)
        {
            throw new SelfApprovalNotAllowedException(action);
        }
    }

    private OrderRequestWorkflowEvent Record(
        OrderWorkflowAction action,
        OrderRequestStatus from,
        WorkflowActor actor,
        string? comment,
        bool missingPricesAcknowledged,
        DateTime utcNow)
    {
        // The event is written by the transition itself, so no status can change without leaving a trace.
        var workflowEvent = new OrderRequestWorkflowEvent(
            this, action, from, Status, actor, comment,
            MissingPriceItemCount, missingPricesAcknowledged, utcNow);

        _workflowEvents.Add(workflowEvent);
        return workflowEvent;
    }

    private void EnsureStatus(string action, params OrderRequestStatus[] allowed)
    {
        if (!allowed.Contains(Status))
        {
            throw new DomainException(
                $"Cannot {action} a request in status {Status}; it must be {string.Join(" or ", allowed)}.");
        }
    }
}

/// <summary>
/// Raised when an approval would cover lines whose price nobody knows, and the approver has not said so.
/// </summary>
/// <remarks>
/// Its own type because the answer is not "this is invalid" but "confirm you know": the caller is expected to
/// show the count, get an acknowledgement and try again.
/// </remarks>
public sealed class MissingPriceAcknowledgementRequiredException(int missingPriceItemCount)
    : DomainException(
        $"This request has {missingPriceItemCount} line(s) without a price, so the approved amount is not the "
        + "complete amount. The approver must acknowledge that before it can be approved.")
{
    public int MissingPriceItemCount { get; } = missingPriceItemCount;
}
