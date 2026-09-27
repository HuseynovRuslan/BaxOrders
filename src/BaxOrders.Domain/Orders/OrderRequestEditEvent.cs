using System.Globalization;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using BaxOrders.Domain.Suppliers;

namespace BaxOrders.Domain.Orders;

/// <summary>What was done to the content of a correction version. One value per kind of change.</summary>
public enum OrderEditAction
{
    RevisionCreated = 1,
    ItemQuantityChanged = 2,
    ItemPriceChanged = 3,
    ItemSupplierChanged = 4,
    ItemAdded = 5,
    ItemRemoved = 6,
    ItemOrderLineTypeChanged = 7,
}

/// <summary>The field of a line a change was made to.</summary>
public enum OrderEditField
{
    Quantity = 1,
    UnitPrice = 2,
    Supplier = 3,
    OrderLineType = 4,
}

/// <summary>
/// One change to the content of a correction version: who changed what, from what to what, and when.
/// </summary>
/// <remarks>
/// Append-only, like the workflow history, and deliberately separate from it. The workflow history answers
/// "who sent it, who decided"; this one answers "what was changed in the lines". A screen may show both on one
/// timeline; they are still two records of two different things.
/// <para>
/// <see cref="OldValue"/> and <see cref="NewValue"/> are structured, never prose: each is a JSON value written
/// culture-invariantly — a number for a quantity or a price (<c>12.5</c>, never <c>12,5</c>), an object for a
/// supplier (<c>{"id":7,"name":"…"}</c>) or for a whole line. A database <c>NULL</c> is "no value": a price
/// nobody knows, a line with no supplier, the old side of an added line. It is never written as zero.
/// </para>
/// <para>
/// <see cref="OrderRequestItemId"/> is a fact, not a reference the database enforces: a line removed from a
/// draft is deleted, and its history has to outlive it. <see cref="ProductVariantId"/> says which product the
/// line was for, so an entry still reads correctly after the line itself is gone.
/// </para>
/// </remarks>
public sealed class OrderRequestEditEvent
{
    public const int ActorDisplayNameMaxLength = OrderRequestWorkflowEvent.ActorDisplayNameMaxLength;
    public const int ValueMaxLength = 2000;

    private OrderRequestEditEvent()
    {
    }

    private OrderRequestEditEvent(
        OrderRequest orderRequest,
        OrderEditAction action,
        OrderRequestItem? item,
        OrderEditField? field,
        string? oldValue,
        string? newValue,
        WorkflowActor actor,
        DateTime occurredAtUtc)
    {
        ArgumentNullException.ThrowIfNull(orderRequest);
        ArgumentNullException.ThrowIfNull(actor);

        OrderRequest = orderRequest;
        OrderRequestId = orderRequest.Id;
        Action = action;
        OrderRequestItemId = item is { Id: > 0 } ? item.Id : null;
        ProductVariantId = item?.ProductVariantId;
        Field = field;
        OldValue = Guard.OptionalText(oldValue, ValueMaxLength, nameof(oldValue));
        NewValue = Guard.OptionalText(newValue, ValueMaxLength, nameof(newValue));

        // An edit is a person's decision. Unlike the workflow history there is nothing from before sign-in to
        // account for, so there is never an edit without somebody behind it.
        ActorUserId = actor.UserId ?? throw new DomainException("A correction is edited by a signed-in person.");
        ActorDisplayName = Guard.RequiredText(actor.DisplayName, ActorDisplayNameMaxLength, nameof(actor));
        OccurredAtUtc = Guard.Utc(occurredAtUtc, nameof(occurredAtUtc));
    }

    public long Id { get; private set; }

    public long OrderRequestId { get; private set; }

    public OrderRequest OrderRequest { get; private set; } = null!;

    public OrderEditAction Action { get; private set; }

    /// <summary>The line this is about. Null only for <see cref="OrderEditAction.RevisionCreated"/>.</summary>
    public long? OrderRequestItemId { get; private set; }

    /// <summary>The variant of that line, kept so the entry still reads after the line has been removed.</summary>
    public long? ProductVariantId { get; private set; }

    /// <summary>Set for the three "changed" actions, null otherwise.</summary>
    public OrderEditField? Field { get; private set; }

    public string? OldValue { get; private set; }

    public string? NewValue { get; private set; }

    public Guid ActorUserId { get; private set; }

    /// <summary>The actor's name as it read when this happened. A snapshot: never refreshed, never rewritten.</summary>
    public string ActorDisplayName { get; private set; } = null!;

    public DateTime OccurredAtUtc { get; private set; }

    internal static OrderRequestEditEvent RevisionCreated(
        OrderRequest revision, OrderRequest source, WorkflowActor actor, DateTime utcNow) =>
        new(revision, OrderEditAction.RevisionCreated, null, null, null,
            EditAuditValue.Revision(source), actor, utcNow);

