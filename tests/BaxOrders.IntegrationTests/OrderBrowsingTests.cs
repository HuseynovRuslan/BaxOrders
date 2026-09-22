using BaxOrders.Application.Orders;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Browsing permanent orders: which locations have requests, the history of one, a request with its lines and
/// the audit trail behind a line. Every fixture is synthetic and every assertion is read-only.
/// </summary>
[Collection(SqlServerCollection.Name)]
public sealed class OrderBrowsingTests(SqlServerDatabaseFixture database)
{
    [SqlServerFact]
    public async Task A_location_summarises_its_requests_periods_items_and_known_money()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var history = await Queries(db).GetHistoryAsync(world.LocationId, new LocationHistoryQuery(), CancellationToken.None);

        Assert.NotNull(history);
        Assert.Equal((2, 2), (history!.OrderRequestCount, history.DistinctPeriodCount));
        Assert.Equal((world.May, world.June), (history.EarliestPeriod, history.LatestPeriod));
        Assert.Equal(5, history.TotalItemCount);

        // 2×10 + 3×4 + 1×100 = 132; the two priceless lines add nothing and are counted instead.
        Assert.Equal(132m, history.KnownAmountTotal);
        Assert.Equal(2, history.MissingPriceItemCount);
        Assert.Equal([2026], history.Years);
    }

    [SqlServerFact]
    public async Task Money_never_counts_a_line_whose_price_is_unknown()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var detail = await Detail(db, world.JuneRequestId);

        // Two lines, one of them priceless: the total is the one line that has a price, never a zero for the other.
        Assert.Equal((2, 1, 1), (detail.ItemCount, detail.KnownPriceItemCount, detail.MissingPriceItemCount));
        Assert.Equal(100m, detail.KnownAmountTotal);
    }

    [SqlServerFact]
    public async Task A_location_with_no_request_is_still_listed_and_says_so()
    {
        await using var db = database.CreateContext();
        var empty = await EmptyLocationAsync(db);

        var list = await Queries(db).ListAsync(new LocationOrderListQuery(Search: empty.Name), CancellationToken.None);
        var row = Assert.Single(list.Locations.Items);

        Assert.Equal((0, 0, 0), (row.OrderRequestCount, row.DistinctPeriodCount, row.TotalItemCount));
        Assert.Null(row.KnownAmountTotal);
        Assert.Null(row.LatestPeriod);
        Assert.Null(row.LatestRequestId);
    }

    [SqlServerFact]
    public async Task The_list_searches_by_name_and_by_code()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var queries = Queries(db);

        var byName = await queries.ListAsync(new LocationOrderListQuery(Search: world.LocationName), CancellationToken.None);
        var byCode = await queries.ListAsync(new LocationOrderListQuery(Search: world.LocationCode), CancellationToken.None);

        Assert.Equal(world.LocationId, Assert.Single(byName.Locations.Items).LocationId);
        Assert.Equal(world.LocationId, Assert.Single(byCode.Locations.Items).LocationId);
    }

    [SqlServerFact]
    public async Task The_history_pages_and_keeps_the_newest_period_first()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var first = await Queries(db).GetHistoryAsync(world.LocationId, new LocationHistoryQuery(Page: 1, PageSize: 1), CancellationToken.None);
        var second = await Queries(db).GetHistoryAsync(world.LocationId, new LocationHistoryQuery(Page: 2, PageSize: 1), CancellationToken.None);

        Assert.Equal(2, first!.Requests.TotalCount);
        Assert.Equal(world.June, Assert.Single(first.Requests.Items).RequestPeriod);
        Assert.Equal(world.May, Assert.Single(second!.Requests.Items).RequestPeriod);
    }

    [SqlServerFact]
    public async Task The_month_filter_reads_the_period_not_the_request_date()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var june = await Queries(db).GetHistoryAsync(world.LocationId, new LocationHistoryQuery(Year: 2026, Month: 6), CancellationToken.None);
        var entry = Assert.Single(june!.Requests.Items);

        Assert.Equal(world.June, entry.RequestPeriod);

        // The imported request has no request date at all, so a date filter could never have found it.
        Assert.Null(entry.RequestDate);
    }

    [SqlServerFact]
    public async Task Two_versions_of_one_period_stay_two_rows()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var submitted = await db.OrderRequests.Include(request => request.Location).SingleAsync(request => request.Id == world.MayRequestId);
        submitted.SubmitForApproval(WorkflowActor.System("Test"), null, DateTime.UtcNow);
        var next = submitted.CreateNextVersion();
        next.AddItem(await db.ProductVariants.SingleAsync(variant => variant.Id == world.VariantId), 1m, 1m);
        db.OrderRequests.Add(next);
        await db.SaveChangesAsync();

        var history = await Queries(db).GetHistoryAsync(world.LocationId, new LocationHistoryQuery(Year: 2026, Month: 5), CancellationToken.None);
        var rows = history!.Requests.Items;

        Assert.Equal(2, rows.Count);
        Assert.Equal([2, 1], rows.Select(row => row.Version).ToList());
        Assert.All(rows, row => Assert.Equal(world.May, row.RequestPeriod));
    }

    [SqlServerFact]
    public async Task An_order_shows_its_header_and_pages_its_lines_in_source_order()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var detail = await Detail(db, world.MayRequestId, new OrderItemQuery(PageSize: 2));

        Assert.Equal((world.LocationName, world.May, 1, OrderRequestStatus.Draft), (detail.LocationName, detail.RequestPeriod, detail.Version, detail.Status));
        Assert.Null(detail.RequestDate);
        Assert.Equal(3, detail.Items.TotalCount);
        Assert.Equal(2, detail.Items.Items.Count);

        // The sheet's own order, not the alphabet.
        var rowNumbers = detail.Items.Items.Select(item => item.Source!.RowNumber).ToList();
        Assert.Equal(rowNumbers.OrderBy(number => number).ToList(), rowNumbers);
    }

    [SqlServerFact]
    public async Task Lines_can_be_searched_by_product_name_code_and_model()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var byName = await Detail(db, world.MayRequestId, new OrderItemQuery(Search: world.ChainProduct));
        var byModel = await Detail(db, world.MayRequestId, new OrderItemQuery(Search: "MDL-28"));
        var byCode = await Detail(db, world.MayRequestId, new OrderItemQuery(Search: byName.Items.Items[0].ProductCode));

        Assert.Equal(1, byName.Items.TotalCount);
        Assert.Equal(1, byModel.Items.TotalCount);
        Assert.Equal(1, byCode.Items.TotalCount);
        Assert.Equal(byName.Items.Items[0].OrderRequestItemId, byModel.Items.Items[0].OrderRequestItemId);
    }

    [SqlServerFact]
    public async Task Lines_can_be_filtered_by_supplier_and_by_whether_the_price_is_known()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var priced = await Detail(db, world.MayRequestId, new OrderItemQuery(HasPrice: true));
        var priceless = await Detail(db, world.MayRequestId, new OrderItemQuery(HasPrice: false));
        var bySupplier = await Detail(db, world.MayRequestId, new OrderItemQuery(SupplierId: world.SupplierId));

        Assert.Equal(2, priced.Items.TotalCount);
        Assert.Equal(1, priceless.Items.TotalCount);
        Assert.All(priceless.Items.Items, item => Assert.Null(item.UnitPrice));
        Assert.Equal(1, bySupplier.Items.TotalCount);
    }

    [SqlServerFact]
    public async Task A_line_carries_everything_the_screen_needs()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var items = (await Detail(db, world.MayRequestId)).Items.Items;

        var material = Assert.Single(items, item => item.ProductName == world.MaterialProduct && item.UnitPrice != null);
        Assert.Equal((2m, 10m, 20m), (material.Quantity, material.UnitPrice, material.LineTotal));
        Assert.Equal(("PCS", "Ədəd"), (material.OrderUnitCode, material.OrderUnitName));
        Assert.Equal(world.SupplierName, material.SupplierName);
        Assert.Equal(["Təmizlik", world.CategoryLeaf], material.CategoryPath);

        // A descriptor is not a unit: it travels next to the specification value instead.
        var chain = Assert.Single(items, item => item.ProductName == world.ChainProduct);
        Assert.Equal(("28", "diş", "MDL-28"), (chain.SpecificationValue, chain.SpecificationDescriptor, chain.ModelCode));
        Assert.Null(chain.SpecificationUnitCode);

        var priceless = Assert.Single(items, item => item.UnitPrice is null);
        Assert.Null(priceless.LineTotal);
        Assert.Null(priceless.SupplierId);
        Assert.Null(priceless.SupplierName);
    }

    [SqlServerFact]
    public async Task A_service_line_keeps_its_month_unit_and_a_unitless_line_keeps_none()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var items = (await Detail(db, world.JuneRequestId)).Items.Items;

        var monthly = Assert.Single(items, item => item.OrderUnitCode == world.MonthUnitCode);
        Assert.Equal(100m, monthly.UnitPrice);

        var unitless = Assert.Single(items, item => item.OrderUnitCode is null);
        Assert.Null(unitless.OrderUnitName);
        Assert.Null(unitless.UnitPrice);
    }

    [SqlServerFact]
    public async Task A_line_points_back_at_the_exact_row_the_sheet_had()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var item = (await Detail(db, world.MayRequestId)).Items.Items[0];

        var source = await new OrderRequestQueries(db).GetItemSourceAsync(item.OrderRequestItemId, CancellationToken.None);

        Assert.NotNull(source);
        Assert.Equal(item.OrderRequestItemId, source!.OrderRequestItemId);
        Assert.Equal((item.Source!.ImportRowId, item.Source.SheetName, item.Source.RowNumber), (source.ImportRowId, source.SheetName, source.RowNumber));
        Assert.False(source.IsExcluded);

        var product = Assert.Single(source.Fields, field => field.Column == "Malın adı");
        Assert.Equal(item.ProductName, product.SourceValue);
        Assert.Contains(item.ProductCode, product.CanonicalValue);
    }

    [SqlServerFact]
    public async Task A_correction_is_visible_next_to_the_value_the_sheet_had()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var source = await new OrderRequestQueries(db).GetItemSourceAsync(world.CorrectedItemId, CancellationToken.None);
        var unit = Assert.Single(source!.Fields, field => field.Column == "Ö/v");

        // The sheet said nothing; an operator said "ədəd". Both are shown, and the workbook value is not rewritten.
        Assert.Equal((string.Empty, "ədəd", true), (unit.SourceValue ?? string.Empty, unit.EffectiveValue, unit.IsCorrected));
        Assert.False(unit.IsIntentionallyEmpty);

        // The canonical column of a resolved value is filled in as well; the product proves it on the same row.
        var product = Assert.Single(source.Fields, field => field.Column == "Malın adı");
        Assert.Contains("PRD-", product.CanonicalValue);
    }

    [SqlServerFact]
    public async Task Unknown_things_answer_with_nothing_instead_of_failing()
    {
        await using var db = database.CreateContext();
        var queries = Queries(db);
        var orders = new OrderRequestQueries(db);

        Assert.Null(await queries.GetHistoryAsync(-1, new LocationHistoryQuery(), CancellationToken.None));
        Assert.Null(await orders.GetAsync(-1, new OrderItemQuery(), CancellationToken.None));
        Assert.Null(await orders.GetItemSourceAsync(-1, CancellationToken.None));
    }

    [SqlServerFact]
    public async Task A_page_size_beyond_the_limit_is_capped()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        var detail = await Detail(db, world.MayRequestId, new OrderItemQuery(PageSize: 10_000));

        Assert.Equal(LocationOrderQueries.MaxPageSize, detail.Items.PageSize);
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private sealed record World(
        int LocationId,
        string LocationCode,
        string LocationName,
        DateOnly May,
        DateOnly June,
        long MayRequestId,
        long JuneRequestId,
        long VariantId,
        int SupplierId,
        string SupplierName,
        string MaterialProduct,
        string ChainProduct,
        string MonthUnitCode,
        string CategoryLeaf,
        long CorrectedItemId);

    private static LocationOrderQueries Queries(BaxOrdersDbContext db) => new(db);

    private static async Task<OrderRequestDetailDto> Detail(BaxOrdersDbContext db, long id, OrderItemQuery? query = null) =>
        await new OrderRequestQueries(db).GetAsync(id, query ?? new OrderItemQuery(), CancellationToken.None)
        ?? throw new InvalidOperationException($"Order request #{id} was not found.");

    private static async Task<Location> EmptyLocationAsync(BaxOrdersDbContext db)
    {
        var location = new Location(await new SqlServerLocationCodeGenerator(db).NextAsync(CancellationToken.None), $"Boş obyekt {Unique()}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();
        return location;
    }

    /// <summary>
    /// Two months of one location, built the way the importer builds them — including the provenance links, a
    /// correction, a priceless line, a descriptor variant, a monthly service and a unitless service.
    /// </summary>
    private static async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Unique();
        var may = new DateOnly(2026, 5, 1);
        var june = new DateOnly(2026, 6, 1);

        // Codes come from the same sequences production uses; they have a fixed shape the domain enforces.
        var locationCodes = new SqlServerLocationCodeGenerator(db);
        var productCodes = new SqlServerProductCodeGenerator(db);
        var location = new Location(await locationCodes.NextAsync(CancellationToken.None), $"Obyekt {tag}");
        var supplier = new Supplier($"Təchizatçı {tag}");
        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        // The symbol is indexed catalogue-wide, so it carries the tag as well: a bare "ay" would follow every
        // other test in the suite.
        var month = new UnitOfMeasure($"MN{tag[..4].ToUpperInvariant()}", $"Ay {tag}", $"ay{tag}", UnitType.Other);

        var cleaning = Category.CreateRoot($"Təmizlik");
        var supplies = cleaning.AddChild("Təmizlik ləvazimatı");

        var material = new Product(await productCodes.NextAsync(CancellationToken.None), $"Mop {tag}");
        var chain = new Product(await productCodes.NextAsync(CancellationToken.None), $"Sep {tag}");
        var toilet = new Product(await productCodes.NextAsync(CancellationToken.None), $"Ayaqyolu pulu {tag}");
        var repair = new Product(await productCodes.NextAsync(CancellationToken.None), $"Təmir işləri {tag}");

        // The real category tree is shared, so the fixture reuses an existing root when one is already there.
        var existingRoot = await db.Categories.FirstOrDefaultAsync(item => item.ParentId == null && item.Name == "Təmizlik");
        if (existingRoot is null)
        {
            db.Categories.Add(cleaning);
        }
        else
        {
            supplies = existingRoot.AddChild($"Təmizlik ləvazimatı {tag}");
        }

        db.AddRange(location, supplier, month, material, chain, toilet, repair);
        await db.SaveChangesAsync();

        material.ChangeCategory(supplies);

        var materialVariant = material.AddVariant(null, null, null, pieces);
        var chainVariant = chain.AddVariant("28", null, "MDL-28", pieces, "diş");
        var monthVariant = toilet.AddVariant(null, null, null, month);
        var unitlessVariant = repair.AddVariant(null, null, null, null);
        await db.SaveChangesAsync();

        var mayRequest = new OrderRequest(location, may);
        var materialItem = mayRequest.AddItem(materialVariant, 2m, 10m, supplier);
        var chainItem = mayRequest.AddItem(chainVariant, 3m, 4m);
        var pricelessItem = mayRequest.AddItem(materialVariant, 5m, null);

        var juneRequest = new OrderRequest(location, june);
        var monthItem = juneRequest.AddItem(monthVariant, 1m, 100m);
        var unitlessItem = juneRequest.AddItem(unitlessVariant, 1m, null);

        db.OrderRequests.AddRange(mayRequest, juneRequest);
        await db.SaveChangesAsync();

        // Provenance, exactly as the confirmation writes it, so the read model has real rows to follow.
        var batchId = await StageAsync(
            db,
            // The sheet left the order unit empty on this line; the operator filled it in afterwards.
            new OrderLine(Product: material.Name, Location: location.Name, OrderUnit: null),
            new OrderLine(Product: chain.Name, Location: location.Name),
            new OrderLine(Product: material.Name, Location: location.Name, Price: null),
            new OrderLine(Product: toilet.Name, Location: location.Name),
            new OrderLine(Product: repair.Name, Location: location.Name, OrderUnit: null));

        var batch = await db.ImportBatches.SingleAsync(item => item.Id == batchId);
        var rows = await db.ImportRows.Include(row => row.Corrections)
            .Where(row => row.ImportBatchId == batchId).OrderBy(row => row.RowNumber).ToListAsync();

        // One row carries a correction, so the provenance screen has one to show.
        rows[0].SetCorrection(ImportCorrectionField.OrderUnit, "ədəd");

        var materialization = new ImportMaterialization(batch, DateTime.UtcNow);
        materialization.AddGroup(location.Id, may, MaterializationAction.Created, mayRequest, 3, null);
        materialization.AddGroup(location.Id, june, MaterializationAction.Created, juneRequest, 2, null);
        materialization.AddRow(rows[0], materialItem, DateTime.UtcNow);
        materialization.AddRow(rows[1], chainItem, DateTime.UtcNow);
        materialization.AddRow(rows[2], pricelessItem, DateTime.UtcNow);
        materialization.AddRow(rows[3], monthItem, DateTime.UtcNow);
        materialization.AddRow(rows[4], unitlessItem, DateTime.UtcNow);
        db.ImportMaterializations.Add(materialization);
        await db.SaveChangesAsync();

        return new World(
            location.Id, location.Code, location.Name, may, june,
            mayRequest.Id, juneRequest.Id, materialVariant.Id,
            supplier.Id, supplier.Name, material.Name, chain.Name, month.Code, supplies.Name, materialItem.Id);
    }

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];
}
