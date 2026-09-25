using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The brief's own example, and the pairs around it that the suggestion rule must and must not find — built in a
/// database of its own, because the rule reads the whole catalogue.
/// </summary>
/// <remarks>
/// <para>
/// Heydər Əliyev Mərkəzi (seeded by the migrations as HEM): August 2026 "Sabun elano" 60 ədəd × 12.50 = 750.00,
/// September 2026 "Sabun elano lavanda ətirli" 60 ədəd × 12.50 = 750.00.
/// </para>
/// <para>
/// A test object, April to July 2026: "Lampa 15W" (3 lines), "Lampa 15 W" (2), "Lampa15 W" (1); "Kaplin 3/4" and
/// "Kaplin 3\4"; "Lampa LED" with the specifications "15 W" and "15W"; "Mop 40 sm" in pieces and "Mop 40sm" in packs;
/// "Vedrə 10 L" ordered and "Vedrə 10L" never ordered; "Qab", "Qab yuma", "Qab yuma limon", "Qab yuma nanə"; and
/// two do-not-merge pairs, NM-02 "Metlaq Boz" / "Metlaq boz rəng" and NM-10 "Əl arabası" / "Əl arabası qaynaqlı".
/// </para>
/// </remarks>
internal sealed class ProductMatchFixture
{
    public static readonly DateOnly August = new(2026, 8, 1);
    public static readonly DateOnly September = new(2026, 9, 1);

    private readonly Dictionary<string, Product> _products = new(StringComparer.Ordinal);
    private readonly Dictionary<string, ProductVariant> _variants = new(StringComparer.Ordinal);

    public long SeptemberOrderId { get; private set; }

    /// <summary>A product by the name it was created with.</summary>
    public long Product(string name) => _products[name].Id;

    /// <summary>A variant by the key it was created with: the product name, or "name|specification".</summary>
    public long Variant(string key) => _variants[key].Id;

    public static async Task<ProductMatchFixture> CreateAsync(BaxOrdersDbContext db)
    {
        var fixture = new ProductMatchFixture();
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var packs = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PACK");

        // Created in this order on purpose: where two sides have as many lines, the older one is the target.
        await fixture.AddAsync(db, "Sabun elano", pieces);
        await fixture.AddAsync(db, "Sabun elano lavanda ətirli", pieces);
        await fixture.AddAsync(db, "Lampa 15 W", pieces);
        await fixture.AddAsync(db, "Lampa 15W", pieces);
        await fixture.AddAsync(db, "Lampa15 W", pieces);
        await fixture.AddAsync(db, "Kaplin 3/4", pieces);
        await fixture.AddAsync(db, "Kaplin 3\\4", pieces);
        await fixture.AddAsync(db, "Lampa LED", pieces, "15 W");
        await fixture.AddAsync(db, "Lampa LED", pieces, "15W");
        await fixture.AddAsync(db, "Mop 40 sm", pieces);
        await fixture.AddAsync(db, "Mop 40sm", packs);
        await fixture.AddAsync(db, "Vedrə 10 L", pieces);
        await fixture.AddAsync(db, "Vedrə 10L", pieces);
        await fixture.AddAsync(db, "Qab", pieces);
        await fixture.AddAsync(db, "Qab yuma", pieces);
        await fixture.AddAsync(db, "Qab yuma limon", pieces);
        await fixture.AddAsync(db, "Qab yuma nanə", pieces);
        await fixture.AddAsync(db, "Metlaq Boz", pieces);
        await fixture.AddAsync(db, "Metlaq boz rəng", pieces);
        await fixture.AddAsync(db, "Əl arabası", pieces);
        await fixture.AddAsync(db, "Əl arabası qaynaqlı", pieces);

        var hem = await db.Locations.SingleAsync(location => location.Code == "HEM");
        await OrderAsync(db, hem, August, (fixture._variants["Sabun elano"], 60m, 12.50m));
        fixture.SeptemberOrderId = await OrderAsync(db, hem, September, (fixture._variants["Sabun elano lavanda ətirli"], 60m, 12.50m));

        var other = new Location(await new PostgresLocationCodeGenerator(db).NextAsync(CancellationToken.None), "Sınaq obyekti 13a");
        db.Locations.Add(other);
        await db.SaveChangesAsync();

        ProductVariant V(string key) => fixture._variants[key];
        await OrderAsync(db, other, new DateOnly(2026, 4, 1), (V("Lampa 15W"), 10m, 2m));
        await OrderAsync(db, other, new DateOnly(2026, 5, 1), (V("Lampa 15W"), 10m, 2m), (V("Lampa 15 W"), 10m, 2m));
        await OrderAsync(db, other, new DateOnly(2026, 6, 1), (V("Lampa 15W"), 10m, 2m), (V("Lampa 15 W"), 10m, 2m), (V("Lampa15 W"), 10m, 2m));
        await OrderAsync(db, other, new DateOnly(2026, 7, 1),
            [.. new[]
            {
                "Kaplin 3/4", "Kaplin 3\\4", "Lampa LED|15 W", "Lampa LED|15W", "Mop 40 sm", "Mop 40sm", "Vedrə 10 L",
                "Qab", "Qab yuma", "Qab yuma limon", "Qab yuma nanə",
                "Metlaq Boz", "Metlaq boz rəng", "Əl arabası", "Əl arabası qaynaqlı",
            }.Select(key => (V(key), 5m, (decimal?)3m))]);

        db.ChangeTracker.Clear();
        return fixture;
    }

    private async Task AddAsync(BaxOrdersDbContext db, string name, UnitOfMeasure orderUnit, string? specification = null)
    {
        if (!_products.TryGetValue(name, out var product))
        {
            product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(CancellationToken.None), name);
            db.Products.Add(product);
            await db.SaveChangesAsync();
            _products[name] = product;
        }

        var variant = product.AddVariant(specification, null, null, orderUnit);
        await db.SaveChangesAsync();
        _variants[specification is null ? name : $"{name}|{specification}"] = variant;
    }

    private static async Task<long> OrderAsync(
        BaxOrdersDbContext db, Location location, DateOnly period, params (ProductVariant Variant, decimal Quantity, decimal? Price)[] lines)
    {
        var request = new OrderRequest(location, period);
        foreach (var (variant, quantity, price) in lines)
        {
            request.AddItem(variant, quantity, price);
        }

        db.OrderRequests.Add(request);
        await db.SaveChangesAsync();
        return request.Id;
    }
}
