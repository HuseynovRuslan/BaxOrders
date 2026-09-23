using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Orders;
using BaxOrders.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Catalog;

/// <summary>
/// Giving products their canonical category: in bulk where the history leaves nothing to decide, and one at a
/// time where somebody has to decide.
/// </summary>
/// <remarks>
/// Nothing here touches the import history. A product's category is the catalog's current answer; the rows
/// that suggested it stay exactly as the workbook left them, and a screen showing where a line came from still
/// shows what Excel actually said rather than what the catalog later settled on.
/// <para>
/// The safe application recomputes the evidence itself every time it runs. A caller cannot hand it a list of
/// products to fill in, or a count to trust: it decides from the database, which is the only thing that can
/// still be true by the time the write happens.
/// </para>
/// </remarks>
public sealed class ProductCategoryService(IBaxOrdersDbContext db, ICurrentUserContext currentUser)
{
    /// <summary>
    /// Fills in every product that has no category and whose whole history names one and the same category.
    /// </summary>
    /// <remarks>
    /// Ambiguous, unevidenced and already-categorised products are left exactly as they are. Running it twice
    /// changes nothing the second time: the products it filled in are then assigned, and assigned products are
    /// never touched again by this.
    /// </remarks>
    public async Task<ApplySafeCategoriesResultDto> ApplySafeAsync(CancellationToken cancellationToken)
    {
        var actor = CurrentActor.Of(currentUser, "You must be signed in to assign product categories.");

        var evidence = await ProductCategoryEvidence.ReadAsync(db, cancellationToken);
        var products = await db.Products.ToListAsync(cancellationToken);

        // Categories are loaded once, because a safe application typically touches most of the catalog at once
        // and a per-product lookup would be a round trip each.
        var categories = await db.Categories.ToDictionaryAsync(category => category.Id, cancellationToken);

        var assigned = 0;
        var ambiguous = 0;
        var noEvidence = 0;
        var alreadyAssigned = 0;
        var utcNow = DateTime.UtcNow;

        foreach (var product in products)
        {
            var found = evidence.GetValueOrDefault(product.Id) ?? [];
            switch (ProductCategoryEvidence.StateOf(product.CategoryId, found))
            {
                case ProductCategoryState.Assigned:
                    alreadyAssigned++;
                    break;

                case ProductCategoryState.Ambiguous:
                    ambiguous++;
                    break;

                case ProductCategoryState.NoEvidence:
                    noEvidence++;
                    break;

                case ProductCategoryState.UniqueEvidence:
                    // The one category its history named. There is nothing here to choose between.
                    var category = categories[found[0].CategoryId];
                    db.ProductCategoryDecisions.Add(
                        ProductCategoryDecision.AutoAssign(product, category, actor, utcNow));
                    assigned++;
                    break;
            }
        }

        if (assigned > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        return new ApplySafeCategoriesResultDto(assigned, ambiguous, noEvidence, alreadyAssigned);
    }

    /// <summary>Records somebody's decision about one product's canonical category, and applies it.</summary>
    /// <exception cref="NotFoundException">No such product.</exception>
    /// <exception cref="ValidationException">No such category, or one the catalog no longer offers.</exception>
    public async Task<ProductCategoryDecisionDto> AssignAsync(
        long productId, AssignProductCategoryCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        var actor = CurrentActor.Of(currentUser, "You must be signed in to assign a product category.");

        var product = await db.Products.FirstOrDefaultAsync(item => item.Id == productId, cancellationToken)
            ?? throw new NotFoundException($"Product #{productId} was not found.");

        var category = await db.Categories.FirstOrDefaultAsync(item => item.Id == command.CategoryId, cancellationToken)
            ?? throw new ValidationException($"Category #{command.CategoryId} was not found.");

        if (!category.IsActive)
        {
            throw new ValidationException($"Category '{category.Name}' is no longer in use and cannot be assigned.");
        }

        // The domain refuses a decision that changes nothing, and records what the category was before.
        var decision = ProductCategoryDecision.Assign(product, category, actor, command.Reason, DateTime.UtcNow);
        db.ProductCategoryDecisions.Add(decision);
        await db.SaveChangesAsync(cancellationToken);

        var paths = await ProductCategoryEvidence.PathsAsync(db, cancellationToken);

        return new ProductCategoryDecisionDto(
            decision.Id,
            decision.ProductId,
            decision.PreviousCategoryId,
            decision.NewCategoryId,
            paths.GetValueOrDefault(decision.NewCategoryId) ?? [],
            decision.DecisionType,
            decision.ActorUserId,
            decision.ActorDisplayName,
            decision.Reason,
            decision.OccurredAtUtc);
    }
}
