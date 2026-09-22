using BaxOrders.Application.Orders;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

[Collection(SqlServerCollection.Name)]
public sealed class SqlServerPersistenceTests(SqlServerDatabaseFixture database)
{
    private static readonly DateOnly March = new(2026, 3, 1);

    [SqlServerFact]
    public async Task Concurrent_product_code_requests_never_collide()
    {
        var codes = await Task.WhenAll(Enumerable.Range(0, 25).Select(async _ =>
        {
            await using var db = database.CreateContext();
            return await new SqlServerProductCodeGenerator(db).NextAsync(CancellationToken.None);
        }));

        Assert.Equal(codes.Length, codes.Distinct().Count());
        Assert.All(codes, code => Assert.True(ProductCode.IsValid(code), code));
    }

    [SqlServerFact]
    public async Task Latest_version_of_a_logical_request_is_found()
    {
        int locationId;

        await using (var db = database.CreateContext())
        {
            var location = await db.Locations.SingleAsync(l => l.Code == "RAMANA");
            var pieces = await db.UnitsOfMeasure.SingleAsync(u => u.Code == "PCS");
            var product = new Product(await new SqlServerProductCodeGenerator(db).NextAsync(CancellationToken.None), "Lapatka");
            var shovel = product.AddVariant(null, null, null, pieces);
            db.Products.Add(product);

            var original = new OrderRequest(location, March);
            original.AddItem(shovel, 100m, 7m);
            original.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);
            db.OrderRequests.Add(original);
            await db.SaveChangesAsync();

            var correction = original.CreateNextVersion(new DateOnly(2026, 3, 20));
            correction.AddItem(shovel, 120m, 7m);
            db.OrderRequests.Add(correction);
            await db.SaveChangesAsync();

            locationId = location.Id;
        }

        await using (var db = database.CreateContext())
        {
            var latest = await new OrderRequestVersions(db).FindLatestAsync(locationId, new DateOnly(2026, 3, 1), CancellationToken.None);

            Assert.NotNull(latest);
            Assert.Equal(2, latest.Version);
            Assert.Equal(2, await db.OrderRequests.CountAsync(request => request.LocationId == locationId));
        }
    }

    [SqlServerFact]
    public async Task Same_version_of_a_logical_request_cannot_be_stored_twice()
    {
        await using var db = database.CreateContext();
        var location = await db.Locations.SingleAsync(l => l.Code == "MASTAGA");

        db.OrderRequests.AddRange(new OrderRequest(location, March), new OrderRequest(location, March, requestDate: new DateOnly(2026, 3, 18)));

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [SqlServerFact]
    public async Task Alias_spellings_that_normalize_equally_are_rejected()
    {
        await using (var db = database.CreateContext())
        {
            var supplier = new Supplier("Cleanfix MMC");
            db.Suppliers.Add(supplier);
            db.SupplierAliases.Add(new SupplierAlias(supplier, "Cleanfix"));
            await db.SaveChangesAsync();
        }

        await using (var db = database.CreateContext())
        {
            var supplier = await db.Suppliers.SingleAsync(s => s.NormalizedName == "cleanfix mmc");
            db.SupplierAliases.Add(new SupplierAlias(supplier, " CLEANFIX "));

            await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        }
    }

    [SqlServerFact]
    public async Task Canonical_location_names_are_unique()
    {
        await using var db = database.CreateContext();
        db.Locations.Add(new Location("RAMANA-2", " RAMANA "));

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }
}
