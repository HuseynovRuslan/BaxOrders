namespace BaxOrders.Domain.Orders;

/// <summary>
/// Which reviewed version a correction version was made from, by whom and when.
/// </summary>
/// <remarks>
/// A returned request is never edited. Correcting it makes a new version, and this record is the durable
/// link between the two — it is what makes the new version a <i>revision</i>, rather than anything inferred
/// from a version number (a version 2 may equally have come from a second import).
/// <para>
/// A source is revised at most once, and a revision has exactly one source: both ends are unique in the
/// database. A second revision of the same returned version would leave two competing corrections of one
/// month; the way on from a revision that was itself returned is to revise <i>that</i>, which makes the chain
/// version 1 → 2 → 3 rather than a fan.
/// </para>
/// </remarks>
public sealed class OrderRequestRevision
{
    public const int CreatedByDisplayNameMaxLength = OrderRequestWorkflowEvent.ActorDisplayNameMaxLength;

    private OrderRequestRevision()
    {
    }

    internal OrderRequestRevision(OrderRequest source, OrderRequest revision, WorkflowActor actor, DateTime createdAtUtc)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(revision);
        ArgumentNullException.ThrowIfNull(actor);

        SourceOrderRequest = source;
        SourceOrderRequestId = source.Id;
        RevisionOrderRequest = revision;
        RevisionOrderRequestId = revision.Id;
        CreatedByUserId = actor.UserId ?? throw new DomainException("A correction version is created by a signed-in person.");
        CreatedByDisplayName = Guard.RequiredText(actor.DisplayName, CreatedByDisplayNameMaxLength, nameof(actor));
        CreatedAtUtc = Guard.Utc(createdAtUtc, nameof(createdAtUtc));
    }

    public long Id { get; private set; }

    /// <summary>The returned version that was corrected. Never changed by being corrected.</summary>
    public long SourceOrderRequestId { get; private set; }

    public OrderRequest SourceOrderRequest { get; private set; } = null!;

    /// <summary>The draft that carries the correction.</summary>
    public long RevisionOrderRequestId { get; private set; }

    public OrderRequest RevisionOrderRequest { get; private set; } = null!;

    public Guid CreatedByUserId { get; private set; }

    /// <summary>Their name as it read when they did it. A snapshot: never refreshed.</summary>
    public string CreatedByDisplayName { get; private set; } = null!;

    public DateTime CreatedAtUtc { get; private set; }
}
