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
    private readonly List<OrderRequestEditEvent> _editEvents = [];

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

    /// <summary>Every change made to the lines of this correction version, oldest first. Append-only.</summary>
    public IReadOnlyCollection<OrderRequestEditEvent> EditEvents => _editEvents;

    /// <summary>
    /// The record saying which reviewed version this request corrects, or null when it was not created as a
    /// correction — every imported request, for instance.
    /// </summary>
    /// <remarks>
    /// Must be loaded to edit. An unloaded one reads as "not a revision", so forgetting to load it refuses the
    /// edit rather than letting an imported request be changed.
    /// </remarks>
    public OrderRequestRevision? RevisedFrom { get; private set; }

    /// <summary>
    /// True when this request was made as the correction of a returned version. Only such a request is ever
    /// edited, and only while it is a draft.
    /// </summary>
    public bool IsRevision => RevisedFrom is not null;

    /// <summary>
    /// Guards the workflow against two people acting on the same request at once: a transition written from a
    /// copy that is no longer current fails instead of overwriting the one that got there first.
    /// </summary>
    /// <remarks>
    /// Kept by the application rather than by the database: the save interceptor gives it a new value whenever
    /// the row changes, and EF compares it on every update. That keeps the guard the same on any provider, and
    /// keeps a provider's internal bookkeeping — SQL Server's <c>rowversion</c>, PostgreSQL's <c>xmin</c> —
    /// out of an API contract the browser has to echo back.
    /// </remarks>
    public Guid ConcurrencyStamp { get; private set; } = Guid.NewGuid();

    /// <summary>
    /// How many of this request's lines are still waiting for a price somebody owes.
    /// </summary>
    /// <remarks>
    /// Only material the company buys counts. Material it supplies itself carries no purchase price because
    /// none is owed, and counting it here would hold up an approval over nothing.
    /// <para>
    /// A line whose supply nobody has classified yet is counted here, deliberately: not knowing is not the
    /// same as knowing nothing is owed, and the cautious reading is the one that cannot hide a real gap.
    /// </para>
    /// <para>
    /// This reads the lines only. It needs no supplier loaded, because the answer lives on the line — see
    /// <c>PricingMode</c> for why one supplier cannot speak for all of its lines.
    /// </para>
    /// </remarks>
    public int MissingRequiredPriceItemCount => _items.Count(item => item.IsMissingRequiredPrice);

    /// <summary>
    /// Lines the company supplies itself, free of charge. Never a shortfall and never an acknowledgement.
    /// </summary>
    public int InternalFreeSupplyItemCount => _items.Count(item => item.IsInternalFreeSupply);

    /// <summary>
    /// Unpriced lines nobody has yet said are bought or supplied free.
    /// </summary>
    /// <remarks>
    /// Counted inside <see cref="MissingRequiredPriceItemCount"/> as well, because an unreviewed line must not
    /// quietly suppress a warning. This says how many of those are waiting on a person rather than on a price.
    /// </remarks>
    public int UnresolvedPricingItemCount =>
        _items.Count(item => item.UnitPrice is null && item.PricingMode is PricingMode.Unresolved);

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

    /// <summary>
    /// Makes the correction of this returned request: the next version, as a draft, holding an exact copy of
    /// every line. This version is not touched — it stays returned, with its lines and its history as reviewed.
    /// </summary>
    /// <remarks>
    /// The new version keeps the location, the period, the request date (a missing one stays missing: the day
    /// the correction was made is audit metadata, not the day the request was written) and the responsible
    /// person. It inherits no workflow state — nobody has submitted it — and no import batch, because no
    /// import made it; each copied line leads back to its original through
    /// <see cref="OrderRequestItem.SourceOrderRequestItemId"/>.
    /// <para>
    /// Uses the same versioning rule as every new version: this one's number plus one, with the database
    /// refusing a duplicate. Call it on the latest version; the caller checks that, and the unique index on
    /// (location, period, version) is the last line of defence if something else got there first.
    /// </para>
    /// </remarks>
    public OrderRequest CreateRevision(WorkflowActor actor, DateTime utcNow)
    {
        ArgumentNullException.ThrowIfNull(actor);
        EnsureStatus("create a correction version of", OrderRequestStatus.ReturnedForCorrection);

        if (actor.UserId is null)
        {
            throw new DomainException("A correction version is created by a signed-in person.");
        }

        // A returned request was submitted, and nothing is submitted without lines; none loaded means the
        // caller forgot to load them, and copying nothing would quietly produce an empty correction.
        if (_items.Count == 0)
        {
            throw new InvalidOperationException("The items must be loaded to create a correction version.");
        }

        if (ResponsiblePersonId is not null && ResponsiblePerson is null)
        {
            throw new InvalidOperationException("The responsible person must be loaded to create a correction version.");
        }

        var revision = CreateNextVersion(RequestDate, ResponsiblePerson, sourceImportBatch: null);
        foreach (var item in _items)
        {
            revision._items.Add(item.CopyInto(revision));
        }

        revision.RevisedFrom = new OrderRequestRevision(this, revision, actor, utcNow);
        revision._editEvents.Add(OrderRequestEditEvent.RevisionCreated(revision, this, actor, utcNow));
        return revision;
    }

    /// <summary>Adds a line while a request is being built. A correction version is changed through its audited edits instead.</summary>
    /// <param name="pricingMode">
    /// What the line starts as. An import always says (brief 16); null keeps the supplier's seed for a line built by
    /// hand — see <see cref="OrderRequestItem"/>.
    /// </param>
    /// <param name="responsiblePerson">
    /// Who asked for this line, when the source says. An import passes what the row's "Cavabdeh şəxs" cell was
    /// resolved to; null is "not stated" and never a person picked for the line.
    /// </param>
    public OrderRequestItem AddItem(
        ProductVariant productVariant,
        decimal quantity,
        decimal? unitPrice,
        Supplier? supplier = null,
        string? originalProductName = null,
        string? notes = null,
        PricingMode? pricingMode = null,
        OrderLineType orderLineType = OrderLineType.Monthly,
        ResponsiblePerson? responsiblePerson = null)
    {
        EnsureStatus("add items to", OrderRequestStatus.Draft);
        EnsureNotRevision();

        var item = new OrderRequestItem(
            this, productVariant, supplier, quantity, unitPrice, originalProductName, notes, pricingMode,
            orderLineType, responsiblePerson);
        _items.Add(item);
        return item;
    }

    /// <summary>Removes a line while a request is being built. A correction version is changed through its audited edits instead.</summary>
    public void RemoveItem(OrderRequestItem item)
    {
        EnsureStatus("remove items from", OrderRequestStatus.Draft);
        EnsureNotRevision();

        if (!_items.Remove(item))
        {
            throw new DomainException("The item does not belong to this request.");
        }
    }

    // ---- editing a correction version ----------------------------------------------------------------
    //
    // Only a draft that was made as a correction is edited, and every change leaves an entry in the edit
    // history. A change to the same value is not a change: it records nothing.

    /// <returns>The history entry, or null when the quantity was already that.</returns>
    public OrderRequestEditEvent? ChangeItemQuantity(
        OrderRequestItem item, decimal quantity, WorkflowActor actor, DateTime utcNow)
    {
        var line = EditableLine(item, actor);
        var from = line.Quantity;

        line.ChangeQuantity(quantity);
        return line.Quantity == from
            ? null
            : RecordEdit(OrderRequestEditEvent.QuantityChanged(this, line, from, line.Quantity, actor, utcNow));
    }

    /// <param name="unitPrice">Null records that the price is not known. It is never read as zero.</param>
    /// <returns>The history entry, or null when the price was already that.</returns>
    public OrderRequestEditEvent? ChangeItemUnitPrice(
        OrderRequestItem item, decimal? unitPrice, WorkflowActor actor, DateTime utcNow)
    {
        var line = EditableLine(item, actor);
        var from = line.UnitPrice;

        line.ChangeUnitPrice(unitPrice);
        return line.UnitPrice == from
            ? null
            : RecordEdit(OrderRequestEditEvent.PriceChanged(this, line, from, line.UnitPrice, actor, utcNow));
    }

    /// <param name="supplier">An active catalog supplier, or null for none. Never created here from text.</param>
    /// <returns>The history entry, or null when the supplier was already that.</returns>
    public OrderRequestEditEvent? ChangeItemSupplier(
        OrderRequestItem item, Supplier? supplier, WorkflowActor actor, DateTime utcNow)
    {
        var line = EditableLine(item, actor);

        // The old supplier goes into the history by name, so it has to be there to be named.
        if (line.SupplierId is not null && line.Supplier is null)
        {
            throw new InvalidOperationException("The line's supplier must be loaded to change it.");
        }

        var from = line.Supplier;
        if (SameSupplier(from, supplier))
        {
            return null;
        }

        line.ChangeSupplier(supplier);
        return RecordEdit(OrderRequestEditEvent.SupplierChanged(this, line, from, supplier, actor, utcNow));
    }

    /// <summary>
    /// Records whether a line is the month's planned material or was ordered on top of the plan.
    /// </summary>
    /// <remarks>
    /// Line-level on purpose: one request routinely holds both kinds, so this is never a property of the
    /// request. Changing it moves money between the monthly comparison and the ad-hoc summary, which is why it
    /// goes through the audited edits rather than being set quietly.
    /// </remarks>
    /// <returns>The history entry, or null when the line was already classified that way.</returns>
    public OrderRequestEditEvent? ChangeItemOrderLineType(
        OrderRequestItem item, OrderLineType orderLineType, WorkflowActor actor, DateTime utcNow)
    {
        var line = EditableLine(item, actor);
        var from = line.OrderLineType;

        line.ChangeOrderLineType(orderLineType);
        return line.OrderLineType == from
            ? null
            : RecordEdit(OrderRequestEditEvent.OrderLineTypeChanged(this, line, from, line.OrderLineType, actor, utcNow));
    }

    /// <summary>
    /// Records who asked for a line.
    /// </summary>
    /// <remarks>
    /// Line-level for the same reason as the classification: the source states it per line and one request
    /// routinely holds two or three people's lines. Changing it can change what the request as a whole reads
    /// as — one person's order, or several — so it goes through the audited edits like every other statement
    /// about a line.
    /// </remarks>
    /// <param name="responsiblePerson">An active canonical person, or null for none. Never created here from text.</param>
    /// <returns>The history entry, or null when the line already named that person.</returns>
    public OrderRequestEditEvent? ChangeItemResponsiblePerson(
        OrderRequestItem item, ResponsiblePerson? responsiblePerson, WorkflowActor actor, DateTime utcNow)
    {
        var line = EditableLine(item, actor);

        // The old person goes into the history by name, so the record has to be there to be named.
        if (line.ResponsiblePersonId is not null && line.ResponsiblePerson is null)
        {
            throw new InvalidOperationException("The line's responsible person must be loaded to change it.");
        }

        var from = line.ResponsiblePerson;
        if (SamePerson(from, responsiblePerson))
        {
            return null;
        }

        line.ChangeResponsiblePerson(responsiblePerson);
        return RecordEdit(OrderRequestEditEvent.ResponsiblePersonChanged(this, line, from, responsiblePerson, actor, utcNow));
    }

    /// <summary>
    /// Adds a line to a correction version. The line is new: it copies nothing and claims no workbook row.
    /// </summary>
    /// <remarks>
    /// Its history entry is written by <see cref="RecordItemAdded"/> once the line has been saved, because the
    /// entry names the line by its id and the database hands the id out. Both happen in one transaction.
    /// </remarks>
    public OrderRequestItem AddRevisionItem(
        ProductVariant productVariant,
        decimal quantity,
        decimal? unitPrice,
        Supplier? supplier,
        WorkflowActor actor,
        OrderLineType orderLineType = OrderLineType.Monthly,
        ResponsiblePerson? responsiblePerson = null)
    {
        EnsureEditableRevision(actor);

        var item = new OrderRequestItem(
            this, productVariant, supplier, quantity, unitPrice, originalProductName: null, notes: null,
            pricingMode: null, orderLineType: orderLineType, responsiblePerson: responsiblePerson);
        _items.Add(item);
        return item;
    }

    /// <summary>Writes the history entry of a line added by <see cref="AddRevisionItem"/>, once it has an id.</summary>
    public OrderRequestEditEvent RecordItemAdded(OrderRequestItem item, WorkflowActor actor, DateTime utcNow)
    {
        var line = EditableLine(item, actor);

        if (line.Id <= 0)
        {
            throw new InvalidOperationException("Save the added line first; its history entry names it by its id.");
        }

        if (line.SourceOrderRequestItemId is not null)
        {
            throw new InvalidOperationException("A line copied from the previous version was not added by hand.");
        }

        return RecordEdit(OrderRequestEditEvent.ItemAdded(this, line, actor, utcNow));
    }

    /// <summary>
    /// Takes a line out of this correction version. The line is deleted from this draft only; the version it
    /// was copied from keeps its own line, and the history keeps exactly what was removed.
    /// </summary>
    public OrderRequestEditEvent RemoveRevisionItem(OrderRequestItem item, WorkflowActor actor, DateTime utcNow)
    {
        var line = EditableLine(item, actor);

        // Written before the line goes, while its values can still be read.
        var removed = RecordEdit(OrderRequestEditEvent.ItemRemoved(this, line, actor, utcNow));
        _items.Remove(line);
        return removed;
    }

    private OrderRequestItem EditableLine(OrderRequestItem item, WorkflowActor actor)
    {
        ArgumentNullException.ThrowIfNull(item);
        EnsureEditableRevision(actor);

        return _items.Contains(item)
            ? item
            : throw new DomainException("The item does not belong to this request.");
    }

    private void EnsureEditableRevision(WorkflowActor actor)
    {
        ArgumentNullException.ThrowIfNull(actor);

        if (!IsRevision)
        {
            throw new DomainException(
                "Only a correction version made from a returned request can be edited; this request was not made that way.");
        }

        EnsureStatus("edit", OrderRequestStatus.Draft);

        if (actor.UserId is null)
        {
            throw new DomainException("A correction is edited by a signed-in person.");
        }
    }

    private void EnsureNotRevision()
    {
        if (IsRevision)
        {
            throw new DomainException("A correction version is changed through its audited edits, so every change is recorded.");
        }
    }

    private OrderRequestEditEvent RecordEdit(OrderRequestEditEvent editEvent)
    {
        _editEvents.Add(editEvent);
        return editEvent;
    }

    private static bool SameSupplier(Supplier? left, Supplier? right)
    {
        if (left is null || right is null)
        {
            return left is null && right is null;
        }

        return ReferenceEquals(left, right) || (left.Id > 0 && left.Id == right.Id);
    }

    private static bool SamePerson(ResponsiblePerson? left, ResponsiblePerson? right)
    {
        if (left is null || right is null)
        {
            return left is null && right is null;
        }

        return ReferenceEquals(left, right) || (left.Id > 0 && left.Id == right.Id);
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
        EnsureNotOwnContribution(actor, "approve");

        // Only the prices somebody owes. An order supplied entirely from the company's own store is complete
        // and is approved like any other, with nothing to acknowledge.
        var missingRequired = MissingRequiredPriceItemCount;
        if (missingRequired > 0 && !missingPricesAcknowledged)
        {
            throw new MissingPriceAcknowledgementRequiredException(missingRequired);
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
        EnsureNotOwnContribution(actor, "return");

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

    /// <summary>
    /// Whoever shaped this correction's content does not get to decide it is right, whatever role they hold.
    /// </summary>
    /// <remarks>
    /// Submitting is only the last of the ways to author a version. Changing a quantity, a price or a
    /// supplier, adding or removing a line, or creating the correction at all, are all recorded in the edit
    /// history — so the history is what this reads. A request nobody has corrected has none, and is decided
    /// on the submitter rule alone.
    /// </remarks>
    private void EnsureNotOwnContribution(WorkflowActor actor, string action)
    {
        // A correction always carries at least the entry that created it. None loaded would silently let its
        // own author approve it, so say so instead of quietly allowing it.
        if (IsRevision && _editEvents.Count == 0)
        {
            throw new InvalidOperationException(
                "The edit history must be loaded to decide on a correction version.");
        }

        if (actor.UserId is { } userId && _editEvents.Any(editEvent => editEvent.ActorUserId == userId))
        {
            throw new OwnContributionNotApprovableException(action);
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
        // What it records is the count that mattered to the decision: prices somebody owed and had not given.
        var workflowEvent = new OrderRequestWorkflowEvent(
            this, action, from, Status, actor, comment,
            MissingRequiredPriceItemCount, missingPricesAcknowledged, utcNow);

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
