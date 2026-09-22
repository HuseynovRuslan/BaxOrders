using System.Text.Json;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BaxOrders.Application.Orders.Revisions;

/// <summary>
/// Correcting a returned order: making its correction version, editing that draft, and reading where a
/// request stands as a correction.
/// </summary>
/// <remarks>
/// The rules are the domain's — which request may be corrected, which may be edited, what an edit may change
/// and what it records. This service loads what the domain needs, takes the actor from the session, and turns
/// the database's refusals into answers: a unique index that said no becomes the existing correction or a 409,
/// a row version that moved becomes a 409.
/// <para>
/// Nothing here submits or decides. A correction draft goes through the same workflow as every other request.
/// </para>
/// </remarks>
public sealed class OrderRevisionService(
    IBaxOrdersDbContext db,
    ICurrentUserContext currentUser,
    IOrderRequestLock requestLock,
    ILogger<OrderRevisionService> logger)
{
    /// <returns>Null when the request does not exist.</returns>
    public Task<OrderRevisionDto?> GetAsync(long orderRequestId, CancellationToken cancellationToken) =>
        DescribeAsync(orderRequestId, cancellationToken);

    /// <summary>
    /// Makes the correction version of a returned request, or answers with the one already made.
    /// </summary>
    /// <remarks>
    /// The caller sends nothing but the id: the location, the month, the next version number, the lines and
    /// the actor are all the server's. Two people pressing the button at once — or one person pressing it
    /// twice — get the same correction: the returned request is locked while it is corrected, and the unique
    /// index on the source stands behind the lock.
    /// </remarks>
    public async Task<CreateRevisionResultDto> CreateAsync(long sourceOrderRequestId, CancellationToken cancellationToken)
    {
        var actor = Reviser();

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await requestLock.AcquireAsync(sourceOrderRequestId, cancellationToken);

        if (await ExistingRevisionAsync(sourceOrderRequestId, cancellationToken) is { } existing)
        {
            await transaction.CommitAsync(cancellationToken);
            return existing;
        }

        var source = await db.OrderRequests
            .Include(request => request.Location)
            .Include(request => request.ResponsiblePerson)
            .Include(request => request.Items)
            .FirstOrDefaultAsync(request => request.Id == sourceOrderRequestId, cancellationToken)
            ?? throw new NotFoundException($"Order request #{sourceOrderRequestId} was not found.");

        // Only the newest version of a month is corrected. An older one has been overtaken — by an import, for
        // instance — and correcting it would put a fork in the history and hand analytics a stale month.
        var newest = await db.OrderRequests.AsNoTracking()
            .Where(request => request.LocationId == source.LocationId && request.RequestPeriod == source.RequestPeriod)
            .MaxAsync(request => request.Version, cancellationToken);

        if (newest > source.Version)
        {
            throw new ConflictException(
                $"Version {newest} of this month already exists, so version {source.Version} is no longer the one to correct.");
        }

        // The domain decides whether this request may be corrected at all: only a returned one may.
        var revision = source.CreateRevision(actor, DateTime.UtcNow);
        db.OrderRequests.Add(revision);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
        {
            // A unique index said no: something else made this version number, or this correction, first.
            await transaction.RollbackAsync(cancellationToken);
            db.ChangeTracker.Clear();
            logger.LogWarning(exception, "Correcting order request {OrderRequestId} collided with a concurrent change", sourceOrderRequestId);

            return await ExistingRevisionAsync(sourceOrderRequestId, cancellationToken)
                   ?? throw new ConflictException(
                       "Another version of this month was created at the same moment. Reload it and try again.");
        }

        logger.LogInformation(
            "Order request {SourceId} (version {SourceVersion}) corrected as {RevisionId} (version {Version}) with {Items} line(s) by user {UserId}",
            source.Id, source.Version, revision.Id, revision.Version, revision.Items.Count, actor.UserId);

        return new CreateRevisionResultDto(
            revision.Id, revision.Version, revision.Items.Count, source.Id, source.Version, AlreadyExisted: false);
    }

    /// <summary>Changes the quantity, the price or the supplier of one line of a correction draft.</summary>
    public async Task<RevisionEditResultDto> EditItemAsync(
        long orderRequestId, long orderRequestItemId, EditOrderItemCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        var actor = Reviser();
        var token = ConcurrencyToken.Parse(command.RowVersion);

        if (!command.ChangesAnything)
        {
            throw new ValidationException("Nothing to change: send at least one of quantity, unitPrice or supplierId.");
        }

        var request = await EditableAsync(orderRequestId, token, cancellationToken);
        var item = LineOf(request, orderRequestItemId);
        var supplier = command.SupplierId is { Value: { } supplierId }
            ? await SupplierAsync(supplierId, cancellationToken)
            : null;

        var now = DateTime.UtcNow;
        var changed = false;

        if (command.Quantity is { } quantity)
        {
            changed |= request.ChangeItemQuantity(item, quantity.Value, actor, now) is not null;
        }

        if (command.UnitPrice is { } unitPrice)
        {
            changed |= request.ChangeItemUnitPrice(item, unitPrice.Value, actor, now) is not null;
        }

        if (command.SupplierId is not null)
        {
            changed |= request.ChangeItemSupplier(item, supplier, actor, now) is not null;
        }

        // Asking for the value a line already has changes nothing, so it records nothing and moves nothing.
        if (changed)
        {
            Touch(request);
            await SaveAsync(cancellationToken);
        }

        return new RevisionEditResultDto(item.Id, (await DescribeAsync(orderRequestId, cancellationToken))!);
    }

    /// <summary>Adds a catalog variant to a correction draft as a new line.</summary>
    public async Task<RevisionEditResultDto> AddItemAsync(
        long orderRequestId, AddOrderItemCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        var actor = Reviser();
        var token = ConcurrencyToken.Parse(command.RowVersion);

        // Two saves — the line first, so it has an id, then the history entry that names it — in one
        // transaction, so neither is ever there without the other.
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var request = await EditableAsync(orderRequestId, token, cancellationToken);
        var variant = await db.ProductVariants.FirstOrDefaultAsync(item => item.Id == command.ProductVariantId, cancellationToken)
                      ?? throw new ValidationException($"Product variant #{command.ProductVariantId} does not exist.");
        var supplier = command.SupplierId is { } supplierId ? await SupplierAsync(supplierId, cancellationToken) : null;

        var item = request.AddRevisionItem(variant, command.Quantity, command.UnitPrice, supplier, actor);
        Touch(request);
        await SaveAsync(cancellationToken);

        request.RecordItemAdded(item, actor, DateTime.UtcNow);
        await SaveAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new RevisionEditResultDto(item.Id, (await DescribeAsync(orderRequestId, cancellationToken))!);
    }

    /// <summary>
    /// Takes a line out of a correction draft. Only this draft loses it: the version it was copied from keeps
    /// its own line, and the history keeps what was removed.
    /// </summary>
    public async Task<RevisionEditResultDto> RemoveItemAsync(
        long orderRequestId, long orderRequestItemId, string? rowVersion, CancellationToken cancellationToken)
    {
        var actor = Reviser();
        var token = ConcurrencyToken.Parse(rowVersion);

        var request = await EditableAsync(orderRequestId, token, cancellationToken);
        var item = LineOf(request, orderRequestItemId);

        request.RemoveRevisionItem(item, actor, DateTime.UtcNow);
        Touch(request);
        await SaveAsync(cancellationToken);

        return new RevisionEditResultDto(orderRequestItemId, (await DescribeAsync(orderRequestId, cancellationToken))!);
    }

    /// <summary>
    /// Only a coordinator or an administrator corrects an order. The endpoints say so too; this is the same
    /// rule held where the work is done, so a missing attribute is not a way in.
    /// </summary>
    private WorkflowActor Reviser()
    {
        var actor = CurrentActor.Of(currentUser, "You must be signed in to correct an order.");

        return RevisionPermissions.MayRevise(currentUser)
            ? actor
            : throw new ForbiddenException("Correcting an order is for a coordinator or an administrator.");
    }

    /// <summary>
    /// The request, loaded as an edit needs it: its lines, their suppliers (the history names them) and the
    /// record that makes it a correction. A copy the caller read before somebody else's change is refused here,
    /// before anything is looked at.
    /// </summary>
    private async Task<OrderRequest> EditableAsync(long orderRequestId, Guid token, CancellationToken cancellationToken)
    {
        var request = await db.OrderRequests
            .Include(order => order.RevisedFrom)
            .Include(order => order.Items).ThenInclude(item => item.Supplier)
            .FirstOrDefaultAsync(order => order.Id == orderRequestId, cancellationToken)
            ?? throw new NotFoundException($"Order request #{orderRequestId} was not found.");

        if (!ConcurrencyToken.Matches(request.ConcurrencyStamp, token))
        {
            throw new ConflictException(
                "This order was changed by someone else since you opened it. Reload it and try again.");
        }

        return request;
    }

    private static OrderRequestItem LineOf(OrderRequest request, long orderRequestItemId) =>
        request.Items.FirstOrDefault(item => item.Id == orderRequestItemId)
        ?? throw new NotFoundException($"Order request #{request.Id} has no item #{orderRequestItemId}.");

    /// <summary>A catalog supplier. Text is never turned into a supplier here: that is what the import review is for.</summary>
    private async Task<Supplier> SupplierAsync(int supplierId, CancellationToken cancellationToken) =>
        await db.Suppliers.FirstOrDefaultAsync(supplier => supplier.Id == supplierId, cancellationToken)
        ?? throw new ValidationException($"Supplier #{supplierId} does not exist.");

    /// <summary>
    /// A change to a line is a change to the request. Touching the request's own row moves its row version, so
    /// a copy read before this change is stale everywhere — and a copy that went stale meanwhile fails here.
    /// </summary>
    private void Touch(OrderRequest request) =>
        db.ChangeTracker.Entries<OrderRequest>()
            .First(entry => ReferenceEquals(entry.Entity, request))
            .Property(order => order.UpdatedAtUtc).IsModified = true;

    private async Task SaveAsync(CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException(
                "This order was changed by someone else while you were editing it. Reload it and try again.");
        }
    }

    private Task<CreateRevisionResultDto?> ExistingRevisionAsync(long sourceOrderRequestId, CancellationToken cancellationToken) =>
        db.OrderRequestRevisions.AsNoTracking()
            .Where(revision => revision.SourceOrderRequestId == sourceOrderRequestId)
            .Select(revision => new CreateRevisionResultDto(
                revision.RevisionOrderRequestId,
                revision.RevisionOrderRequest.Version,
                revision.RevisionOrderRequest.Items.Count,
                revision.SourceOrderRequestId,
                revision.SourceOrderRequest.Version,
                true))
            .FirstOrDefaultAsync(cancellationToken);

    private async Task<OrderRevisionDto?> DescribeAsync(long orderRequestId, CancellationToken cancellationToken)
    {
        var header = await db.OrderRequests.AsNoTracking()
            .Where(request => request.Id == orderRequestId)
            .Select(request => new
            {
                request.Id,
                request.LocationId,
                LocationName = request.Location.Name,
                request.RequestPeriod,
                request.Version,
                request.Status,
                request.ConcurrencyStamp,
                ItemCount = request.Items.Count,
                MissingPrice = request.Items.Count(item => item.UnitPrice == null),
                KnownPrice = request.Items.Count(item => item.UnitPrice != null),
                KnownAmount = request.Items.Sum(item => (decimal?)(item.Quantity * item.UnitPrice)),
                HasNewerVersion = db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version),
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (header is null)
        {
            return null;
        }

        var revisedFrom = await db.OrderRequestRevisions.AsNoTracking()
            .Where(revision => revision.RevisionOrderRequestId == orderRequestId)
            .Select(revision => new RevisionLinkDto(
                revision.SourceOrderRequestId,
                revision.SourceOrderRequest.Version,
                revision.SourceOrderRequest.Status,
                revision.CreatedByUserId,
                revision.CreatedByDisplayName,
                revision.CreatedAtUtc))
            .FirstOrDefaultAsync(cancellationToken);

        var revisedInto = await db.OrderRequestRevisions.AsNoTracking()
            .Where(revision => revision.SourceOrderRequestId == orderRequestId)
            .Select(revision => new RevisionLinkDto(
                revision.RevisionOrderRequestId,
                revision.RevisionOrderRequest.Version,
                revision.RevisionOrderRequest.Status,
                revision.CreatedByUserId,
                revision.CreatedByDisplayName,
                revision.CreatedAtUtc))
            .FirstOrDefaultAsync(cancellationToken);

        var history = await db.OrderRequestEditEvents.AsNoTracking()
            .Where(editEvent => editEvent.OrderRequestId == orderRequestId)
            .OrderBy(editEvent => editEvent.OccurredAtUtc)
            .ThenBy(editEvent => editEvent.Id)
            .Select(editEvent => new
            {
                editEvent.Id,
                editEvent.Action,
                editEvent.OrderRequestItemId,
                editEvent.ProductVariantId,
                Product = db.ProductVariants
                    .Where(variant => variant.Id == editEvent.ProductVariantId)
                    .Select(variant => new { variant.Product.Code, variant.Product.Name })
                    .FirstOrDefault(),
                editEvent.Field,
                editEvent.OldValue,
                editEvent.NewValue,
                editEvent.ActorUserId,
                editEvent.ActorDisplayName,
                editEvent.OccurredAtUtc,
            })
            .ToListAsync(cancellationToken);

        return new OrderRevisionDto(
            header.Id,
            header.LocationId,
            header.LocationName,
            header.RequestPeriod,
            header.Version,
            header.Status,
            IsRevision: revisedFrom is not null,
            revisedFrom,
            revisedInto,
            IsLatestVersion: !header.HasNewerVersion,
            RevisionPermissions.CanCreate(header.Status, revisedInto is not null, !header.HasNewerVersion, currentUser),
            RevisionPermissions.CanEdit(header.Status, revisedFrom is not null, currentUser),
            ConcurrencyToken.Of(header.ConcurrencyStamp),
            header.ItemCount,
            header.MissingPrice,
            // Unknown money is not zero money: a request with nothing priced has no amount at all.
            header.KnownPrice == 0 ? null : header.KnownAmount,
            header.MissingPrice == 0,
            history.Select(entry => new OrderEditEventDto(
                entry.Id,
                entry.Action,
                entry.OrderRequestItemId,
                entry.ProductVariantId,
                entry.Product?.Code,
                entry.Product?.Name,
                entry.Field,
                Parse(entry.OldValue),
                Parse(entry.NewValue),
                entry.ActorUserId,
                entry.ActorDisplayName,
                entry.OccurredAtUtc)).ToList());
    }

    private static JsonElement? Parse(string? value)
    {
        if (value is null)
        {
            return null;
        }

        using var document = JsonDocument.Parse(value);
        return document.RootElement.Clone();
    }
}
