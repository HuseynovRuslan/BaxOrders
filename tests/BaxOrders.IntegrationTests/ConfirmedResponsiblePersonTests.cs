using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using BaxOrders.Infrastructure.Persistence.Migrations;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The six people the business confirmed, created from the names their own source rows already carry.
/// </summary>
/// <remarks>
/// Six names ran through years of the history with no canonical record, which is why 131 requests had no
/// responsible person. The business confirmed all six are real and distinct, so what these tests pin is that
/// each becomes a person of his own, that none of them is quietly joined to another, and that creating them
/// changes only who a request points at.
/// <para>
/// The SQL under test is the migration's own, taken from the same constants it ships, so a change to the
/// rule cannot leave these passing against a copy of it.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ConfirmedResponsiblePersonTests : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;

    /// <summary>The six, by the name the business gave and the key the import already stores for it.</summary>
    public static readonly TheoryData<string, string> Confirmed = new()
    {
        { "Elmir", "elmir" },
        { "Sirus", "sirus" },
        { "Eldar", "eldar" },
        { "Qulu", "qulu" },
        { "Elvin", "elvin" },
        { "Məmməd", "məmməd" },
    };

    private IsolatedDatabase? _database;

    [PostgresTheory]
    [MemberData(nameof(Confirmed))]
    public async Task Each_confirmed_name_becomes_a_canonical_person_of_his_own(string name, string normalized)
    {
        await using var db = _database!.CreateContext();
        await ImportedOrders.ImportAsync(db, Line(name), Line(name));

        await CreatePeopleAsync(db);

        var person = await db.ResponsiblePeople.AsNoTracking()
            .SingleAsync(p => p.NormalizedName == normalized, None);
        Assert.Equal(name, person.Name);
        Assert.True(person.IsActive);
    }

    /// <summary>
    /// Six people, not one with five other names. An alias between any two would say they are the same
    /// person, which is the opposite of what the business confirmed.
    /// </summary>
    [PostgresFact]
    public async Task None_of_the_six_is_made_an_alias_of_another()
    {
        await using var db = _database!.CreateContext();
        foreach (var name in Names)
        {
            await ImportedOrders.ImportAsync(db, Line(name));
        }

        await CreatePeopleAsync(db);

        var people = await db.ResponsiblePeople.AsNoTracking()
            .Where(p => Keys.Contains(p.NormalizedName))
            .Select(p => p.Id)
            .ToListAsync(None);
        Assert.Equal(6, people.Count);

        // Neither joined to one another nor to anybody else.
        Assert.Empty(await db.Set<Domain.ResponsiblePeople.ResponsiblePersonAlias>().AsNoTracking()
            .Where(a => people.Contains(a.ResponsiblePersonId) || Keys.Contains(a.NormalizedAlias))
            .ToListAsync(None));
    }

    /// <summary>A name already in the table is reused, never duplicated, however often this runs.</summary>
    [PostgresFact]
    public async Task An_existing_name_is_reused_and_running_it_again_creates_nobody()
    {
        await using var db = _database!.CreateContext();
        await ImportedOrders.ImportAsync(db, Line("Elmir"), Line("Sirus"));

        await CreatePeopleAsync(db);
        var after = await db.ResponsiblePeople.AsNoTracking().Select(p => p.Id).ToListAsync(None);

        await CreatePeopleAsync(db);
        await CreatePeopleAsync(db);

        Assert.Equal(after.Order(), (await db.ResponsiblePeople.AsNoTracking()
            .Select(p => p.Id).ToListAsync(None)).Order());
        var names = await db.ResponsiblePeople.AsNoTracking().Select(p => p.NormalizedName).ToListAsync(None);
        Assert.Equal(names.Count, names.Distinct().Count());
    }

    /// <summary>A name the history never mentions does not gain a person nobody needs.</summary>
    [PostgresFact]
    public async Task A_name_the_history_never_mentions_is_not_created()
    {
        await using var db = _database!.CreateContext();
        await ImportedOrders.ImportAsync(db, Line("Elmir"));

        await CreatePeopleAsync(db);

        Assert.True(await db.ResponsiblePeople.AnyAsync(p => p.NormalizedName == "elmir", None));
        Assert.False(await db.ResponsiblePeople.AnyAsync(p => p.NormalizedName == "sirus", None));
    }

    // ---- what the new people let the rule answer, and what they do not --------------------------------

    [PostgresFact]
    public async Task A_request_naming_one_of_the_six_is_answered_once_he_exists()
    {
        await using var db = _database!.CreateContext();
        var order = await ImportedOrders.ImportAsync(db, Line("Elmir"), Line("Elmir"), Line("Elmir"));

        await CreatePeopleAsync(db);
        await MaterializeAsync(db);

        var person = await db.ResponsiblePeople.AsNoTracking().SingleAsync(p => p.NormalizedName == "elmir", None);
        Assert.Equal(person.Id, await PersonOfAsync(db, order.OrderRequestId));
    }

    /// <summary>
    /// Two of the six in one request are still two people. Creating them resolves the names; it does not
    /// answer the question of whose order it was.
    /// </summary>
    [PostgresFact]
    public async Task A_request_naming_two_of_the_six_is_still_left_unanswered()
    {
        await using var db = _database!.CreateContext();
        var order = await ImportedOrders.ImportAsync(db, Line("Eldar"), Line("Eldar"), Line("Elmir"));

        await CreatePeopleAsync(db);
        await MaterializeAsync(db);

        Assert.Null(await PersonOfAsync(db, order.OrderRequestId));
    }

    [PostgresFact]
    public async Task A_request_still_holding_a_name_nobody_confirmed_is_left_unanswered()
    {
        await using var db = _database!.CreateContext();
        var order = await ImportedOrders.ImportAsync(db, Line("Elmir"), Line("Kimsə"));

        await CreatePeopleAsync(db);
        await MaterializeAsync(db);

        Assert.Null(await PersonOfAsync(db, order.OrderRequestId));
    }

    [PostgresFact]
    public async Task A_person_already_recorded_is_not_replaced_by_one_of_the_six()
    {
        await using var db = _database!.CreateContext();
        var order = await ImportedOrders.ImportAsync(db, Line("Elmir"), Line("Elmir"));
        await CreatePeopleAsync(db);
        var other = await db.ResponsiblePeople.AsNoTracking().SingleAsync(p => p.NormalizedName == "elmir", None);

        // Somebody has already said this order was Sirus's.
        await ImportedOrders.ImportAsync(db, Line("Sirus"));
        await CreatePeopleAsync(db);
        var chosen = await db.ResponsiblePeople.AsNoTracking().SingleAsync(p => p.NormalizedName == "sirus", None);
        await db.Database.ExecuteSqlAsync(
            $"""UPDATE "OrderRequests" SET "ResponsiblePersonId" = {chosen.Id} WHERE "Id" = {order.OrderRequestId}""",
            None);

        await MaterializeAsync(db);

        Assert.Equal(chosen.Id, await PersonOfAsync(db, order.OrderRequestId));
        Assert.NotEqual(other.Id, chosen.Id);
    }

    // ---- what it leaves alone -------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_source_and_the_order_are_left_exactly_as_they_were()
    {
        await using var db = _database!.CreateContext();
        var order = await ImportedOrders.ImportAsync(db, Line("Məmməd"), Line("Məmməd"));

        var rawBefore = await RawNamesAsync(db, order.OrderRequestId);
        var orderBefore = await SnapshotAsync(db, order.OrderRequestId);

        await CreatePeopleAsync(db);
        await MaterializeAsync(db);

        Assert.Equal(["Məmməd", "Məmməd"], rawBefore);
        Assert.Equal(rawBefore, await RawNamesAsync(db, order.OrderRequestId));
        Assert.Equal(orderBefore, await SnapshotAsync(db, order.OrderRequestId));
    }

    // ---- the world ------------------------------------------------------------------------------------

    private static readonly string[] Names = ["Elmir", "Sirus", "Eldar", "Qulu", "Elvin", "Məmməd"];
    private static readonly string[] Keys = ["elmir", "sirus", "eldar", "qulu", "elvin", "məmməd"];

    private static OrderLine Line(string? person) => new(Person: person, Price: 2, Quantity: 3);

    /// <summary>The migration's own insert, over the list it ships.</summary>
    private static Task CreatePeopleAsync(BaxOrdersDbContext db) =>
        db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "ResponsiblePeople" ("Name", "NormalizedName", "IsActive", "CreatedAtUtc", "UpdatedAtUtc")
            SELECT v.name, v.normalized, TRUE, NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC'
            FROM (
            """
            + MaterializeConfirmedResponsiblePersons.ConfirmedPeople
            + """
            ) AS v(name, normalized)
            WHERE NOT EXISTS (SELECT 1 FROM "ResponsiblePeople" p WHERE p."NormalizedName" = v.normalized)
              AND EXISTS (SELECT 1 FROM "ImportRows" r WHERE r."NormalizedResponsiblePersonName" = v.normalized)
            """,
            None);

    /// <summary>The migration's own resolution, which it shares with the one before it.</summary>
    private static Task MaterializeAsync(BaxOrdersDbContext db) =>
        db.Database.ExecuteSqlRawAsync(
            """
            UPDATE "OrderRequests" AS o
            SET "ResponsiblePersonId" = t.person_id
            FROM (
            """
            + MaterializeHistoricalResponsiblePersons.ResolvedRequests
            + """
            ) AS t
            WHERE o."Id" = t.order_id AND o."ResponsiblePersonId" IS NULL
            """,
            None);

    private static async Task<int?> PersonOfAsync(BaxOrdersDbContext db, long orderRequestId) =>
        await db.OrderRequests.AsNoTracking()
            .Where(order => order.Id == orderRequestId)
            .Select(order => order.ResponsiblePersonId)
            .SingleAsync(None);

    private static async Task<List<string>> RawNamesAsync(BaxOrdersDbContext db, long orderRequestId) =>
        await db.ImportRows.AsNoTracking()
            .Where(row => db.ImportRowMaterializations.Any(link =>
                link.ImportRowId == row.Id && link.OrderRequestItem.OrderRequestId == orderRequestId))
            .OrderBy(row => row.RowNumber)
            .Select(row => row.OriginalResponsiblePersonName!)
            .ToListAsync(None);

    /// <summary>Everything about the request this task may not touch, in one value.</summary>
    private static async Task<string> SnapshotAsync(BaxOrdersDbContext db, long orderRequestId) =>
        (await db.OrderRequests.AsNoTracking()
            .Where(order => order.Id == orderRequestId)
            .Select(order => new
            {
                order.Status,
                order.Version,
                order.RequestPeriod,
                order.SubmittedAtUtc,
                order.ApprovedAtUtc,
                Items = order.Items.Count,
                Monthly = order.Items.Count(item => item.OrderLineType == OrderLineType.Monthly),
                Outside = order.Items.Count(item => item.OrderLineType == OrderLineType.OutsideMonthly),
                Unclassified = order.Items.Count(item => item.OrderLineType == OrderLineType.Unclassified),
                Amount = order.Items.Sum(item => item.Quantity * (item.UnitPrice ?? 0m)),
            })
            .SingleAsync(None)).ToString()!;

    public async Task InitializeAsync()
    {
        if (PostgresDatabaseFixture.IsConfigured)
        {
            _database = await IsolatedDatabase.CreateAsync("baxorders_confirmed_person");
        }
    }

    public async Task DisposeAsync()
    {
        if (_database is not null)
        {
            await _database.DisposeAsync();
        }
    }
}
