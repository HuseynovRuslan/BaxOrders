using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Orders;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Who each object's month is answerable to, as the dashboard reports it.
/// </summary>
/// <remarks>
/// The rule is the order screen's own — see <see cref="OrderResponsibility"/> — and the point of these tests is
/// that the dashboard does not grow a second, looser one. In particular it must never name the person with the
/// most lines: an order of forty cleaning lines and one fuel line is not the cleaner's order.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class DashboardResponsibilityTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;
    private static readonly DateOnly July = new(2026, 7, 1);

    [PostgresFact]
    public async Task An_order_assigned_to_somebody_names_that_person()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.AssignedLocationId);

        Assert.Equal(OrderResponsibilityKind.Assigned, row.Responsibility!.Kind);
        Assert.Equal(world.ChiefName, row.Responsibility.PersonName);
    }

    /// <summary>Nobody assigned it, but every line names the same person, so the order has an answer anyway.</summary>
    [PostgresFact]
    public async Task An_order_whose_lines_agree_names_the_person_they_agree_on()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.AgreedLocationId);

        Assert.Equal(OrderResponsibilityKind.AgreedOnLines, row.Responsibility!.Kind);
        Assert.Equal(world.GardenerName, row.Responsibility.PersonName);
        Assert.Equal(1, row.Responsibility.DistinctPersonCount);
    }

    /// <summary>
    /// Three lines name one person and one names another. The answer is «Bir neçə cavabdeh» and no name at all
    /// — picking the majority would put a name on a decision nobody made.
    /// </summary>
    [PostgresFact]
    public async Task An_order_whose_lines_disagree_names_nobody_and_says_how_many()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.SeveralLocationId);

        Assert.Equal(OrderResponsibilityKind.Several, row.Responsibility!.Kind);
        Assert.Null(row.Responsibility.PersonName);
        Assert.Equal(2, row.Responsibility.DistinctPersonCount);
        Assert.Equal(4, row.Responsibility.NamedLineCount);
    }

    /// <summary>Nothing names anybody, and the answer says so rather than inventing one.</summary>
    [PostgresFact]
    public async Task An_order_nobody_is_named_on_says_so()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.NamelessLocationId);

        Assert.Equal(OrderResponsibilityKind.None, row.Responsibility!.Kind);
        Assert.Null(row.Responsibility.PersonName);
    }

    /// <summary>
    /// An object that did not order this month has nothing to be answerable for, so the field is absent rather
    /// than an empty answer that would read as "nobody was assigned".
    /// </summary>
    [PostgresFact]
    public async Task An_object_with_no_order_this_month_carries_no_answer_at_all()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var row = await RowAsync(db, world, world.SilentLocationId);

        Assert.False(row.HasCurrentRequest);
        Assert.Null(row.Responsibility);
    }

    /// <summary>
    /// Who is answerable is a fact about the order, not about the lines the reader asked to compare, so it does
    /// not move when they change the scope.
    /// </summary>
    [PostgresFact]
    public async Task The_answer_does_not_move_with_the_scope()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var monthly = await RowAsync(db, world, world.AgreedLocationId, AnalyticsScope.Monthly);
        var all = await RowAsync(db, world, world.AgreedLocationId, AnalyticsScope.All);

        Assert.Equal(monthly.Responsibility, all.Responsibility);
    }

    // ---- the world -------------------------------------------------------------------------------------

    private sealed record World(
        string Tag,
        string ChiefName,
        string GardenerName,
        int AssignedLocationId,
        int AgreedLocationId,
        int SeveralLocationId,
        int NamelessLocationId,
        int SilentLocationId);

    private static async Task<LocationDashboardRowDto> RowAsync(
        BaxOrdersDbContext db, World world, int locationId,
        AnalyticsScope scope = AnalyticsScope.Monthly)
    {
        var dashboard = await new ManagementDashboardQueries(db).GetAsync(
            July, new DashboardQuery(Search: world.Tag, PageSize: 100, Scope: scope), None);

        return dashboard!.Rows.Items.Single(row => row.LocationId == locationId);
    }

    /// <summary>Five objects, one for each of the four answers and one that did not order at all.</summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var locationCodes = new PostgresLocationCodeGenerator(db);
        var productCodes = new PostgresProductCodeGenerator(db);

        async Task<Location> LocationAsync(string name)
        {
            var location = new Location(await locationCodes.NextAsync(None), $"{name} {tag}");
            db.Locations.Add(location);
            await db.SaveChangesAsync();
            return location;
        }

        var chief = new ResponsiblePerson($"Rəis {tag}");
        var gardener = new ResponsiblePerson($"Bağban {tag}");
        db.ResponsiblePeople.AddRange(chief, gardener);
        await db.SaveChangesAsync();

        var product = new Product(await productCodes.NextAsync(None), $"Cavabdeh malı {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync();
        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var assigned = await LocationAsync("Təyin edilmiş");
        var agreed = await LocationAsync("Razılaşan");
        var several = await LocationAsync("Bir neçə");
        var nameless = await LocationAsync("Adsız");
        var silent = await LocationAsync("Sifarişsiz");

        // Assigned to the chief although every line names the gardener: the assignment is a decision and wins.
        var assignedRequest = new OrderRequest(assigned, July, responsiblePerson: chief);
        assignedRequest.AddItem(variant, 1m, 10m, responsiblePerson: gardener);

        var agreedRequest = new OrderRequest(agreed, July);
        agreedRequest.AddItem(variant, 1m, 10m, responsiblePerson: gardener);
        agreedRequest.AddItem(variant, 2m, 10m, responsiblePerson: gardener);

        // Three lines to the gardener and one to the chief. A majority is not an answer.
        var severalRequest = new OrderRequest(several, July);
        severalRequest.AddItem(variant, 1m, 10m, responsiblePerson: gardener);
        severalRequest.AddItem(variant, 1m, 10m, responsiblePerson: gardener);
        severalRequest.AddItem(variant, 1m, 10m, responsiblePerson: gardener);
        severalRequest.AddItem(variant, 1m, 10m, responsiblePerson: chief);

        var namelessRequest = new OrderRequest(nameless, July);
        namelessRequest.AddItem(variant, 1m, 10m);

        db.OrderRequests.AddRange(assignedRequest, agreedRequest, severalRequest, namelessRequest);
        await db.SaveChangesAsync();

        return new World(
            tag, chief.Name, gardener.Name,
            assigned.Id, agreed.Id, several.Id, nameless.Id, silent.Id);
    }
}
