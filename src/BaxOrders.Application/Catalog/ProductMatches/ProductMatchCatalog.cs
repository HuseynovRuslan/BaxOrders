using BaxOrders.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Catalog.ProductMatches;

/// <summary>Where something was ordered: how many lines, at how many locations, from which month to which.</summary>
public sealed record MatchUsage(int LineCount, int LocationCount, DateOnly FirstMonth, DateOnly LastMonth);

/// <summary>One variant that has order lines, with what a person needs to recognise it.</summary>
public sealed record MatchVariantFacts(
    long VariantId,
    long ProductId,
    string ProductCode,
    string ProductName,
    string? SpecificationValue,
    string? SpecificationUnitCode,
    string? SpecificationDescriptor,
    string? ModelCode,
    string? OrderUnitCode,
    MatchUsage Usage);

/// <summary>
/// Everything the suggestion rules and the screens showing them read, in one place.
/// </summary>
/// <param name="Variants">Every variant with at least one line in the versions every screen reads.</param>
/// <param name="ProductUsage">The same, per product: its lines, locations and months across all its variants.</param>
/// <param name="Live">Every decision not undone. Empty when decisions were not read.</param>
public sealed record ProductMatchCatalog(
    IReadOnlyDictionary<long, MatchVariantFacts> Variants,
    IReadOnlyDictionary<long, MatchUsage> ProductUsage,
    IReadOnlyList<LiveMatchDecision> Live)
{
    /// <summary>The rules' view of the variants.</summary>
    public IReadOnlyList<MatchVariant> RuleInput =>
    [
        .. Variants.Values.Select(variant => new MatchVariant(
            variant.VariantId,
            variant.ProductId,
            variant.ProductName,
            variant.SpecificationValue,
            variant.SpecificationUnitCode,
            variant.SpecificationDescriptor,
            variant.ModelCode,
            variant.OrderUnitCode,
            variant.Usage.LineCount)),
    ];

    /// <summary>The suggestions as they stand right now.</summary>
    public ProductMatchSuggestionSet Suggestions() => ProductMatchSuggestions.Compute(RuleInput.ToList(), Live);

    /// <summary>
    /// Reads the catalogue facts. Three queries: the lines of the versions every screen reads, grouped by variant,
    /// location and month; the variants those lines are on; and the live decisions.
    /// </summary>
    /// <param name="readDecisions">
    /// False only for the migration tool's inspection, which runs before the decisions table exists.
    /// </param>
    public static async Task<ProductMatchCatalog> ReadAsync(
        IBaxOrdersDbContext db, bool readDecisions, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);

        // The highest version of each location and month — the one every analytics screen reads. An earlier version
        // is history, and a variant that only lives there is not something any screen still shows.
        var usage = await db.OrderRequestItems.AsNoTracking()
            .Where(item => !db.OrderRequests.Any(other =>
                other.LocationId == item.OrderRequest.LocationId
                && other.RequestPeriod == item.OrderRequest.RequestPeriod
                && other.Version > item.OrderRequest.Version))
            .GroupBy(item => new { item.ProductVariantId, item.OrderRequest.LocationId, item.OrderRequest.RequestPeriod })
            .Select(group => new UsageRow(group.Key.ProductVariantId, group.Key.LocationId, group.Key.RequestPeriod, group.Count()))
            .ToListAsync(cancellationToken);

        var variantIds = usage.Select(row => row.VariantId).Distinct().ToArray();

        var variants = await db.ProductVariants.AsNoTracking()
            .Where(variant => variantIds.Contains(variant.Id))
            .Select(variant => new
            {
                variant.Id,
                variant.ProductId,
                ProductCode = variant.Product.Code,
                ProductName = variant.Product.Name,
                variant.SpecificationValue,
                SpecificationUnitCode = variant.SpecificationUnit != null ? variant.SpecificationUnit.Code : null,
                variant.SpecificationDescriptor,
                variant.ModelCode,
                OrderUnitCode = variant.OrderUnit != null ? variant.OrderUnit.Code : null,
            })
            .ToListAsync(cancellationToken);

        var byVariant = usage.ToLookup(row => row.VariantId);
        var facts = variants.ToDictionary(
            variant => variant.Id,
            variant => new MatchVariantFacts(
                variant.Id,
                variant.ProductId,
                variant.ProductCode,
                variant.ProductName,
                variant.SpecificationValue,
                variant.SpecificationUnitCode,
                variant.SpecificationDescriptor,
                variant.ModelCode,
                variant.OrderUnitCode,
                UsageOf(byVariant[variant.Id])));

        var productOf = variants.ToDictionary(variant => variant.Id, variant => variant.ProductId);
        var productUsage = usage
            .Where(row => productOf.ContainsKey(row.VariantId))
            .GroupBy(row => productOf[row.VariantId])
            .ToDictionary(group => group.Key, group => UsageOf(group));

        IReadOnlyList<LiveMatchDecision> live = readDecisions
            ? await db.ProductMatchDecisions.AsNoTracking()
                .Where(decision => decision.UndoneAtUtc == null)
                .Select(decision => new LiveMatchDecision(
                    decision.Kind,
                    decision.Outcome,
                    decision.SourceVariantId,
                    decision.TargetVariantId,
                    decision.SourceProductId,
                    decision.TargetProductId))
                .ToListAsync(cancellationToken)
            : [];

        return new ProductMatchCatalog(facts, productUsage, live);
    }

    private static MatchUsage UsageOf(IEnumerable<UsageRow> rows)
    {
        var list = rows.ToList();
        return new MatchUsage(
            list.Sum(row => row.Lines),
            list.Select(row => row.LocationId).Distinct().Count(),
            list.Min(row => row.Period),
            list.Max(row => row.Period));
    }

    private sealed record UsageRow(long VariantId, int LocationId, DateOnly Period, int Lines);
}
