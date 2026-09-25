using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Imports;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Application.Orders;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Normalization;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Catalog.ProductMatches;

/// <summary>
/// The product matches the rules suggest, and every decision anybody has made about one.
/// </summary>
/// <remarks>
/// Read-only, and open to everybody signed in, like the rest of the catalogue: who sees the screen is the menu's
/// question, not this one's. Reading suggestions writes nothing — no decision, no alias, no product change — however
/// often it is done.
/// <para>
/// The suggestions are worked out from the whole catalogue on every read, the same way the category screen works:
/// three queries, then the rules in memory. The catalogue is bounded by what the company actually buys, and a
/// suggestion that was true a minute ago and is not any more must not be offered.
/// </para>
/// </remarks>
public sealed class ProductMatchQueries(IBaxOrdersDbContext db)
{
    public const int DefaultPageSize = 50;
    public const int MaxPageSize = 200;

    /// <summary>The suggestions of one kind, and how many of each kind there are.</summary>
    /// <exception cref="ValidationException">The kind is not one this API knows.</exception>
    public async Task<ProductMatchSuggestionListDto> GetSuggestionsAsync(
        ProductMatchSuggestionQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        EnsureKnown(query.Kind);

        var catalog = await ProductMatchCatalog.ReadAsync(db, readDecisions: true, cancellationToken);
        var all = Describe(catalog, catalog.Suggestions());

        IEnumerable<ProductMatchSuggestionDto> ofKind = all.Where(suggestion => suggestion.Kind == query.Kind);
        if (Search.Of(query.Search) is { } needle)
        {
            ofKind = ofKind.Where(suggestion =>
                TextNormalizer.Normalize(suggestion.Source.ProductName).Contains(needle, StringComparison.Ordinal)
                || TextNormalizer.Normalize(suggestion.Target.ProductName).Contains(needle, StringComparison.Ordinal));
        }

        var filtered = ofKind.ToList();
        var (page, pageSize) = PageOf(query.Page, query.PageSize);

        return new ProductMatchSuggestionListDto(
            query.Kind,
            all.Count(suggestion => suggestion.Kind == ProductMatchKind.SameItem),
            all.Count(suggestion => suggestion.Kind == ProductMatchKind.Variant),
            filtered.Count,
            new PagedResult<ProductMatchSuggestionDto>(
                [.. filtered.Skip((page - 1) * pageSize).Take(pageSize)], page, pageSize, filtered.Count));
    }

