using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Infrastructure.Persistence;
using BaxOrders.Infrastructure.Persistence.Migrations;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Giving 167 years-old requests a responsible person from what their source already said, against a real
/// PostgreSQL.
/// </summary>
/// <remarks>
/// The rule under test is the one the migration ships, run here as the migration runs it: a request is
/// answered only when every one of its imported lines names somebody and every one of those names resolves
/// to the same canonical person. Everything else — a name nobody can resolve, two different people in one
/// request — stays null and goes to a person. So what these tests pin is mostly what the rule <i>refuses</i>
/// to do, because that is where a materialization like this does its damage.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ResponsiblePersonMaterializationTests : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;

    private IsolatedDatabase? _database;

    // ---- what the rule answers ------------------------------------------------------------------------

    [PostgresFact]
    public async Task A_request_whose_every_line_names_one_person_is_given_that_person()
    {
        await using var db = _database!.CreateContext();
        var person = await PersonAsync(db, "Çingiz");
        var order = await ImportedOrders.ImportAsync(db, Line("Çingiz"), Line("Çingiz"), Line("Çingiz"));

        await MaterializeAsync(db);

        Assert.Equal(person, await PersonOfAsync(db, order.OrderRequestId));
    }

    /// <summary>
    /// "Xəyal-Əbülfəz" and "Xəyal - Əbülfəz" are one person written two ways, and the alias table already
    /// says so. Two spellings in one request are not two people.
    /// </summary>
    [PostgresFact]
    public async Task Two_spellings_that_the_alias_table_already_joins_are_one_person()
    {
        await using var db = _database!.CreateContext();
        var person = await PersonAsync(db, "Xəyal Əbülfəz");
        await AliasAsync(db, person, "Xəyal - Əbülfəz");
        await AliasAsync(db, person, "Xəyal-Əbülfəz");
        var order = await ImportedOrders.ImportAsync(db, Line("Xəyal - Əbülfəz"), Line("Xəyal-Əbülfəz"));

        await MaterializeAsync(db);

        Assert.Equal(person, await PersonOfAsync(db, order.OrderRequestId));
    }

    // ---- what the rule refuses ------------------------------------------------------------------------

    /// <summary>
    /// The case this whole task exists to avoid: forty lines say one person and one fuel line says another.
    /// Neither is chosen, because choosing the commoner one would put a name on an order nobody confirmed.
    /// </summary>
    [PostgresFact]
    public async Task Two_genuinely_different_people_in_one_request_leave_it_unanswered()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Çingiz");
        await PersonAsync(db, "Xəyal");
        var order = await ImportedOrders.ImportAsync(
            db, Line("Çingiz"), Line("Çingiz"), Line("Çingiz"), Line("Xəyal"));

        await MaterializeAsync(db);

        Assert.Null(await PersonOfAsync(db, order.OrderRequestId));
    }

    [PostgresFact]
    public async Task A_name_with_no_canonical_person_leaves_the_request_unanswered()
    {
        await using var db = _database!.CreateContext();
        var order = await ImportedOrders.ImportAsync(db, Line("Elmir"), Line("Elmir"));

        await MaterializeAsync(db);

        Assert.Null(await PersonOfAsync(db, order.OrderRequestId));
    }

    /// <summary>One unresolvable name is enough: the rest of the request being readable does not carry it.</summary>
    [PostgresFact]
    public async Task One_unresolvable_name_beside_resolvable_ones_leaves_the_request_unanswered()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Çingiz");
        var order = await ImportedOrders.ImportAsync(db, Line("Çingiz"), Line("Çingiz"), Line("Elmir"));

        await MaterializeAsync(db);

        Assert.Null(await PersonOfAsync(db, order.OrderRequestId));
    }

    [PostgresFact]
    public async Task A_request_whose_source_names_nobody_is_left_unanswered()
    {
        await using var db = _database!.CreateContext();
        var order = await ImportedOrders.ImportAsync(db, Line(null), Line(null));

        await MaterializeAsync(db);

        Assert.Null(await PersonOfAsync(db, order.OrderRequestId));
    }

    /// <summary>A person somebody has already put on a request is never replaced by this.</summary>
    [PostgresFact]
    public async Task A_person_already_recorded_by_hand_is_not_overwritten()
    {
        await using var db = _database!.CreateContext();
        var chosen = await PersonAsync(db, "Xəyal");
        await PersonAsync(db, "Çingiz");
        var order = await ImportedOrders.ImportAsync(db, Line("Çingiz"), Line("Çingiz"));

        await db.Database.ExecuteSqlAsync(
            $"""UPDATE "OrderRequests" SET "ResponsiblePersonId" = {chosen} WHERE "Id" = {order.OrderRequestId}""",
            None);
        await MaterializeAsync(db);

        Assert.Equal(chosen, await PersonOfAsync(db, order.OrderRequestId));
    }

    // ---- what it leaves alone -------------------------------------------------------------------------

    /// <summary>
    /// The source keeps saying what the source said. The raw cell is the audit trail behind the pointer, and
    /// a materialization that rewrote it would leave nothing to check the pointer against.
    /// </summary>
    [PostgresFact]
    public async Task The_raw_name_the_source_wrote_is_left_exactly_as_it_was()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Xəyal Əbülfəz");
        await AliasAsync(db, await PersonAsync(db, "Xəyal Əbülfəz"), "Xəyal - Əbülfəz");
        var order = await ImportedOrders.ImportAsync(db, Line("Xəyal - Əbülfəz"), Line("Xəyal - Əbülfəz"));

        var before = await RawNamesAsync(db, order.OrderRequestId);
        await MaterializeAsync(db);

        Assert.Equal(["Xəyal - Əbülfəz", "Xəyal - Əbülfəz"], before);
        Assert.Equal(before, await RawNamesAsync(db, order.OrderRequestId));
    }

    [PostgresFact]
    public async Task Nothing_about_the_order_itself_moves()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Çingiz");
        var order = await ImportedOrders.ImportAsync(db, Line("Çingiz"), Line("Çingiz"));

        var before = await SnapshotAsync(db, order.OrderRequestId);
        await MaterializeAsync(db);

        Assert.Equal(before, await SnapshotAsync(db, order.OrderRequestId));
    }

    /// <summary>Running it twice moves nothing the second time, and makes no second Qədeş.</summary>
    [PostgresFact]
    public async Task Running_it_again_changes_nothing()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Çingiz");
        var order = await ImportedOrders.ImportAsync(db, Line("Çingiz"), Line("Çingiz"));

        await MaterializeAsync(db);
        var once = await PersonOfAsync(db, order.OrderRequestId);
        var people = await db.ResponsiblePeople.CountAsync(None);

        await MaterializeAsync(db);

        Assert.Equal(once, await PersonOfAsync(db, order.OrderRequestId));
        Assert.Equal(people, await db.ResponsiblePeople.CountAsync(None));
    }

    // ---- the world ------------------------------------------------------------------------------------

    private static OrderLine Line(string? person) => new(Person: person, Price: 2, Quantity: 3);

    /// <summary>The migration's own rule, run the way the migration runs it.</summary>
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

    /// <summary>A canonical person, created once and found by the key the resolution uses.</summary>
    private static async Task<int> PersonAsync(BaxOrdersDbContext db, string name)
    {
        var normalized = TextNormalizer.Normalize(name);
        if (await db.ResponsiblePeople.SingleOrDefaultAsync(p => p.NormalizedName == normalized, None) is { } found)
        {
            return found.Id;
        }

        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO "ResponsiblePeople" ("Name", "NormalizedName", "IsActive", "CreatedAtUtc", "UpdatedAtUtc")
            VALUES ({name}, {normalized}, TRUE, NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC')
            """, None);
        return (await db.ResponsiblePeople.AsNoTracking()
            .SingleAsync(p => p.NormalizedName == normalized, None)).Id;
    }

    private static Task AliasAsync(BaxOrdersDbContext db, int personId, string alias)
    {
        var normalized = TextNormalizer.Normalize(alias);
        return db.Database.ExecuteSqlAsync($"""
            INSERT INTO "ResponsiblePersonAliases" ("ResponsiblePersonId", "Alias", "NormalizedAlias", "CreatedAtUtc")
            SELECT {personId}, {alias}, {normalized}, NOW() AT TIME ZONE 'UTC'
            WHERE NOT EXISTS (
                SELECT 1 FROM "ResponsiblePersonAliases" WHERE "NormalizedAlias" = {normalized})
            """, None);
    }

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
    private static async Task<string> SnapshotAsync(BaxOrdersDbContext db, long orderRequestId)
    {
        var request = await db.OrderRequests.AsNoTracking()
            .Where(order => order.Id == orderRequestId)
            .Select(order => new
            {
                order.Status,
                order.Version,
                order.RequestPeriod,
                order.RequestDate,
                order.SubmittedAtUtc,
                order.ApprovedAtUtc,
                Items = order.Items.Count,
                Monthly = order.Items.Count(item => item.OrderLineType == OrderLineType.Monthly),
                Outside = order.Items.Count(item => item.OrderLineType == OrderLineType.OutsideMonthly),
                Unclassified = order.Items.Count(item => item.OrderLineType == OrderLineType.Unclassified),
                Amount = order.Items.Sum(item => item.Quantity * (item.UnitPrice ?? 0m)),
                Events = db.Set<OrderRequestWorkflowEvent>().Count(e => e.OrderRequestId == orderRequestId),
            })
            .SingleAsync(None);

        return request.ToString()!;
    }

    public async Task InitializeAsync()
    {
        if (PostgresDatabaseFixture.IsConfigured)
        {
            _database = await IsolatedDatabase.CreateAsync("baxorders_responsible_person");
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
