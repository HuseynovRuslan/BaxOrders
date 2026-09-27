using BaxOrders.Application.Orders;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Infrastructure.Persistence;
using BaxOrders.Infrastructure.Persistence.Migrations;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Who asked for each line, from the workbook cell through to what the order screen reads, against a real
/// PostgreSQL.
/// </summary>
/// <remarks>
/// The import has always resolved "Cavabdeh şəxs" per row and then dropped the answer, because a request has
/// one place for a person and a group of rows may name several. These tests pin the two halves of fixing that:
/// the confirmation now keeps what the row resolved to, and the historical backfill — the migration's own
/// statement, not a copy — fills the same value in for lines imported before the column existed.
/// <para>
/// The request-level field is untouched by all of it. It means an explicit assignment, and where there is none
/// the screen reads the lines: one person, several, or nobody. Never the person with the most lines.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class LineResponsiblePersonTests : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;

    private IsolatedDatabase? _database;

    // ---- what the import now keeps --------------------------------------------------------------------

    [PostgresFact]
    public async Task A_confirmed_import_keeps_the_person_its_row_resolved_to()
    {
        await using var db = _database!.CreateContext();
        var eldar = await PersonAsync(db, "Eldar");
        var order = await ImportedOrders.ImportAsync(db, Line("Eldar"), Line("Eldar"));

        var people = await LinePeopleAsync(db, order.OrderRequestId);

        Assert.Equal([eldar, eldar], people);
    }

    /// <summary>
    /// The case the whole shape exists for: one request, two people, and both survive the import. Before this
    /// both lines arrived answerable to nobody and the request looked unassigned.
    /// </summary>
    [PostgresFact]
    public async Task One_request_keeps_the_lines_of_two_different_people()
    {
        await using var db = _database!.CreateContext();
        var eldar = await PersonAsync(db, "Eldar");
        var cingiz = await PersonAsync(db, "Çingiz");
        var order = await ImportedOrders.ImportAsync(db, Line("Eldar"), Line("Eldar"), Line("Çingiz"));

        var people = await LinePeopleAsync(db, order.OrderRequestId);

        Assert.Equal(2, people.Distinct().Count());
        Assert.Equal(2, people.Count(id => id == eldar));
        Assert.Equal(1, people.Count(id => id == cingiz));
    }

    /// <summary>A name nobody has a record for imports the line with nobody on it, and creates no person.</summary>
    [PostgresFact]
    public async Task A_name_with_no_canonical_record_leaves_the_line_with_nobody_and_creates_nobody()
    {
        await using var db = _database!.CreateContext();
        var order = await ImportedOrders.ImportAsync(db, Line("Qədeş"));

        Assert.Equal([null], await LinePeopleAsync(db, order.OrderRequestId));
        Assert.False(await db.ResponsiblePeople.AnyAsync(person => person.NormalizedName == "qədeş", None));
    }

    [PostgresFact]
    public async Task An_empty_cell_imports_the_line_with_nobody_on_it()
    {
        await using var db = _database!.CreateContext();
        var order = await ImportedOrders.ImportAsync(db, Line(null));

        Assert.Equal([null], await LinePeopleAsync(db, order.OrderRequestId));
    }

    /// <summary>Two spellings the alias table already joins are one person on both lines.</summary>
    [PostgresFact]
    public async Task Two_spellings_the_alias_table_joins_reach_the_same_person()
    {
        await using var db = _database!.CreateContext();
        var person = await PersonAsync(db, "Xəyal Əbülfəz");
        await AliasAsync(db, person, "Xəyal - Əbülfəz");
        var order = await ImportedOrders.ImportAsync(db, Line("Xəyal Əbülfəz"), Line("Xəyal - Əbülfəz"));

        Assert.Equal([person, person], await LinePeopleAsync(db, order.OrderRequestId));
    }

    // ---- the historical backfill ----------------------------------------------------------------------

    /// <summary>
    /// The migration's own statement, over lines that have a source row but no person — which is the state
    /// every historical line was in. The answer comes from the row, so nothing has to be listed by hand.
    /// </summary>
    [PostgresFact]
    public async Task The_backfill_fills_a_line_in_from_its_own_source_row()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Eldar");
        var order = await ImportedOrders.ImportAsync(db, Line("Eldar"), Line("Eldar"));
        await ClearLinePeopleAsync(db, order.OrderRequestId);

        await BackfillAsync(db);

        var eldar = await db.ResponsiblePeople.AsNoTracking().SingleAsync(p => p.NormalizedName == "eldar", None);
        Assert.Equal([eldar.Id, eldar.Id], await LinePeopleAsync(db, order.OrderRequestId));
    }

    /// <summary>
    /// The 2466 historical rows whose person did not exist yet when they were imported, so the row carries no
    /// matched id at all. The backfill resolves them by the normalized name the row already stores.
    /// </summary>
    [PostgresFact]
    public async Task A_person_created_after_the_import_is_still_matched_by_the_name_the_row_stored()
    {
        await using var db = _database!.CreateContext();
        var order = await ImportedOrders.ImportAsync(db, Line("Eldar"), Line("Eldar"));
        Assert.Equal([null, null], await LinePeopleAsync(db, order.OrderRequestId));

        var eldar = await PersonAsync(db, "Eldar");
        await BackfillAsync(db);

        Assert.Equal([eldar, eldar], await LinePeopleAsync(db, order.OrderRequestId));
    }

    [PostgresFact]
    public async Task The_backfill_reaches_a_person_through_an_alias_too()
    {
        await using var db = _database!.CreateContext();
        var order = await ImportedOrders.ImportAsync(db, Line("Xəyal - Əbülfəz"));
        var person = await PersonAsync(db, "Xəyal Əbülfəz");
        await AliasAsync(db, person, "Xəyal - Əbülfəz");

        await BackfillAsync(db);

        Assert.Equal([person], await LinePeopleAsync(db, order.OrderRequestId));
    }

    /// <summary>A name nobody can resolve is left alone rather than given the nearest person.</summary>
    [PostgresFact]
    public async Task The_backfill_invents_nobody_for_a_name_it_cannot_resolve()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Eldar");
        var order = await ImportedOrders.ImportAsync(db, Line("Qədeş"));

        await BackfillAsync(db);

        Assert.Equal([null], await LinePeopleAsync(db, order.OrderRequestId));
    }

    /// <summary>A person somebody put on a line by hand is never overwritten, and running it again moves nothing.</summary>
    [PostgresFact]
    public async Task The_backfill_leaves_a_person_recorded_by_hand_alone_and_is_idempotent()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Eldar");
        var cingiz = await PersonAsync(db, "Çingiz");
        var order = await ImportedOrders.ImportAsync(db, Line("Eldar"), Line("Eldar"));
        await ClearLinePeopleAsync(db, order.OrderRequestId);

        // Somebody has already said one of these lines was Çingiz's.
        var first = (await LineIdsAsync(db, order.OrderRequestId))[0];
        await db.Database.ExecuteSqlAsync(
            $"""UPDATE "OrderRequestItems" SET "ResponsiblePersonId" = {cingiz} WHERE "Id" = {first}""", None);

        await BackfillAsync(db);
        var once = await LinePeopleAsync(db, order.OrderRequestId);
        await BackfillAsync(db);

        Assert.Equal(cingiz, once[0]);
        Assert.Equal(once, await LinePeopleAsync(db, order.OrderRequestId));
    }

    /// <summary>
    /// A line added by hand to a correction has no source row, so the backfill has nothing to say about it and
    /// says nothing — rather than borrowing the person of a line beside it.
    /// </summary>
    [PostgresFact]
    public async Task The_backfill_says_nothing_about_a_line_with_no_source_row()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Eldar");
        var order = await ImportedOrders.ImportAsync(db, Line("Eldar"));
        var variant = await db.ProductVariants.AsNoTracking().FirstAsync(None);

        // A line with no materialization behind it, written straight in.
        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO "OrderRequestItems"
                ("OrderRequestId", "ProductVariantId", "Quantity", "PricingMode", "OrderLineType", "CreatedAtUtc")
            VALUES ({order.OrderRequestId}, {variant.Id}, 1, 'PriceRequired', 'Monthly', NOW() AT TIME ZONE 'UTC')
            """, None);

        await BackfillAsync(db);

        var byHand = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.OrderRequestId == order.OrderRequestId
                           && !db.ImportRowMaterializations.Any(link => link.OrderRequestItemId == item.Id))
            .Select(item => item.ResponsiblePersonId)
            .SingleAsync(None);
        Assert.Null(byHand);
    }

    /// <summary>Nothing else about the order moves: not the money, not the classification, not the request row.</summary>
    [PostgresFact]
    public async Task The_backfill_moves_nothing_but_the_person()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Eldar");
        var order = await ImportedOrders.ImportAsync(db, Line("Eldar"), Line("Eldar"));
        await ClearLinePeopleAsync(db, order.OrderRequestId);
        var before = await SnapshotAsync(db, order.OrderRequestId);

        await BackfillAsync(db);

        Assert.Equal(before, await SnapshotAsync(db, order.OrderRequestId));
    }

    /// <summary>The source keeps saying what the source said: the raw cell is the audit trail behind the id.</summary>
    [PostgresFact]
    public async Task The_raw_cell_the_source_wrote_is_left_exactly_as_it_was()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Eldar");
        var order = await ImportedOrders.ImportAsync(db, Line(" ELDAR "));

        await BackfillAsync(db);

        var raw = await db.ImportRows.AsNoTracking()
            .Where(row => db.ImportRowMaterializations.Any(link =>
                link.ImportRowId == row.Id && link.OrderRequestItem.OrderRequestId == order.OrderRequestId))
            .Select(row => row.OriginalResponsiblePersonName)
            .SingleAsync(None);
        Assert.Equal(" ELDAR ", raw);
    }

    // ---- what the order screen reads ------------------------------------------------------------------

    [PostgresFact]
    public async Task An_order_whose_lines_all_name_one_person_reads_as_that_person_s()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Eldar");
        var order = await ImportedOrders.ImportAsync(db, Line("Eldar"), Line("Eldar"));

        var detail = await DetailAsync(db, order.OrderRequestId);

        Assert.Equal(OrderResponsibilityKind.AgreedOnLines, detail.Responsibility.Kind);
        Assert.Equal("Eldar", detail.Responsibility.PersonName);
        Assert.All(detail.Items.Items, item => Assert.Equal("Eldar", item.ResponsiblePersonName));
    }

    /// <summary>
    /// Thirty-seven lines to one person and two to another reads as "several", and each line still says whose
    /// it is. This is the shape of eleven of the historical requests.
    /// </summary>
    [PostgresFact]
    public async Task An_order_whose_lines_name_two_people_reads_as_several_and_names_neither()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Eldar");
        await PersonAsync(db, "Çingiz");
        var order = await ImportedOrders.ImportAsync(db, Line("Eldar"), Line("Eldar"), Line("Eldar"), Line("Çingiz"));

        var detail = await DetailAsync(db, order.OrderRequestId);

        Assert.Equal(OrderResponsibilityKind.Several, detail.Responsibility.Kind);
        Assert.Null(detail.Responsibility.PersonName);
        Assert.Equal(2, detail.Responsibility.DistinctPersonCount);
        Assert.Equal(["Eldar", "Eldar", "Eldar", "Çingiz"], detail.Items.Items.Select(item => item.ResponsiblePersonName));
    }

    /// <summary>
    /// An assignment on the request wins, which is what keeps the two decisions the business made itself. The
    /// lines are not rewritten to agree with it.
    /// </summary>
    [PostgresFact]
    public async Task An_assignment_on_the_request_wins_and_leaves_the_lines_as_they_are()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Eldar");
        var cingiz = await PersonAsync(db, "Çingiz");
        var order = await ImportedOrders.ImportAsync(db, Line("Eldar"), Line("Eldar"));
        await db.Database.ExecuteSqlAsync(
            $"""UPDATE "OrderRequests" SET "ResponsiblePersonId" = {cingiz} WHERE "Id" = {order.OrderRequestId}""", None);

        var detail = await DetailAsync(db, order.OrderRequestId);

        Assert.Equal(OrderResponsibilityKind.Assigned, detail.Responsibility.Kind);
        Assert.Equal("Çingiz", detail.Responsibility.PersonName);
        Assert.All(detail.Items.Items, item => Assert.Equal("Eldar", item.ResponsiblePersonName));
    }

    [PostgresFact]
    public async Task An_order_no_line_names_anybody_on_names_nobody()
    {
        await using var db = _database!.CreateContext();
        var order = await ImportedOrders.ImportAsync(db, Line(null), Line(null));

        var detail = await DetailAsync(db, order.OrderRequestId);

        Assert.Equal(OrderResponsibilityKind.None, detail.Responsibility.Kind);
        Assert.Null(detail.Responsibility.PersonName);
    }

    /// <summary>
    /// The answer is read over every line of the order, not the page on screen. A page holding only one
    /// person's lines must not make a two-person order read as that person's.
    /// </summary>
    [PostgresFact]
    public async Task Paging_cannot_change_whose_order_it_is()
    {
        await using var db = _database!.CreateContext();
        await PersonAsync(db, "Eldar");
        await PersonAsync(db, "Çingiz");
        var order = await ImportedOrders.ImportAsync(db, Line("Eldar"), Line("Eldar"), Line("Çingiz"));

        var firstPage = await DetailAsync(db, order.OrderRequestId, new OrderItemQuery(Page: 1, PageSize: 1));

        Assert.Equal(OrderResponsibilityKind.Several, firstPage.Responsibility.Kind);
        Assert.Single(firstPage.Items.Items);
    }

    // ---- the world ------------------------------------------------------------------------------------

    private static OrderLine Line(string? person) => new(Person: person, Price: 2, Quantity: 3);

    /// <summary>The migration's own backfill, run the way the migration runs it.</summary>
    private static Task BackfillAsync(BaxOrdersDbContext db) =>
        db.Database.ExecuteSqlRawAsync(AddLineLevelResponsiblePerson.BackfillFromSource, None);

    private static async Task<OrderRequestDetailDto> DetailAsync(
        BaxOrdersDbContext db, long orderRequestId, OrderItemQuery? query = null) =>
        (await new OrderRequestQueries(db, ReviewingCoordinator)
            .GetAsync(orderRequestId, query ?? new OrderItemQuery(PageSize: 50), None))!;

    private static async Task<List<int?>> LinePeopleAsync(BaxOrdersDbContext db, long orderRequestId) =>
        await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.OrderRequestId == orderRequestId)
            .OrderBy(item => item.Id)
            .Select(item => item.ResponsiblePersonId)
            .ToListAsync(None);

    private static async Task<List<long>> LineIdsAsync(BaxOrdersDbContext db, long orderRequestId) =>
        await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.OrderRequestId == orderRequestId)
            .OrderBy(item => item.Id)
            .Select(item => item.Id)
            .ToListAsync(None);

    /// <summary>Puts the order back in the state every historical line was in before the backfill.</summary>
    private static Task ClearLinePeopleAsync(BaxOrdersDbContext db, long orderRequestId) =>
        db.Database.ExecuteSqlAsync(
            $"""UPDATE "OrderRequestItems" SET "ResponsiblePersonId" = NULL WHERE "OrderRequestId" = {orderRequestId}""",
            None);

    private static async Task<int> PersonAsync(BaxOrdersDbContext db, string name)
    {
        var normalized = TextNormalizer.Normalize(name);
        if (await db.ResponsiblePeople.AsNoTracking()
                .FirstOrDefaultAsync(person => person.NormalizedName == normalized, None) is { } found)
        {
            return found.Id;
        }

        var person = new ResponsiblePerson(name);
        db.ResponsiblePeople.Add(person);
        await db.SaveChangesAsync(None);
        return person.Id;
    }

    private static Task AliasAsync(BaxOrdersDbContext db, int personId, string alias)
    {
        var normalized = TextNormalizer.Normalize(alias);
        return db.Database.ExecuteSqlAsync($"""
            INSERT INTO "ResponsiblePersonAliases" ("ResponsiblePersonId", "Alias", "NormalizedAlias", "CreatedAtUtc")
            SELECT {personId}, {alias}, {normalized}, NOW() AT TIME ZONE 'UTC'
            WHERE NOT EXISTS (SELECT 1 FROM "ResponsiblePersonAliases" WHERE "NormalizedAlias" = {normalized})
            """, None);
    }

    /// <summary>Everything about the order the backfill may not touch, in one value.</summary>
    private static async Task<string> SnapshotAsync(BaxOrdersDbContext db, long orderRequestId) =>
        (await db.OrderRequests.AsNoTracking()
            .Where(order => order.Id == orderRequestId)
            .Select(order => new
            {
                order.Status,
                order.Version,
                order.RequestPeriod,
                order.ResponsiblePersonId,
                Items = order.Items.Count,
                Monthly = order.Items.Count(item => item.OrderLineType == OrderLineType.Monthly),
                Outside = order.Items.Count(item => item.OrderLineType == OrderLineType.OutsideMonthly),
                Unclassified = order.Items.Count(item => item.OrderLineType == OrderLineType.Unclassified),
                Amount = order.Items.Sum(item => item.Quantity * (item.UnitPrice ?? 0m)),
                Suppliers = order.Items.Count(item => item.SupplierId != null),
                Materializations = db.ImportRowMaterializations
                    .Count(link => link.OrderRequestItem.OrderRequestId == orderRequestId),
            })
            .SingleAsync(None)).ToString()!;

    public async Task InitializeAsync()
    {
        if (PostgresDatabaseFixture.IsConfigured)
        {
            _database = await IsolatedDatabase.CreateAsync("baxorders_line_person");
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
