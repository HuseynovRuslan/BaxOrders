using BaxOrders.Application.Catalog;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// One product's history, against a real PostgreSQL.
/// </summary>
/// <remarks>
/// The question a manager asks of a product is "do we order this every month, and is it moving". Everything
/// here is about keeping that question honest: a thing bought once when something broke must not make an
/// article look like a habit, and it must not disappear either.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ProductHistoryTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    [PostgresFact]
    public async Task A_product_that_was_never_ordered_claims_no_habit_and_no_money()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, ordered: false);

        var history = await HistoryAsync(db, world.ProductId);

        Assert.Equal(0, history.MonthsOrdered);
        Assert.Null(history.AverageMonthlyQuantity);
        Assert.Null(history.FirstOrderedPeriod);
        Assert.Null(history.MonthlyKnownAmountTotal);
        Assert.Empty(history.Months);
        Assert.Empty(history.Lines);
    }

    /// <summary>The months and the average are planned material: a one-off is not a month the company orders in.</summary>
    [PostgresFact]
    public async Task A_one_off_purchase_is_no_part_of_how_often_the_company_orders_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, ordered: true);

        var history = await HistoryAsync(db, world.ProductId);

        // June 10, July 20 as planned material; August was a one-off of 5 and nothing else.
        Assert.Equal(2, history.MonthsOrdered);
        Assert.Equal(15m, history.AverageMonthlyQuantity);
        Assert.Equal(new DateOnly(2026, 6, 1), history.FirstOrderedPeriod);
        Assert.Equal(new DateOnly(2026, 7, 1), history.LastOrderedPeriod);

        // And it is not lost: its money and its count are its own.
        Assert.Equal(300m, history.MonthlyKnownAmountTotal);
        Assert.Equal(500m, history.OutsideMonthlyKnownAmountTotal);
        Assert.Equal(1, history.OutsideMonthlyLineCount);
    }

    [PostgresFact]
    public async Task Each_month_keeps_the_two_kinds_apart()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, ordered: true);

        var history = await HistoryAsync(db, world.ProductId);

        // Newest first, the way a reader wants a history.
        Assert.Equal(
            [new DateOnly(2026, 8, 1), new DateOnly(2026, 7, 1), new DateOnly(2026, 6, 1)],
            history.Months.Select(month => month.Period));

        var august = history.Months[0];
        Assert.Equal((0m, 0), (august.MonthlyQuantity, august.MonthlyLineCount));
        Assert.Null(august.MonthlyKnownAmount);
        Assert.Equal((5m, 1), (august.OutsideMonthlyQuantity, august.OutsideMonthlyLineCount));
        Assert.Equal(500m, august.OutsideMonthlyKnownAmount);

        var july = history.Months[1];
        Assert.Equal((20m, 1), (july.MonthlyQuantity, july.MonthlyLineCount));
        Assert.Equal(200m, july.MonthlyKnownAmount);
        Assert.Equal(0, july.OutsideMonthlyLineCount);
    }

    /// <summary>Every line is listed with the kind it was, and with whose line it was.</summary>
    [PostgresFact]
    public async Task Every_line_is_listed_with_its_kind_and_its_person()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, ordered: true);

        var history = await HistoryAsync(db, world.ProductId);

        Assert.Equal(3, history.Lines.Count);
        Assert.Equal(
            [OrderLineType.OutsideMonthly, OrderLineType.Monthly, OrderLineType.Monthly],
            history.Lines.Select(line => line.OrderLineType));
        Assert.All(history.Lines, line => Assert.Equal(world.LocationName, line.LocationName));
        Assert.All(history.Lines, line => Assert.Equal(world.PersonName, line.ResponsiblePersonName));

        var newest = history.Lines[0];
        Assert.Equal(new DateOnly(2026, 8, 1), newest.Period);
        Assert.Equal((5m, 100m, 500m), (newest.Quantity, newest.UnitPrice, newest.KnownAmount));
        Assert.Contains("PCS", newest.VariantLabel);
    }

    /// <summary>A corrected month is counted once, at the version that is current — as everywhere else.</summary>
    [PostgresFact]
    public async Task Only_the_current_version_of_a_month_is_counted()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db, ordered: true);

        // A second version of June, ordering 40 where version 1 ordered 10.
        await using var second = database.CreateContext();
        var june = await second.OrderRequests
            .Include(request => request.Location)
            .Include(request => request.Items)
            .SingleAsync(request => request.LocationId == world.LocationId
                && request.RequestPeriod == new DateOnly(2026, 6, 1));
        var variant = await second.ProductVariants.SingleAsync(item => item.Id == world.VariantId);
        june.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);
        var revised = june.CreateNextVersion();
        revised.AddItem(variant, 40m, 10m);
        second.OrderRequests.Add(revised);
        await second.SaveChangesAsync();

        var history = await HistoryAsync(second, world.ProductId);
        var months = history.Months.Single(month => month.Period == new DateOnly(2026, 6, 1));

        Assert.Equal(40m, months.MonthlyQuantity);
        Assert.Equal(1, months.MonthlyLineCount);
        Assert.Equal(30m, history.AverageMonthlyQuantity);
    }

    private static Task<ProductHistoryDto> HistoryAsync(BaxOrdersDbContext db, long productId) =>
        new ProductHistoryQueries(db).GetAsync(productId, new ProductHistoryQuery(), None)!;

    private sealed record World(long ProductId, long VariantId, int LocationId, string LocationName, string PersonName);

    /// <summary>June 10 and July 20 of planned material, then an August that was one 5 bought outside the plan.</summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db, bool ordered)
    {
        var tag = Guid.NewGuid().ToString("N")[..6];

        var location = new Location(await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Tarixçə obyekti {tag}");
        db.Locations.Add(location);
        var person = new ResponsiblePerson($"Sınaq cavabdehi {tag}");
        db.ResponsiblePeople.Add(person);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Tarixçə malı {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var variant = product.AddVariant("50", null, null, pieces);
        await db.SaveChangesAsync();

        if (ordered)
        {
            var june = new OrderRequest(location, new DateOnly(2026, 6, 1));
            june.AddItem(variant, 10m, 10m, responsiblePerson: person);

            var july = new OrderRequest(location, new DateOnly(2026, 7, 1));
            july.AddItem(variant, 20m, 10m, responsiblePerson: person);

            var august = new OrderRequest(location, new DateOnly(2026, 8, 1));
            august.AddItem(variant, 5m, 100m, orderLineType: OrderLineType.OutsideMonthly, responsiblePerson: person);

            db.OrderRequests.AddRange(june, july, august);
            await db.SaveChangesAsync();
        }

        return new World(product.Id, variant.Id, location.Id, location.Name, person.Name);
    }
}
