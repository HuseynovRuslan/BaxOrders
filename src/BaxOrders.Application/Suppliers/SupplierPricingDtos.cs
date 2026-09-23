using BaxOrders.Domain.Suppliers;

namespace BaxOrders.Application.Suppliers;

/// <summary>
/// One supplier, with the facts somebody needs before changing what its lines require.
/// </summary>
/// <param name="UnpricedItemCount">
/// Lines of this supplier that carry no price. Under <see cref="SupplierPriceRequirement.Required"/> these are
/// prices somebody owes; under <see cref="SupplierPriceRequirement.NotRequired"/> they are complete as they
/// stand. The figure does not move when the policy does — only its meaning does, which is exactly what the
/// person making the change needs to see.
/// </param>
public sealed record SupplierListItemDto(
    int SupplierId,
    string? Code,
    string Name,
    bool IsActive,
    SupplierPriceRequirement PriceRequirement,
    int OrderLineCount,
    int UnpricedItemCount,
    int OrderCount);

public sealed record SupplierListDto(
    IReadOnlyList<SupplierListItemDto> Suppliers,
    int SupplierCount,
    int PriceNotRequiredCount);

/// <summary>One recorded decision about a supplier's price requirement.</summary>
public sealed record SupplierPricingDecisionDto(
    long Id,
    int SupplierId,
    SupplierPriceRequirement PreviousRequirement,
    SupplierPriceRequirement NewRequirement,
    Guid ActorUserId,
    string ActorDisplayName,
    string? Reason,
    DateTime OccurredAtUtc);

/// <param name="Reason">Why, in the decider's own words. Optional, and kept verbatim.</param>
public sealed record ChangeSupplierPriceRequirementCommand(
    SupplierPriceRequirement PriceRequirement,
    string? Reason = null);

/// <param name="Changed">False when the supplier already said this, so nothing was written.</param>
public sealed record ChangeSupplierPriceRequirementResultDto(
    int SupplierId,
    string Name,
    SupplierPriceRequirement PriceRequirement,
    bool Changed,
    SupplierPricingDecisionDto? Decision);

public sealed record SupplierListQuery(string? Search = null, bool IncludeInactive = false);