    internal static OrderRequestEditEvent QuantityChanged(
        OrderRequest request, OrderRequestItem item, decimal from, decimal to, WorkflowActor actor, DateTime utcNow) =>
        new(request, OrderEditAction.ItemQuantityChanged, item, OrderEditField.Quantity,
            EditAuditValue.Of(from), EditAuditValue.Of(to), actor, utcNow);

    internal static OrderRequestEditEvent PriceChanged(
        OrderRequest request, OrderRequestItem item, decimal? from, decimal? to, WorkflowActor actor, DateTime utcNow) =>
        new(request, OrderEditAction.ItemPriceChanged, item, OrderEditField.UnitPrice,
            EditAuditValue.Of(from), EditAuditValue.Of(to), actor, utcNow);

    internal static OrderRequestEditEvent SupplierChanged(
        OrderRequest request, OrderRequestItem item, Supplier? from, Supplier? to, WorkflowActor actor, DateTime utcNow) =>
        new(request, OrderEditAction.ItemSupplierChanged, item, OrderEditField.Supplier,
            EditAuditValue.Of(from), EditAuditValue.Of(to), actor, utcNow);

    internal static OrderRequestEditEvent OrderLineTypeChanged(
        OrderRequest request, OrderRequestItem item, OrderLineType from, OrderLineType to, WorkflowActor actor, DateTime utcNow) =>
        new(request, OrderEditAction.ItemOrderLineTypeChanged, item, OrderEditField.OrderLineType,
            EditAuditValue.Of(from), EditAuditValue.Of(to), actor, utcNow);

    internal static OrderRequestEditEvent ItemAdded(
        OrderRequest request, OrderRequestItem item, WorkflowActor actor, DateTime utcNow) =>
        new(request, OrderEditAction.ItemAdded, item, null, null, EditAuditValue.Line(item), actor, utcNow);

    internal static OrderRequestEditEvent ItemRemoved(
        OrderRequest request, OrderRequestItem item, WorkflowActor actor, DateTime utcNow) =>
        new(request, OrderEditAction.ItemRemoved, item, null, EditAuditValue.Line(item), null, actor, utcNow);
}

/// <summary>
/// How a value is written into the edit history: JSON, culture-invariant, and with no trailing zeros, so the
/// same quantity always reads the same however it was typed.
/// </summary>
public static class EditAuditValue
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        // Supplier and product names are Azerbaijani; the stored value stays readable instead of \u-escaped.
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
    };

    /// <summary>A number, or null when there is none. <c>12.500</c> and <c>12.5</c> are written the same.</summary>
    public static string? Of(decimal? value) =>
        value is { } number ? Canonical(number).ToString(CultureInfo.InvariantCulture) : null;

    /// <summary>
    /// The classification by name, never by number, so the history stays readable if the enum ever moves.
    /// </summary>
    /// <remarks>
    /// Serialized rather than written bare, because every value in this column is read back as JSON. A bare
    /// <c>Monthly</c> is not JSON and threw on the way out, which made the history of a request unreadable as
    /// soon as it held one — so the value is the JSON string <c>"Monthly"</c>.
    /// </remarks>
    public static string Of(OrderLineType value) => JsonSerializer.Serialize(value.ToString(), Options);

    /// <summary>The supplier as it was named at the time, or null for none.</summary>
    public static string? Of(Supplier? supplier) =>
        supplier is null ? null : JsonSerializer.Serialize(new SupplierValue(supplier.Id, supplier.Name), Options);

    /// <summary>A whole line: what an added line was added as, or what a removed line was before it went.</summary>
    public static string Line(OrderRequestItem item)
    {
        ArgumentNullException.ThrowIfNull(item);

        if (item.SupplierId is not null && item.Supplier is null)
        {
            throw new InvalidOperationException("The line's supplier must be loaded to record it.");
        }

        return JsonSerializer.Serialize(
            new LineValue(
                item.ProductVariantId,
                Canonical(item.Quantity),
                item.UnitPrice is { } price ? Canonical(price) : null,
                item.SupplierId,
                item.Supplier?.Name,
                item.SourceOrderRequestItemId),
            Options);
    }

    /// <summary>Which reviewed version a correction was made from, and how many lines it took over.</summary>
    public static string Revision(OrderRequest source)
    {
        ArgumentNullException.ThrowIfNull(source);
        return JsonSerializer.Serialize(new RevisionValue(source.Id, source.Version, source.Items.Count), Options);
    }

    /// <summary>The same number with its trailing zeros dropped: 12.500 becomes 12.5, 10.000 becomes 10.</summary>
    public static decimal Canonical(decimal value) => value / 1.0000000000000000000000000000m;

    private sealed record SupplierValue(int Id, string Name);

    private sealed record LineValue(
        long ProductVariantId,
        decimal Quantity,
        decimal? UnitPrice,
        int? SupplierId,
        string? SupplierName,
        long? SourceOrderRequestItemId);

    private sealed record RevisionValue(long SourceOrderRequestId, int SourceVersion, int ItemCount);
}
