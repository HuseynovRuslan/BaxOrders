using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Brief (Task 13), decision 13.2: "Uyğunluqları və alternativ adları yalnız admin və ya data idarəçisi təsdiqləyir."
/// Saving a spelling as a product's alternative name in the import review is the administrator's; a Koordinator is
/// refused, as a whole and before anything is written. Every other decision of the review stays the Koordinator's.
/// </summary>
[Collection(PostgresCollection.Name)]
public sealed class ProductAliasAuthorityTests(PostgresDatabaseFixture database)
{
    [PostgresFact]
    public async Task A_coordinator_cannot_save_an_alternative_product_name_and_nothing_is_written()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Rezin əlcək {Unique()}");
        var spelling = $"Rezin alcek {Unique()}";
        var newName = $"Yeni əlcək {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: spelling));
        var key = ImportSourceKeys.Name(spelling)!;
        var service = ResolutionService(db, ReviewingCoordinator);

        await Assert.ThrowsAsync<ForbiddenException>(() => service.ResolveProductToExistingAsync(
            new ResolveToExistingCommand(batchId, key, product.Id, ResolutionScope.GlobalAlias), CancellationToken.None));
        await Assert.ThrowsAsync<ForbiddenException>(() => service.CreateProductAsync(
            new CreateProductCommand(batchId, key, newName, null, ResolutionScope.GlobalAlias), CancellationToken.None));