    /// <summary>Decisions, newest first, with both sides named and the undo if there is one.</summary>
    /// <exception cref="ValidationException">A kind or an outcome this API does not know.</exception>
    public async Task<PagedResult<ProductMatchDecisionDto>> GetDecisionsAsync(
        ProductMatchDecisionQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        if (query.Kind is { } kind)
        {
            EnsureKnown(kind);
        }

        if (query.Outcome is { } outcome && !Enum.IsDefined(outcome))
        {
            throw new ValidationException(
                $"'outcome' must be one of: {string.Join(", ", Enum.GetNames<ProductMatchOutcome>())}.");
        }

        IQueryable<ProductMatchDecision> decisions = db.ProductMatchDecisions.AsNoTracking();
        if (query.Kind is { } wantedKind)
        {
            decisions = decisions.Where(decision => decision.Kind == wantedKind);
        }

        if (query.Outcome is { } wantedOutcome)
        {
            decisions = decisions.Where(decision => decision.Outcome == wantedOutcome);
        }

        if (!query.IncludeUndone)
        {
            decisions = decisions.Where(decision => decision.UndoneAtUtc == null);
        }

        var (page, pageSize) = PageOf(query.Page, query.PageSize);
        var total = await decisions.CountAsync(cancellationToken);
        var rows = await decisions
            .OrderByDescending(decision => decision.DecidedAtUtc)
            .ThenByDescending(decision => decision.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<ProductMatchDecisionDto>(
            await DescribeAsync(db, rows, cancellationToken), page, pageSize, total);
    }

    /// <summary>
    /// Each base product with the products approved as its variants — read from the live approved variant links, and
    /// nothing else. Writes nothing.
    /// </summary>
    /// <remarks>
    /// Three reads: the links, the product names, and the catalogue's usage. The usage is the one the suggestions
    /// show, so a product's lines, locations and months read the same on both lists.
    /// </remarks>
    public async Task<PagedResult<ProductFamilyDto>> GetFamiliesAsync(
        ProductFamilyQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        var (page, pageSize) = PageOf(query.Page, query.PageSize);

        var links = await db.ProductMatchDecisions.AsNoTracking()
            .Where(decision => decision.Kind == ProductMatchKind.Variant
                && decision.Outcome == ProductMatchOutcome.Approved
                && decision.UndoneAtUtc == null)
            .Select(decision => new
            {
                decision.Id,
                decision.SourceProductId,
                decision.TargetProductId,
                decision.VariantLabel,
                decision.DecidedByDisplayName,
                decision.DecidedAtUtc,
            })
            .ToListAsync(cancellationToken);

        if (links.Count == 0)
        {
            return new PagedResult<ProductFamilyDto>([], page, pageSize, 0);
        }

        var productIds = links
            .SelectMany(link => new[] { link.SourceProductId, link.TargetProductId })
            .Distinct()
            .ToArray();
        var names = await db.Products.AsNoTracking()
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id, product => product.Name, cancellationToken);

        var catalog = await ProductMatchCatalog.ReadAsync(db, readDecisions: false, cancellationToken);
        string NameOf(long productId) => names.GetValueOrDefault(productId) ?? string.Empty;
        MatchUsage? UsageOf(long productId) => catalog.ProductUsage.GetValueOrDefault(productId);

        IEnumerable<ProductFamilyDto> families = links
            .GroupBy(link => link.TargetProductId)
            .Select(group => new ProductFamilyDto(
                group.Key,
                NameOf(group.Key),
                UsageOf(group.Key),
                [.. group
                    .Select(link => new ProductFamilyMemberDto(
                        link.Id,
                        link.SourceProductId,
                        NameOf(link.SourceProductId),
                        link.VariantLabel ?? string.Empty,
                        link.DecidedByDisplayName,
                        link.DecidedAtUtc,
                        UsageOf(link.SourceProductId)))
                    .OrderByName(member => member.VariantLabel)
                    .ThenByName(member => member.ProductName)
                    .ThenBy(member => member.ProductId)]))
            .OrderByName(family => family.ProductName)
            .ThenBy(family => family.ProductId);

        // A family is found by any of its names, and is then shown whole.
        if (Search.Of(query.Search) is { } needle)
        {
            families = families.Where(family =>
                TextNormalizer.Normalize(family.ProductName).Contains(needle, StringComparison.Ordinal)
                || family.Variants.Any(member =>
                    TextNormalizer.Normalize(member.ProductName).Contains(needle, StringComparison.Ordinal)));
        }

        var filtered = families.ToList();
        return new PagedResult<ProductFamilyDto>(
            [.. filtered.Skip((page - 1) * pageSize).Take(pageSize)], page, pageSize, filtered.Count);
    }

    /// <summary>
    /// Every suggestion, in the order a list shows them: spelling matches by how much they are ordered, then by
    /// name; variant links by the base's name, then the variant's — both in the Azerbaijani order.
    /// </summary>
    public static IReadOnlyList<ProductMatchSuggestionDto> Describe(
        ProductMatchCatalog catalog, ProductMatchSuggestionSet suggestions)
    {
        ArgumentNullException.ThrowIfNull(catalog);
        ArgumentNullException.ThrowIfNull(suggestions);

        var products = catalog.Variants.Values
            .GroupBy(variant => variant.ProductId)
            .ToDictionary(group => group.Key, group => (group.First().ProductCode, group.First().ProductName));

        ProductMatchSideDto VariantSide(long variantId)
        {
            var variant = catalog.Variants[variantId];
            return new ProductMatchSideDto(
                variant.ProductId,
                variant.ProductCode,
                variant.ProductName,
                variant.VariantId,
                variant.SpecificationValue,
                variant.SpecificationUnitCode,
                variant.SpecificationDescriptor,
                variant.ModelCode,
                variant.OrderUnitCode,
                variant.Usage.LineCount,
                variant.Usage.LocationCount,
                variant.Usage.FirstMonth,
                variant.Usage.LastMonth);
        }

        ProductMatchSideDto ProductSide(long productId)
        {
            var (code, name) = products[productId];
            var usage = catalog.ProductUsage[productId];
            return new ProductMatchSideDto(
                productId, code, name, null, null, null, null, null, null,
                usage.LineCount, usage.LocationCount, usage.FirstMonth, usage.LastMonth);
        }

        var sameItem = suggestions.SameItem
            .Select(suggestion => new ProductMatchSuggestionDto(
                ProductMatchKind.SameItem,
                VariantSide(suggestion.SourceVariantId),
                VariantSide(suggestion.TargetVariantId),
                suggestion.Difference,
                null))
            .OrderByDescending(suggestion => suggestion.Source.LineCount + suggestion.Target.LineCount)
            .ThenByName(suggestion => suggestion.Target.ProductName)
            .ThenByName(suggestion => suggestion.Source.ProductName)
            .ThenBy(suggestion => suggestion.Source.VariantId);

        var variants = suggestions.Variant
            .Select(suggestion => new ProductMatchSuggestionDto(
                ProductMatchKind.Variant,
                ProductSide(suggestion.VariantProductId),
                ProductSide(suggestion.BaseProductId),
                null,
                suggestion.ProposedLabel))
            .OrderByName(suggestion => suggestion.Target.ProductName)
            .ThenByName(suggestion => suggestion.Source.ProductName)
            .ThenBy(suggestion => suggestion.Source.ProductId);

        return [.. sameItem, .. variants];
    }

