using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Imports;
using BaxOrders.Application.Orders;
using BaxOrders.Domain.Normalization;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Catalog;

/// <summary>
/// Which products have a canonical category, which could safely be given one, and which nobody can give one
/// to without deciding.
/// </summary>
/// <remarks>
/// Read-only. The evidence behind every row is the import history as it stands — this never writes to it,
/// never reinterprets it, and never proposes a category the history did not itself name.
/// <para>
/// Three queries answer the whole screen however many products there are: the evidence, the products and the
/// category tree. Filtering, sorting and paging then happen over that materialized set, the same way the
/// management dashboard and the approval inbox work, because the catalog is bounded by what the company
/// actually buys and the summary has to describe all of it whatever the current filter shows.
/// </para>
/// </remarks>
public sealed class ProductCategoryQueries(IBaxOrdersDbContext db)
{
    public const int DefaultPageSize = 25;
    public const int MaxPageSize = 100;

    /// <summary>The whole catalog's standing. Also the preview of what a safe application would do.</summary>
    public async Task<ProductCategorySummaryDto> GetSummaryAsync(CancellationToken cancellationToken)
    {
        var rows = await DescribeAsync(cancellationToken);
        return Summarize(rows);
    }

    public async Task<ProductCategoryListDto> GetAsync(ProductCategoryQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        if (!Enum.IsDefined(query.Filter))
        {
            throw new ValidationException(
                $"'filter' must be one of: {string.Join(", ", Enum.GetNames<ProductCategoryFilter>())}.");
        }

        var described = await DescribeAsync(cancellationToken);
        var summary = Summarize(described);

        var filtered = Filter(described, query);
        var (page, pageSize) = PageOf(query.Page, query.PageSize);
        var pageRows = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return new ProductCategoryListDto(
            summary,
            filtered.Count,
            new PagedResult<ProductCategoryRowDto>(pageRows, page, pageSize, filtered.Count));
    }

    /// <summary>Every decision ever made about one product's category, newest first.</summary>
    public async Task<IReadOnlyList<ProductCategoryDecisionDto>> GetDecisionsAsync(
        long productId, CancellationToken cancellationToken)
    {
        var paths = await ProductCategoryEvidence.PathsAsync(db, cancellationToken);

        var decisions = await db.ProductCategoryDecisions.AsNoTracking()
            .Where(decision => decision.ProductId == productId)
            .OrderByDescending(decision => decision.OccurredAtUtc)
            .ThenByDescending(decision => decision.Id)
            .ToListAsync(cancellationToken);

        return [.. decisions.Select(decision => new ProductCategoryDecisionDto(
            decision.Id,
            decision.ProductId,
            decision.PreviousCategoryId,
            decision.NewCategoryId,
            paths.GetValueOrDefault(decision.NewCategoryId) ?? [],
            decision.DecisionType,
            decision.ActorUserId,
            decision.ActorDisplayName,
            decision.Reason,
            decision.OccurredAtUtc))];
    }

    /// <summary>Every product with its current category and its evidence, ordered by name.</summary>
    private async Task<List<ProductCategoryRowDto>> DescribeAsync(CancellationToken cancellationToken)
    {
        var evidence = await ProductCategoryEvidence.ReadAsync(db, cancellationToken);
        var paths = await ProductCategoryEvidence.PathsAsync(db, cancellationToken);

        var products = await db.Products.AsNoTracking()
            .Select(product => new
            {
                product.Id,
                product.Code,
                product.Name,
                product.CategoryId,
            })
            .ToListAsync(cancellationToken);

        return [.. products
            .Select(product =>
            {
                var found = evidence.GetValueOrDefault(product.Id) ?? [];
                return new ProductCategoryRowDto(
                    product.Id,
                    product.Code,
                    product.Name,
                    product.CategoryId,
                    product.CategoryId is { } current ? paths.GetValueOrDefault(current) ?? [] : [],
                    ProductCategoryEvidence.StateOf(product.CategoryId, found),
                    [.. found.Select(entry => new ProductCategoryEvidenceDto(
                        entry.CategoryId,
                        paths.GetValueOrDefault(entry.CategoryId) ?? [],
                        entry.Occurrences))]);
            })
            .OrderBy(row => row.ProductName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(row => row.ProductCode, StringComparer.Ordinal)];
    }

    private static ProductCategorySummaryDto Summarize(IReadOnlyList<ProductCategoryRowDto> rows) => new(
        TotalProductCount: rows.Count,
        AssignedCount: rows.Count(row => row.State == ProductCategoryState.Assigned),
        UniqueEvidenceCount: rows.Count(row => row.State == ProductCategoryState.UniqueEvidence),
        AmbiguousCount: rows.Count(row => row.State == ProductCategoryState.Ambiguous),
        NoEvidenceCount: rows.Count(row => row.State == ProductCategoryState.NoEvidence));

    private static List<ProductCategoryRowDto> Filter(List<ProductCategoryRowDto> rows, ProductCategoryQuery query)
    {
        IEnumerable<ProductCategoryRowDto> filtered = rows;

        if (Search.Of(query.Search) is { } needle)
        {
            filtered = filtered.Where(row =>
                TextNormalizer.Normalize(row.ProductName).Contains(needle, StringComparison.Ordinal)
                || TextNormalizer.Normalize(row.ProductCode).Contains(needle, StringComparison.Ordinal));
        }

        filtered = query.Filter switch
        {
            ProductCategoryFilter.Assigned => filtered.Where(row => row.State == ProductCategoryState.Assigned),
            ProductCategoryFilter.UniqueEvidence => filtered.Where(row => row.State == ProductCategoryState.UniqueEvidence),
            ProductCategoryFilter.Ambiguous => filtered.Where(row => row.State == ProductCategoryState.Ambiguous),
            ProductCategoryFilter.NoEvidence => filtered.Where(row => row.State == ProductCategoryState.NoEvidence),
            _ => filtered,
        };

        return [.. filtered];
    }

    private static (int Page, int PageSize) PageOf(int page, int pageSize) =>
        (Math.Max(1, page), pageSize <= 0 ? DefaultPageSize : Math.Min(pageSize, MaxPageSize));
}
