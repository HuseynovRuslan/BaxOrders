using BaxOrders.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Catalog;

/// <summary>One category a product's imported history named, and how many rows named it.</summary>
internal sealed record CategoryEvidenceEntry(int CategoryId, int Occurrences);

/// <summary>
/// What counts as evidence for a product's canonical category, and what that evidence means.
/// </summary>
/// <remarks>
/// Evidence is the category the import review resolved for a row that actually became a permanent order line.
/// Nothing else qualifies: not the product's name, not a similar product, not the supplier, not a guess. A row
/// that was excluded, or that belongs to a batch nobody confirmed, never became history and so never speaks
/// for the catalog.
/// <para>
/// This is the one place the rule is written. The screen that shows the evidence and the action that applies
/// it both read it from here, so the preview a person is shown cannot mean something different from the
/// decision the server then makes.
/// </para>
/// </remarks>
internal static class ProductCategoryEvidence
{
    /// <summary>
    /// Every product's evidence, most-seen category first, in one query over the materialized import history.
    /// </summary>
    public static async Task<Dictionary<long, List<CategoryEvidenceEntry>>> ReadAsync(
        IBaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);

        var grouped = await db.ImportRowMaterializations.AsNoTracking()
            .Where(link => link.ImportRow.MatchedProductId != null && link.ImportRow.MatchedCategoryId != null)
            .GroupBy(link => new
            {
                ProductId = link.ImportRow.MatchedProductId!.Value,
                CategoryId = link.ImportRow.MatchedCategoryId!.Value,
            })
            .Select(group => new
            {
                group.Key.ProductId,
                group.Key.CategoryId,
                Occurrences = group.Count(),
            })
            .ToListAsync(cancellationToken);

        return grouped
            .GroupBy(entry => entry.ProductId)
            .ToDictionary(
                product => product.Key,
                product => product
                    .OrderByDescending(entry => entry.Occurrences)
                    .ThenBy(entry => entry.CategoryId)
                    .Select(entry => new CategoryEvidenceEntry(entry.CategoryId, entry.Occurrences))
                    .ToList());
    }

    /// <summary>
    /// Where a product stands: what it carries now, weighed against what its history says.
    /// </summary>
    /// <remarks>
    /// A product that already carries a category is <see cref="ProductCategoryState.Assigned"/> whatever its
    /// history says — the catalog's answer is a decision somebody made, and history does not overrule it.
    /// </remarks>
    public static ProductCategoryState StateOf(int? currentCategoryId, IReadOnlyList<CategoryEvidenceEntry> evidence)
    {
        ArgumentNullException.ThrowIfNull(evidence);

        if (currentCategoryId is not null)
        {
            return ProductCategoryState.Assigned;
        }

        return evidence.Count switch
        {
            0 => ProductCategoryState.NoEvidence,
            1 => ProductCategoryState.UniqueEvidence,
            _ => ProductCategoryState.Ambiguous,
        };
    }

    /// <summary>
    /// Resolves whole category paths in one query: the tree is small and is never walked row by row.
    /// </summary>
    public static async Task<Dictionary<int, IReadOnlyList<string>>> PathsAsync(
        IBaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);

        var all = await db.Categories.AsNoTracking()
            .Select(category => new { category.Id, category.Name, category.ParentId })
            .ToDictionaryAsync(category => category.Id, cancellationToken);

        var paths = new Dictionary<int, IReadOnlyList<string>>(all.Count);
        foreach (var id in all.Keys)
        {
            var names = new List<string>();
            var current = all.GetValueOrDefault(id);
            while (current is not null)
            {
                names.Insert(0, current.Name);
                current = current.ParentId is { } parentId ? all.GetValueOrDefault(parentId) : null;
            }

            paths[id] = names;
        }

        return paths;
    }
}
