using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Imports;
using BaxOrders.Application.Orders;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Suppliers;

/// <summary>
/// Reading the supplier catalogue, and recording who decided that a supplier's lines need a purchase price.
/// </summary>
/// <remarks>
/// There is one write here and it is deliberately narrow. It does not create suppliers, rename them or
/// deactivate them; it changes one property whose effect reaches the whole system, and writes down who did it.
/// <para>
/// Nothing infers the policy. A supplier called "Anbar" is bought from; the company's own store is called
/// "Qala baza". Only a person can tell those apart, so only a person sets this.
/// </para>
/// </remarks>
public sealed class SupplierPricingService(IBaxOrdersDbContext db, ICurrentUserContext currentUser)
{
    /// <summary>
    /// The catalogue with what each supplier's lines require, and how much history that covers.
    /// </summary>
    /// <remarks>Two queries whatever the size of the catalogue: the suppliers, then their line counts.</remarks>
    public async Task<SupplierListDto> ListAsync(SupplierListQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        var suppliers = db.Suppliers.AsNoTracking();
        if (!query.IncludeInactive)
        {
            suppliers = suppliers.Where(supplier => supplier.IsActive);
        }

        if (Search.Of(query.Search) is { } needle)
        {
            suppliers = suppliers.Where(supplier =>
                supplier.NormalizedName.Contains(needle) || (supplier.Code != null && supplier.Code.ToLower().Contains(needle)));
        }

        var rows = await suppliers
            .OrderBy(supplier => supplier.Name)
            .Select(supplier => new
            {
                supplier.Id,
                supplier.Code,
                supplier.Name,
                supplier.IsActive,
                supplier.PriceRequirement,
            })
            .ToListAsync(cancellationToken);

        var ids = rows.Select(row => row.Id).ToArray();
        var counts = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.SupplierId != null && ids.Contains(item.SupplierId.Value))
            .GroupBy(item => item.SupplierId!.Value)
            .Select(group => new
            {
                SupplierId = group.Key,
                OrderLineCount = group.Count(),
                UnpricedItemCount = group.Count(item => item.UnitPrice == null),
                OrderCount = group.Select(item => item.OrderRequestId).Distinct().Count(),
            })
            .ToDictionaryAsync(row => row.SupplierId, cancellationToken);

        var items = rows
            .Select(row =>
            {
                var found = counts.GetValueOrDefault(row.Id);
                return new SupplierListItemDto(
                    row.Id, row.Code, row.Name, row.IsActive, row.PriceRequirement,
                    found?.OrderLineCount ?? 0, found?.UnpricedItemCount ?? 0, found?.OrderCount ?? 0);
            })
            .ToList();

        return new SupplierListDto(
            items,
            items.Count,
            items.Count(item => item.PriceRequirement == SupplierPriceRequirement.NotRequired));
    }

    /// <summary>
    /// Records that a supplier's lines do, or do not, need a purchase price.
    /// </summary>
    /// <remarks>
    /// This changes what the whole system calls a missing price — every warning, every count, and whether an
    /// approver is asked to acknowledge anything. It touches no order line: the prices already recorded stay
    /// exactly as they are, and the ones that are absent stay absent. Only their meaning moves.
    /// </remarks>
    public async Task<ChangeSupplierPriceRequirementResultDto> ChangePriceRequirementAsync(
        int supplierId, ChangeSupplierPriceRequirementCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        if (!Enum.IsDefined(command.PriceRequirement))
        {
            throw new ValidationException(
                $"'{nameof(command.PriceRequirement)}' must be one of: "
                + $"{string.Join(", ", Enum.GetNames<SupplierPriceRequirement>())}.");
        }

        var actor = CurrentActor.Of(currentUser, "You must be signed in to change a supplier's pricing policy.");

        var supplier = await db.Suppliers.FirstOrDefaultAsync(row => row.Id == supplierId, cancellationToken)
            ?? throw new NotFoundException($"Supplier #{supplierId} was not found.");

        var decision = SupplierPricingDecision.Change(
            supplier, command.PriceRequirement, actor, command.Reason, DateTime.UtcNow);

        if (decision is null)
        {
            // It already said this. Nothing changed, so nothing is written and no audit row is invented.
            return new ChangeSupplierPriceRequirementResultDto(
                supplier.Id, supplier.Name, supplier.PriceRequirement, false, null);
        }

        db.SupplierPricingDecisions.Add(decision);
        await db.SaveChangesAsync(cancellationToken);

        return new ChangeSupplierPriceRequirementResultDto(
            supplier.Id, supplier.Name, supplier.PriceRequirement, true, Describe(decision));
    }

    /// <summary>One supplier's recorded decisions, newest first.</summary>
    public async Task<IReadOnlyList<SupplierPricingDecisionDto>> DecisionsAsync(
        int supplierId, CancellationToken cancellationToken) =>
        await db.SupplierPricingDecisions.AsNoTracking()
            .Where(decision => decision.SupplierId == supplierId)
            .OrderByDescending(decision => decision.OccurredAtUtc)
            .Select(decision => new SupplierPricingDecisionDto(
                decision.Id,
                decision.SupplierId,
                decision.PreviousRequirement,
                decision.NewRequirement,
                decision.ActorUserId,
                decision.ActorDisplayName,
                decision.Reason,
                decision.OccurredAtUtc))
            .ToListAsync(cancellationToken);

    private static SupplierPricingDecisionDto Describe(SupplierPricingDecision decision) =>
        new(decision.Id, decision.SupplierId, decision.PreviousRequirement, decision.NewRequirement,
            decision.ActorUserId, decision.ActorDisplayName, decision.Reason, decision.OccurredAtUtc);
}