        await using var check = database.CreateContext();
        Assert.Empty(await check.ImportResolutions.Where(resolution => resolution.ImportBatchId == batchId).ToListAsync());
        Assert.Empty(await check.ProductAliases.Where(alias => alias.NormalizedAlias == key).ToListAsync());
        Assert.Empty(await check.Products.Where(item => item.Name == newName).ToListAsync());
        Assert.Null(Assert.Single(await RowsAsync(check, batchId)).MatchedProductId);
    }

    [PostgresFact]
    public async Task A_decision_for_this_import_only_is_promoted_to_an_alternative_name_only_by_an_administrator()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Rezin əlcək {Unique()}");
        var spelling = $"Rezin alcek {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: spelling));
        var key = ImportSourceKeys.Name(spelling)!;

        // The Koordinator decides for this import, as before ...
        var once = await ResolutionService(db, ReviewingCoordinator).ResolveProductToExistingAsync(
            new ResolveToExistingCommand(batchId, key, product.Id, ResolutionScope.BatchOnly), CancellationToken.None);
        Assert.Equal((ResolutionOutcome.Applied, false), (once.Outcome, once.AliasSaved));

        // ... but cannot turn that decision into an alternative name afterwards.
        await Assert.ThrowsAsync<ForbiddenException>(() => ResolutionService(db, ReviewingCoordinator).ResolveProductToExistingAsync(
            new ResolveToExistingCommand(batchId, key, product.Id, ResolutionScope.GlobalAlias), CancellationToken.None));
        await using (var check = database.CreateContext())
        {
            Assert.Empty(await check.ProductAliases.Where(alias => alias.NormalizedAlias == key).ToListAsync());
            Assert.Equal(ResolutionScope.BatchOnly, (await check.ImportResolutions.SingleAsync(resolution => resolution.ImportBatchId == batchId)).Scope);
        }

        // The administrator can.
        var promoted = await ResolutionService(db, ReviewingAdmin).ResolveProductToExistingAsync(
            new ResolveToExistingCommand(batchId, key, product.Id, ResolutionScope.GlobalAlias), CancellationToken.None);
        Assert.True(promoted.AliasSaved);
    }

    [PostgresFact]
    public async Task An_administrator_creating_a_product_saves_the_spelling_as_before()
    {
        await using var db = database.CreateContext();
        var spelling = $"Rezin alcek {Unique()}";
        var name = $"Rezin əlcək {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: spelling));
        var key = ImportSourceKeys.Name(spelling)!;

        var result = await ResolutionService(db, ReviewingAdmin).CreateProductAsync(
            new CreateProductCommand(batchId, key, name, null, ResolutionScope.GlobalAlias), CancellationToken.None);

        Assert.True(result.AliasSaved);
        await using var check = database.CreateContext();
        Assert.Equal(result.TargetId, await check.ProductAliases.Where(alias => alias.NormalizedAlias == key).Select(alias => alias.ProductId).SingleAsync());
    }

    [PostgresFact]
    public async Task A_coordinators_bulk_set_with_one_alternative_product_name_is_refused_whole()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Rezin əlcək {Unique()}");
        var supplier = new Supplier($"Green Garden {Unique()}");
        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();

        var productSpelling = $"Rezin alcek {Unique()}";
        var supplierSpelling = $"Green Gardem {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: productSpelling, Supplier: supplierSpelling));
        var request = new BulkResolutionRequest(
        [
            new BulkResolutionItem(ImportResolutionKind.Supplier, ImportSourceKeys.Name(supplierSpelling)!, BulkResolutionAction.MapExisting, supplier.Id, ResolutionScope.GlobalAlias),
            new BulkResolutionItem(ImportResolutionKind.Product, ImportSourceKeys.Name(productSpelling)!, BulkResolutionAction.MapExisting, product.Id, ResolutionScope.GlobalAlias),
        ]);

        await Assert.ThrowsAsync<ForbiddenException>(() => BulkService(db, user: ReviewingCoordinator).PreviewAsync(batchId, request, CancellationToken.None));
        await Assert.ThrowsAsync<ForbiddenException>(() => BulkService(db, user: ReviewingCoordinator).ApplyAsync(batchId, request, CancellationToken.None));

        await using (var check = database.CreateContext())
        {
            Assert.Empty(await check.ImportResolutions.Where(resolution => resolution.ImportBatchId == batchId).ToListAsync());
            Assert.Empty(await check.SupplierAliases.Where(alias => alias.SupplierId == supplier.Id).ToListAsync());
            Assert.Empty(await check.ProductAliases.Where(alias => alias.ProductId == product.Id).ToListAsync());
        }

        // The same set, from an administrator, goes through as it always did.
        var applied = await BulkService(db, user: ReviewingAdmin).ApplyAsync(batchId, request, CancellationToken.None);
        Assert.Equal((2, 2), (applied.AppliedItems, applied.AliasesSaved));
    }

    [PostgresFact]
    public async Task A_coordinators_bulk_product_decision_for_this_import_only_goes_through()
    {
        await using var db = database.CreateContext();
        var product = await AddProductAsync(db, $"Rezin əlcək {Unique()}");
        var spelling = $"Rezin alcek {Unique()}";
        var batchId = await StageAsync(db, new OrderLine(Product: spelling));
        var request = new BulkResolutionRequest(
        [
            new BulkResolutionItem(ImportResolutionKind.Product, ImportSourceKeys.Name(spelling)!, BulkResolutionAction.MapExisting, product.Id),
        ]);

        var applied = await BulkService(db, user: ReviewingCoordinator).ApplyAsync(batchId, request, CancellationToken.None);

        Assert.Equal((1, 0), (applied.AppliedItems, applied.AliasesSaved));
    }

    /// <summary>13.2 is about products. A location, a supplier, a person or a unit is remembered by the Koordinator as before.</summary>
    [PostgresFact]
    public async Task A_coordinator_still_remembers_every_other_kind_of_spelling()
    {
        await using var db = database.CreateContext();
        var location = new Location(await new PostgresLocationCodeGenerator(db).NextAsync(CancellationToken.None), $"Sınaq parkı {Unique()}");
        var supplier = new Supplier($"Cleanfix MMC {Unique()}");
        var person = new ResponsiblePerson($"Sınaq şəxsi {Unique()}");
        db.Locations.Add(location);
        db.Suppliers.Add(supplier);
        db.ResponsiblePeople.Add(person);
        await db.SaveChangesAsync();
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");

        var locationSpelling = $"Sinaq parki {Unique()}";
        var supplierSpelling = $"Cleanfix {Unique()}";
        var personSpelling = $"Sinaq sexsi {Unique()}";
        var unitSpelling = $"edd{Unique()}";
        var batchId = await StageAsync(db, new OrderLine(
            Location: locationSpelling, Supplier: supplierSpelling, Person: personSpelling, OrderUnit: unitSpelling));
        var service = ResolutionService(db, ReviewingCoordinator);

        var results = new[]
        {
            await service.ResolveLocationToExistingAsync(
                new ResolveToExistingCommand(batchId, ImportSourceKeys.Name(locationSpelling)!, location.Id, ResolutionScope.GlobalAlias), CancellationToken.None),
            await service.ResolveSupplierToExistingAsync(
                new ResolveToExistingCommand(batchId, ImportSourceKeys.Name(supplierSpelling)!, supplier.Id, ResolutionScope.GlobalAlias), CancellationToken.None),
            await service.ResolveResponsiblePersonToExistingAsync(
                new ResolveToExistingCommand(batchId, ImportSourceKeys.Name(personSpelling)!, person.Id, ResolutionScope.GlobalAlias), CancellationToken.None),
            await service.ResolveUnitToExistingAsync(ImportResolutionKind.OrderUnit,
                new ResolveToExistingCommand(batchId, ImportSourceKeys.Name(unitSpelling)!, pieces.Id, ResolutionScope.GlobalAlias), CancellationToken.None),
        };

        Assert.All(results, result => Assert.True(result.AliasSaved));
    }

    private static async Task<Product> AddProductAsync(BaxOrdersDbContext db, string name)
    {
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(CancellationToken.None), name);
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return product;
    }

    private static Task<List<ImportRow>> RowsAsync(BaxOrdersDbContext db, long importBatchId) =>
        db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == importBatchId)
            .OrderBy(row => row.RowNumber)
            .ToListAsync();

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];
}
