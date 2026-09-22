using BaxOrders.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Imports.Matching;

/// <summary>
/// Loads the matching data for one import in a fixed number of queries, independent of the row count.
/// </summary>
/// <remarks>
/// Small reference sets (locations, suppliers, responsible persons, units, categories and their aliases) are
/// loaded completely. Products are loaded only for the distinct names in the workbook, in chunks, to stay
/// within SQL Server parameter limits; variants are loaded for the products found.
/// Only active records are matchable.
/// </remarks>
public sealed class ImportCatalogLoader(IBaxOrdersDbContext db)
{
    private const int ChunkSize = 500;

    /// <param name="normalizedProductNames">Distinct product names staged in the workbook.</param>
    /// <param name="resolvedProductIds">
    /// Products a review decision already points at. Their variants must be loaded too, even when no staged name
    /// matches them any more.
    /// </param>
    public async Task<ImportCatalog> LoadAsync(
        IReadOnlyCollection<string> normalizedProductNames,
        IReadOnlyCollection<long> resolvedProductIds,
        CancellationToken cancellationToken)
    {
        var catalog = new ImportCatalog();

        foreach (var location in await db.Locations.AsNoTracking().Where(l => l.IsActive)
                     .Select(l => new { l.Id, l.NormalizedName }).ToListAsync(cancellationToken))
        {
            catalog.Locations.Add(location.NormalizedName, location.Id);
        }

        foreach (var alias in await db.LocationAliases.AsNoTracking().Where(a => a.Location.IsActive)
                     .Select(a => new { a.LocationId, a.NormalizedAlias }).ToListAsync(cancellationToken))
        {
            catalog.Locations.Add(alias.NormalizedAlias, alias.LocationId);
        }

        foreach (var supplier in await db.Suppliers.AsNoTracking().Where(s => s.IsActive)
                     .Select(s => new { s.Id, s.NormalizedName }).ToListAsync(cancellationToken))
        {
            catalog.Suppliers.Add(supplier.NormalizedName, supplier.Id);
        }

        foreach (var alias in await db.SupplierAliases.AsNoTracking().Where(a => a.Supplier.IsActive)
                     .Select(a => new { a.SupplierId, a.NormalizedAlias }).ToListAsync(cancellationToken))
        {
            catalog.Suppliers.Add(alias.NormalizedAlias, alias.SupplierId);
        }

        foreach (var person in await db.ResponsiblePeople.AsNoTracking().Where(p => p.IsActive)
                     .Select(p => new { p.Id, p.NormalizedName }).ToListAsync(cancellationToken))
        {
            catalog.ResponsiblePeople.Add(person.NormalizedName, person.Id);
        }

        foreach (var alias in await db.ResponsiblePersonAliases.AsNoTracking().Where(a => a.ResponsiblePerson.IsActive)
                     .Select(a => new { a.ResponsiblePersonId, a.NormalizedAlias }).ToListAsync(cancellationToken))
        {
            catalog.ResponsiblePeople.Add(alias.NormalizedAlias, alias.ResponsiblePersonId);
        }

        foreach (var unit in await db.UnitsOfMeasure.AsNoTracking().Where(u => u.IsActive)
                     .Select(u => new { u.Id, u.Code, u.Name, u.Symbol }).ToListAsync(cancellationToken))
        {
            catalog.AddUnit(unit.Id, unit.Code, unit.Name, unit.Symbol);
        }

        foreach (var alias in await db.UnitOfMeasureAliases.AsNoTracking().Where(a => a.UnitOfMeasure.IsActive)
                     .Select(a => new { a.UnitOfMeasureId, a.NormalizedAlias }).ToListAsync(cancellationToken))
        {
            catalog.Units.Add(alias.NormalizedAlias, alias.UnitOfMeasureId);
        }

        var categories = await db.Categories.AsNoTracking()
            .Select(c => new { c.Id, c.ParentId, c.NormalizedName, c.IsActive })
            .ToListAsync(cancellationToken);
        catalog.Categories.Build(categories.Select(c => (c.Id, c.ParentId, c.NormalizedName, c.IsActive)));

        var productIds = new HashSet<long>();
        foreach (var product in await db.Products.AsNoTracking()
                     .Where(p => p.IsActive && resolvedProductIds.Contains(p.Id))
                     .Select(p => new { p.Id, p.NormalizedName }).ToListAsync(cancellationToken))
        {
            catalog.Products.Add(product.NormalizedName, product.Id);
        }

        foreach (var names in normalizedProductNames.Distinct(StringComparer.Ordinal).Chunk(ChunkSize))
        {
            foreach (var product in await db.Products.AsNoTracking()
                         .Where(p => p.IsActive && names.Contains(p.NormalizedName))
                         .Select(p => new { p.Id, p.NormalizedName }).ToListAsync(cancellationToken))
            {
                catalog.Products.Add(product.NormalizedName, product.Id);
                productIds.Add(product.Id);
            }

            foreach (var alias in await db.ProductAliases.AsNoTracking()
                         .Where(a => a.Product.IsActive && names.Contains(a.NormalizedAlias))
                         .Select(a => new { a.ProductId, a.NormalizedAlias }).ToListAsync(cancellationToken))
            {
                catalog.Products.Add(alias.NormalizedAlias, alias.ProductId);
                productIds.Add(alias.ProductId);
            }
        }

        productIds.UnionWith(resolvedProductIds);

        foreach (var ids in productIds.Chunk(ChunkSize))
        {
            foreach (var variant in await db.ProductVariants.AsNoTracking()
                         .Where(v => v.IsActive && ids.Contains(v.ProductId))
                         .Select(v => new { v.Id, v.ProductId, v.NormalizedVariantKey }).ToListAsync(cancellationToken))
            {
                catalog.AddVariant(variant.ProductId, variant.NormalizedVariantKey, variant.Id);
            }
        }

        return catalog;
    }
}
