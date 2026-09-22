using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Normalization;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Imports.Review;

/// <summary>
/// Searches canonical records so an operator can pick one. Results are choices for a person, never an automatic
/// match: there is no fuzzy scoring and nothing is preselected.
/// </summary>
public sealed class ReferenceSearchQueries(IBaxOrdersDbContext db)
{
    public const int MaxResults = 25;

    public async Task<IReadOnlyList<ReferenceOption>> SearchLocationsAsync(string? search, CancellationToken cancellationToken)
    {
        var (normalized, code) = Terms(search);

        return await db.Locations.AsNoTracking()
            .Where(location => location.IsActive
                               && (normalized.Length == 0 || location.NormalizedName.Contains(normalized) || location.Code.Contains(code)))
            .OrderBy(location => location.Name)
            .Take(MaxResults)
            .Select(location => new ReferenceOption(location.Id, location.Name, location.Code))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ReferenceOption>> SearchSuppliersAsync(string? search, CancellationToken cancellationToken)
    {
        var (normalized, code) = Terms(search);

        return await db.Suppliers.AsNoTracking()
            .Where(supplier => supplier.IsActive
                               && (normalized.Length == 0 || supplier.NormalizedName.Contains(normalized)
                                   || (supplier.Code != null && supplier.Code.Contains(code))))
            .OrderBy(supplier => supplier.Name)
            .Take(MaxResults)
            .Select(supplier => new ReferenceOption(supplier.Id, supplier.Name, supplier.Code))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ReferenceOption>> SearchResponsiblePeopleAsync(string? search, CancellationToken cancellationToken)
    {
        var (normalized, _) = Terms(search);

        return await db.ResponsiblePeople.AsNoTracking()
            .Where(person => person.IsActive && (normalized.Length == 0 || person.NormalizedName.Contains(normalized)))
            .OrderBy(person => person.Name)
            .Take(MaxResults)
            .Select(person => new ReferenceOption(person.Id, person.Name, null))
            .ToListAsync(cancellationToken);
    }

    /// <summary>Units are searched by code, name and symbol, because operators know all three.</summary>
    public async Task<IReadOnlyList<ReferenceOption>> SearchUnitsAsync(string? search, CancellationToken cancellationToken)
    {
        var (normalized, code) = Terms(search);

        var units = await db.UnitsOfMeasure.AsNoTracking()
            .Where(unit => unit.IsActive)
            .OrderBy(unit => unit.Code)
            .Select(unit => new { unit.Id, unit.Code, unit.Name, unit.Symbol, unit.UnitType })
            .ToListAsync(cancellationToken);

        return units
            .Where(unit => normalized.Length == 0
                           || unit.Code.Contains(code, StringComparison.OrdinalIgnoreCase)
                           || TextNormalizer.Normalize(unit.Name).Contains(normalized, StringComparison.Ordinal)
                           || TextNormalizer.Normalize(unit.Symbol).Contains(normalized, StringComparison.Ordinal))
            .Take(MaxResults)
            .Select(unit => new ReferenceOption(unit.Id, $"{unit.Code} — {unit.Name}", $"{unit.Symbol} · {unit.UnitType}"))
            .ToList();
    }

    /// <summary>Categories are shown as their full path from the root, because a leaf name alone is ambiguous.</summary>
    public async Task<IReadOnlyList<ReferenceOption>> SearchCategoriesAsync(string? search, CancellationToken cancellationToken)
    {
        var (normalized, _) = Terms(search);

        var categories = await db.Categories.AsNoTracking()
            .Select(category => new { category.Id, category.ParentId, category.Name, category.NormalizedName, category.IsActive })
            .ToListAsync(cancellationToken);

        var byId = categories.ToDictionary(category => category.Id);
        var options = new List<ReferenceOption>();

        foreach (var category in categories.Where(category => category.IsActive))
        {
            var names = new List<string>();
            var normalizedNames = new List<string>();
            var current = category;
            var usable = true;

            for (var depth = 0; depth <= byId.Count; depth++)
            {
                if (!current.IsActive)
                {
                    usable = false;
                    break;
                }

                names.Add(current.Name);
                normalizedNames.Add(current.NormalizedName);
                if (current.ParentId is not { } parentId)
                {
                    break;
                }

                if (!byId.TryGetValue(parentId, out current))
                {
                    usable = false;
                    break;
                }
            }

            if (!usable)
            {
                continue;
            }

            names.Reverse();
            var path = string.Join(" → ", names);
            if (normalized.Length == 0 || normalizedNames.Any(name => name.Contains(normalized, StringComparison.Ordinal)))
            {
                options.Add(new ReferenceOption(category.Id, path, $"Səviyyə {names.Count}"));
            }
        }

        return options.OrderBy(option => option.Label, StringComparer.Ordinal).Take(MaxResults).ToList();
    }

    /// <summary>Products are searched by name, code and approved alias, because operators know all three.</summary>
    public async Task<IReadOnlyList<ReferenceOption>> SearchProductsAsync(string? search, CancellationToken cancellationToken)
    {
        var (normalized, code) = Terms(search);

        return await db.Products.AsNoTracking()
            .Where(product => product.IsActive
                              && (normalized.Length == 0
                                  || product.NormalizedName.Contains(normalized)
                                  || product.Code.Contains(code)
                                  || product.Aliases.Any(alias => alias.NormalizedAlias.Contains(normalized))))
            .OrderBy(product => product.Name)
            .Take(MaxResults)
            .Select(product => new ReferenceOption(product.Id, product.Name, product.Code))
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Variants of one product. The list is scoped to that product on purpose: a variant of another product is
    /// never a candidate, however similar it reads.
    /// </summary>
    public async Task<IReadOnlyList<ReferenceOption>> SearchProductVariantsAsync(long productId, string? search, CancellationToken cancellationToken)
    {
        var (normalized, code) = Terms(search);

        var variants = await db.ProductVariants.AsNoTracking()
            .Where(variant => variant.ProductId == productId && variant.IsActive)
            .OrderBy(variant => variant.SpecificationValue)
            .ThenBy(variant => variant.ModelCode)
            .Select(variant => new
            {
                variant.Id,
                variant.SpecificationValue,
                variant.ModelCode,
                SpecificationUnitCode = variant.SpecificationUnit != null ? variant.SpecificationUnit.Code : null,
                OrderUnitCode = variant.OrderUnit != null ? variant.OrderUnit.Code : null,
                OrderUnitName = variant.OrderUnit != null ? variant.OrderUnit.Name : null,
            })
            .ToListAsync(cancellationToken);

        return variants
            .Where(variant => normalized.Length == 0
                              || TextNormalizer.Normalize(variant.SpecificationValue).Contains(normalized, StringComparison.Ordinal)
                              || TextNormalizer.Normalize(variant.ModelCode).Contains(normalized, StringComparison.Ordinal)
                              || (variant.OrderUnitCode ?? string.Empty).Contains(code, StringComparison.OrdinalIgnoreCase))
            .Take(MaxResults)
            .Select(variant => new ReferenceOption(
                variant.Id,
                VariantDescription.Of(
                    variant.SpecificationValue, variant.SpecificationUnitCode, variant.ModelCode,
                    variant.OrderUnitCode ?? VariantDescription.Unitless),
                variant.OrderUnitCode is null
                    ? "Ö/v: yoxdur (xidmət sətri)"
                    : $"Ö/v: {variant.OrderUnitCode} — {variant.OrderUnitName}"))
            .ToList();
    }

    private static (string Normalized, string Code) Terms(string? search) =>
        (TextNormalizer.Normalize(search), (search ?? string.Empty).Trim().ToUpperInvariant());
}