    /// <summary>Decisions as a person reads them: both products by name, and a spelling match's variants described.</summary>
    internal static async Task<IReadOnlyList<ProductMatchDecisionDto>> DescribeAsync(
        IBaxOrdersDbContext db, IReadOnlyList<ProductMatchDecision> decisions, CancellationToken cancellationToken)
    {
        if (decisions.Count == 0)
        {
            return [];
        }

        var productIds = decisions
            .SelectMany(decision => new[] { decision.SourceProductId, decision.TargetProductId })
            .Distinct()
            .ToArray();
        var names = await db.Products.AsNoTracking()
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id, product => product.Name, cancellationToken);

        var variantIds = decisions
            .SelectMany(decision => new[] { decision.SourceVariantId, decision.TargetVariantId })
            .OfType<long>()
            .Distinct()
            .ToArray();
        var variants = await db.ProductVariants.AsNoTracking()
            .Where(variant => variantIds.Contains(variant.Id))
            .Select(variant => new
            {
                variant.Id,
                variant.SpecificationValue,
                SpecificationUnit = variant.SpecificationUnit != null ? variant.SpecificationUnit.Code : variant.SpecificationDescriptor,
                variant.ModelCode,
                OrderUnit = variant.OrderUnit != null ? variant.OrderUnit.Code : null,
            })
            .ToListAsync(cancellationToken);
        var descriptions = variants.ToDictionary(
            variant => variant.Id,
            variant => VariantDescription.Of(
                variant.SpecificationValue,
                variant.SpecificationUnit,
                variant.ModelCode,
                variant.OrderUnit ?? VariantDescription.Unitless));

        return [.. decisions.Select(decision => new ProductMatchDecisionDto(
            decision.Id,
            decision.Kind,
            decision.Outcome,
            decision.SourceProductId,
            names.GetValueOrDefault(decision.SourceProductId) ?? string.Empty,
            decision.TargetProductId,
            names.GetValueOrDefault(decision.TargetProductId) ?? string.Empty,
            decision.SourceVariantId,
            decision.SourceVariantId is { } source ? descriptions.GetValueOrDefault(source) : null,
            decision.TargetVariantId,
            decision.TargetVariantId is { } target ? descriptions.GetValueOrDefault(target) : null,
            decision.VariantLabel,
            decision.Reason,
            decision.DecidedByUserId,
            decision.DecidedByDisplayName,
            decision.DecidedAtUtc,
            decision.UndoneByUserId,
            decision.UndoneByDisplayName,
            decision.UndoneAtUtc,
            decision.UndoReason,
            decision.IsLive))];
    }

    private static void EnsureKnown(ProductMatchKind kind)
    {
        if (!Enum.IsDefined(kind))
        {
            throw new ValidationException(
                $"'kind' must be one of: {string.Join(", ", Enum.GetNames<ProductMatchKind>())}.");
        }
    }

    private static (int Page, int PageSize) PageOf(int page, int pageSize) =>
        (Math.Max(1, page), pageSize <= 0 ? DefaultPageSize : Math.Min(pageSize, MaxPageSize));
}
