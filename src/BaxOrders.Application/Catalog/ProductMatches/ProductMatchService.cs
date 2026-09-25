using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Orders;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Catalog.ProductMatches;

/// <summary>
/// An administrator's decisions about suggested product matches: approving one, rejecting one, and taking either
/// back. The only writer of <see cref="ProductMatchDecision"/>s there is.
/// </summary>
/// <remarks>
/// <para>
/// <b>Who.</b> Only a role holding <see cref="ProductMatchAuthority"/> (13.2). The endpoint policy asks the same
/// question, but a service reached from anywhere else refuses on its own, before it reads anything.
/// </para>
/// <para>
/// <b>What.</b> Only a pair the rules suggest right now can be approved or rejected. The suggestions are worked out
/// again inside the transaction, so a pair nobody was shown — or one that stopped being a suggestion while a screen
/// was open — is refused. For a spelling match the administrator chooses which of the two names is kept; for a
/// variant link the direction is the suggestion's.
/// </para>
/// <para>
/// <b>Nothing else.</b> Each write is one row in <c>ProductMatchDecisions</c>. No product, variant, alias, order or
/// line is changed, so approving changes no amount anywhere, and undoing puts everything exactly back.
/// </para>
/// <para>
/// Every write holds one application-wide lock for its transaction, so two administrators cannot, between them,
/// fold a variant into one that is itself being folded elsewhere.
/// </para>
/// </remarks>
public sealed class ProductMatchService(
    IBaxOrdersDbContext db, ICurrentUserContext currentUser, IProductMatchLock matchLock)
{
    /// <exception cref="ForbiddenException">The caller does not hold <see cref="ProductMatchAuthority"/>.</exception>
    /// <exception cref="NotFoundException">No such product or variant.</exception>
    /// <exception cref="DomainException">
    /// Not a current suggestion, a chain, a second base, different order units, or a label that is too long.
    /// </exception>
    /// <exception cref="ConflictException">Somebody decided the same pair at the same moment.</exception>
    public Task<ProductMatchDecisionDto> ApproveAsync(ApproveProductMatchCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        EnsureAuthority();
        var kind = Known(command.Kind);

        return DecideAsync(async (suggestions, live, actor, utcNow) => kind == ProductMatchKind.SameItem
                ? await ApproveSameItemAsync(command, suggestions, live, actor, utcNow, cancellationToken)
                : await ApproveVariantAsync(command, suggestions, live, actor, utcNow, cancellationToken),
            cancellationToken);
    }

    /// <exception cref="ForbiddenException">The caller does not hold <see cref="ProductMatchAuthority"/>.</exception>
    /// <exception cref="NotFoundException">No such product or variant.</exception>
    /// <exception cref="DomainException">Not a current suggestion.</exception>
    public Task<ProductMatchDecisionDto> RejectAsync(RejectProductMatchCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        EnsureAuthority();
        var kind = Known(command.Kind);

        return DecideAsync(async (suggestions, _, actor, utcNow) =>
            {
                if (kind == ProductMatchKind.SameItem)
                {
                    var (source, target) = await VariantsAsync(command.SourceId, command.TargetId, cancellationToken);
                    EnsureSuggested(suggestions.SameItemPair(source.Id, target.Id) is not null, kind);
                    return ProductMatchDecision.RejectSameItem(source, target, actor, command.Reason, utcNow);
                }

                var (variant, baseProduct) = await ProductsAsync(command.SourceId, command.TargetId, cancellationToken);
                EnsureSuggested(suggestions.VariantLink(variant.Id, baseProduct.Id) is not null, kind);
                return ProductMatchDecision.RejectVariant(variant, baseProduct, actor, command.Reason, utcNow);
            },
            cancellationToken);
    }

    /// <summary>
    /// Takes a decision back. The row stays, with who undid it and when, and the pair is suggested again if the rules
    /// still find it. Nothing else changes.
    /// </summary>
    /// <exception cref="ForbiddenException">The caller does not hold <see cref="ProductMatchAuthority"/>.</exception>
    /// <exception cref="NotFoundException">No such decision.</exception>
    /// <exception cref="ConflictException">The decision has already been undone.</exception>
    public async Task<ProductMatchDecisionDto> UndoAsync(
        long decisionId, UndoProductMatchCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);
        EnsureAuthority();
        var actor = Actor();

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await matchLock.AcquireAsync(cancellationToken);

        var decision = await db.ProductMatchDecisions.FirstOrDefaultAsync(item => item.Id == decisionId, cancellationToken)
            ?? throw new NotFoundException($"Product match decision #{decisionId} was not found.");

        if (!decision.IsLive)
        {
            throw new ConflictException(
                $"Product match decision #{decisionId} was already undone by {decision.UndoneByDisplayName}.");
        }

        decision.Undo(actor, command.Reason, DateTime.UtcNow);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return (await ProductMatchQueries.DescribeAsync(db, [decision], cancellationToken))[0];
    }

    // ---- approving ------------------------------------------------------------------------------------------

    private async Task<ProductMatchDecision> ApproveSameItemAsync(
        ApproveProductMatchCommand command,
        ProductMatchSuggestionSet suggestions,
        IReadOnlyList<LiveMatchDecision> live,
        WorkflowActor actor,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var (source, target) = await VariantsAsync(command.SourceId, command.TargetId, cancellationToken);

        // The domain speaks first: a variant with itself, or two different order units, is never one item.
        var decision = ProductMatchDecision.ApproveSameItem(source, target, actor, command.Reason, utcNow);

        var approved = live
            .Where(item => item.Kind == ProductMatchKind.SameItem && item.Outcome == ProductMatchOutcome.Approved)
            .ToList();

        if (approved.Any(item => item.SourceVariantId == source.Id))
        {
            throw new DomainException(
                "This variant is already approved as the same item as another one. Undo that decision before choosing a different one.");
        }

        if (approved.Any(item => item.TargetVariantId == source.Id))
        {
            throw new DomainException(
                "Other variants already count as this one, so it cannot itself count as another: that would make a chain. Keep this name instead.");
        }

        if (approved.Any(item => item.SourceVariantId == target.Id))
        {
            throw new DomainException(
                "The variant whose name would be kept already counts as another variant itself: that would make a chain. Choose that other variant instead.");
        }

        EnsureSuggested(suggestions.SameItemPair(source.Id, target.Id) is not null, ProductMatchKind.SameItem);
        return decision;
    }

    private async Task<ProductMatchDecision> ApproveVariantAsync(
        ApproveProductMatchCommand command,
        ProductMatchSuggestionSet suggestions,
        IReadOnlyList<LiveMatchDecision> live,
        WorkflowActor actor,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var (variant, baseProduct) = await ProductsAsync(command.SourceId, command.TargetId, cancellationToken);

        var approved = live
            .Where(item => item.Kind == ProductMatchKind.Variant && item.Outcome == ProductMatchOutcome.Approved)
            .ToList();

        if (approved.Any(item => item.SourceProductId == variant.Id))
        {
            throw new DomainException(
                $"'{variant.Name}' is already a variant of another product. Undo that decision before choosing a different base.");
        }

        if (approved.Any(item => item.TargetProductId == variant.Id))
        {
            throw new DomainException(
                $"'{variant.Name}' is already the base of other variants, so it cannot itself be a variant: one level only.");
        }

        if (approved.Any(item => item.SourceProductId == baseProduct.Id))
        {
            throw new DomainException(
                $"'{baseProduct.Name}' is itself a variant of another product, so it cannot be a base: one level only.");
        }

        var suggestion = suggestions.VariantLink(variant.Id, baseProduct.Id);
        EnsureSuggested(suggestion is not null, ProductMatchKind.Variant);

        // The administrator may name the variant differently; otherwise it is what the rest of its name says.
        var label = string.IsNullOrWhiteSpace(command.VariantLabel) ? suggestion!.ProposedLabel : command.VariantLabel;
        return ProductMatchDecision.ApproveVariant(variant, baseProduct, label, actor, command.Reason, utcNow);
    }

    // ---- shared ---------------------------------------------------------------------------------------------

    /// <summary>
    /// Lock, work out the suggestions as they stand now, let the caller decide, write the one row — or nothing.
    /// </summary>
    private async Task<ProductMatchDecisionDto> DecideAsync(
        Func<ProductMatchSuggestionSet, IReadOnlyList<LiveMatchDecision>, WorkflowActor, DateTime, Task<ProductMatchDecision>> decide,
        CancellationToken cancellationToken)
    {
        var actor = Actor();

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await matchLock.AcquireAsync(cancellationToken);

        var catalog = await ProductMatchCatalog.ReadAsync(db, readDecisions: true, cancellationToken);
        var decision = await decide(catalog.Suggestions(), catalog.Live, actor, DateTime.UtcNow);

        db.ProductMatchDecisions.Add(decision);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Only a unique index can say this, and only if somebody got in first despite the lock.
            throw new ConflictException(
                "This pair was decided by somebody else at the same moment. Reload the suggestions and try again.");
        }

        await transaction.CommitAsync(cancellationToken);
        return (await ProductMatchQueries.DescribeAsync(db, [decision], cancellationToken))[0];
    }

    private async Task<(ProductVariant Source, ProductVariant Target)> VariantsAsync(
        long sourceId, long targetId, CancellationToken cancellationToken)
    {
        var found = await db.ProductVariants.AsNoTracking()
            .Where(variant => variant.Id == sourceId || variant.Id == targetId)
            .ToDictionaryAsync(variant => variant.Id, cancellationToken);

        return (
            found.GetValueOrDefault(sourceId) ?? throw new NotFoundException($"Product variant #{sourceId} was not found."),
            found.GetValueOrDefault(targetId) ?? throw new NotFoundException($"Product variant #{targetId} was not found."));
    }

    private async Task<(Product Variant, Product Base)> ProductsAsync(
        long variantId, long baseId, CancellationToken cancellationToken)
    {
        var found = await db.Products.AsNoTracking()
            .Where(product => product.Id == variantId || product.Id == baseId)
            .ToDictionaryAsync(product => product.Id, cancellationToken);

        return (
            found.GetValueOrDefault(variantId) ?? throw new NotFoundException($"Product #{variantId} was not found."),
            found.GetValueOrDefault(baseId) ?? throw new NotFoundException($"Product #{baseId} was not found."));
    }

    /// <summary>The guard against a match nobody was shown.</summary>
    private static void EnsureSuggested(bool suggested, ProductMatchKind kind)
    {
        if (!suggested)
        {
            throw new DomainException(kind == ProductMatchKind.SameItem
                ? "These two variants are not a current spelling-match suggestion, so they cannot be decided. Only a pair the system suggests right now can be approved or rejected."
                : "This pair is not a current variant suggestion in this direction, so it cannot be decided. Only a pair the system suggests right now can be approved or rejected.");
        }
    }

    private static ProductMatchKind Known(ProductMatchKind kind) =>
        Enum.IsDefined(kind)
            ? kind
            : throw new ValidationException(
                $"'kind' must be one of: {string.Join(", ", Enum.GetNames<ProductMatchKind>())}.");

    /// <summary>The person deciding, from the session and from nowhere else.</summary>
    private WorkflowActor Actor() =>
        CurrentActor.Of(currentUser, "You must be signed in to decide on a product match.");

    /// <summary>13.2: only a role holding the authority decides. Checked before anything is read.</summary>
    private void EnsureAuthority()
    {
        if (!ProductMatchAuthority.IsHeldBy(currentUser.Role))
        {
            throw new ForbiddenException(
                "Only an administrator may approve or reject a product match, or undo one.");
        }
    }
}
