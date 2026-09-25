using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Confirmation;
using BaxOrders.Application.Imports.Pricing;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Application.Orders.Pricing;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Pricing classification during import review (brief 16), against a real PostgreSQL: a person says, row by row,
/// whether an unpriced row is bought or supplied free; every import count speaks Task 2's rule; the confirmation
/// writes «Təsnif edilməyib» for the rest and never reads a source; the counts on Qiymət təsnifatı add up afterwards;
/// and what was said at import can be corrected there.
/// </summary>
/// <remarks>
/// Every workbook here is synthetic and every test has its own products and objects. Qiymət təsnifatı's totals are
/// read before and after on the shared database, which is safe because the database tests run one at a time.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ImportPricingClassificationTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    private static readonly TestCurrentUser Leyla = new(Guid.NewGuid(), "Leyla Koordinator", BaxOrdersRoles.Coordinator);
    private static readonly TestCurrentUser Rauf = new(Guid.NewGuid(), "Rauf Admin", BaxOrdersRoles.Admin);

    // ---- criterion 2: classify and list, at the service ---------------------------------------------------

    [PostgresFact]
    public async Task The_list_holds_only_the_included_unpriced_rows_with_totals_that_ignore_the_filter()
    {
        await using var db = database.CreateContext();
        var world = await ClassifiedWorldAsync(db);
        var service = PricingService(db, Leyla);

        var all = (await service.GetAsync(world.BatchId, new ImportPricingQuery(), None))!;

        // Nine unpriced rows still part of the import; not the three priced ones, not the excluded one.
        Assert.Equal(world.Ids(Unpriced), all.Rows.Select(row => row.ImportRowId).Order().ToArray());
        Assert.Equal(9, all.TotalCount);
        Assert.Equal((5, 2, 2), (all.Unclassified, all.PriceRequired, all.InternalFreeSupply));

        foreach (var (mode, expected) in new (PricingMode, string[])[]
        {
            (PricingMode.Unresolved, ["store", "qala", "azpetrol", "unusable", "second.open"]),
            (PricingMode.PriceRequired, ["bought", "second.bought"]),
            (PricingMode.InternalFreeSupply, ["free", "second.free"]),
        })
        {
            var filtered = (await service.GetAsync(world.BatchId, new ImportPricingQuery(mode), None))!;

            Assert.Equal(world.Ids(expected), filtered.Rows.Select(row => row.ImportRowId).Order().ToArray());
            Assert.Equal(expected.Length, filtered.TotalCount);
            // The totals are the whole batch's, whatever is being looked at.
            Assert.Equal((5, 2, 2), (filtered.Unclassified, filtered.PriceRequired, filtered.InternalFreeSupply));
        }
    }

    [PostgresFact]
    public async Task Each_row_carries_what_the_decision_needs_and_who_said_what()
    {
        await using var db = database.CreateContext();
        var world = await ClassifiedWorldAsync(db);

        var all = (await PricingService(db, Leyla).GetAsync(world.BatchId, new ImportPricingQuery(), None))!;
        var qala = all.Rows.Single(row => row.ImportRowId == world.Row["qala"]);
        var store = all.Rows.Single(row => row.ImportRowId == world.Row["store"]);
        var bought = all.Rows.Single(row => row.ImportRowId == world.Row["bought"]);

        Assert.Equal(world.Home, qala.LocationName);
        Assert.Equal(world.Product, qala.ProductName);
        Assert.Equal(3m, qala.Quantity);
        Assert.Equal(world.Period, qala.RequestPeriod);
        Assert.Equal("Qala baza", qala.WorkbookSupplierName);
        Assert.Equal((null, null, null), (qala.Classification, qala.ClassifiedByDisplayName, qala.ClassifiedAtUtc));

        Assert.Equal(world.StoreName, store.SupplierName);
        Assert.Equal(world.StoreName, store.WorkbookSupplierName);
        Assert.Null(store.Classification);

        Assert.Equal(PricingMode.PriceRequired, bought.Classification);
        Assert.Equal("Leyla Koordinator", bought.ClassifiedByDisplayName);
        Assert.NotNull(bought.ClassifiedAtUtc);
        Assert.Equal("Əsas", bought.SheetName);
    }

    [PostgresFact]
    public async Task Rows_are_listed_by_object_then_row_and_every_page_is_stable()
    {
        await using var db = database.CreateContext();
        var world = await ClassifiedWorldAsync(db);
        var service = PricingService(db, Leyla);

        var expected = world.Ids(Unpriced, ordered: true);
        var pages = new List<long>();
        for (var page = 1; page <= 3; page++)
        {
            var result = (await service.GetAsync(world.BatchId, new ImportPricingQuery(Page: page, PageSize: 4), None))!;
            Assert.Equal(9, result.TotalCount);
            pages.AddRange(result.Rows.Select(row => row.ImportRowId));
        }

        // Month, then object ("A …" before "B …"), then product, then the row: no row twice, none skipped.
        Assert.Equal(expected, pages.ToArray());
        Assert.Empty((await service.GetAsync(world.BatchId, new ImportPricingQuery(Page: 4, PageSize: 4), None))!.Rows);
    }

    [PostgresFact]
    public async Task The_search_finds_the_workbook_text_and_the_matched_names()
    {
        await using var db = database.CreateContext();
        var world = await ClassifiedWorldAsync(db);
        var service = PricingService(db, Leyla);

        async Task<long[]> Find(string search) =>
            (await service.GetAsync(world.BatchId, new ImportPricingQuery(Search: search), None))!
            .Rows.Select(row => row.ImportRowId).Order().ToArray();

        Assert.Equal(world.Ids("qala"), await Find("qala baza"));
        Assert.Equal(world.Ids("azpetrol"), await Find("AZPETROL"));
        Assert.Equal(world.Ids("store"), await Find(world.StoreName));
        Assert.Equal(world.Ids("second.open", "second.bought", "second.free"), await Find(world.Second));

        var searched = (await service.GetAsync(world.BatchId, new ImportPricingQuery(PricingMode.Unresolved, "baza"), None))!;
        Assert.Equal(2, searched.TotalCount);
        Assert.Equal((5, 2, 2), (searched.Unclassified, searched.PriceRequired, searched.InternalFreeSupply));
    }

    [PostgresFact]
    public async Task An_import_that_does_not_exist_has_no_list()
    {
        await using var db = database.CreateContext();

        Assert.Null(await PricingService(db, Leyla).GetAsync(-1, new ImportPricingQuery(), None));
    }

    [PostgresFact]
    public async Task Rows_are_set_changed_and_cleared_and_each_answer_returns_the_refreshed_preview()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var rows = world.Ids("bought", "second.bought");

        var set = await PricingService(db, Leyla).SetAsync(world.BatchId, new SetImportPricingCommand(rows, PricingMode.PriceRequired), None);
        Assert.Equal((2, 0, PricingMode.PriceRequired), (set.Changed, set.Unchanged, set.PricingMode));
        Assert.Equal(world.BatchId, set.Preview.Batch.Id);

        var again = await PricingService(db, Rauf).SetAsync(world.BatchId, new SetImportPricingCommand(rows, PricingMode.PriceRequired), None);
        Assert.Equal((0, 2), (again.Changed, again.Unchanged));
        Assert.Equal(("Leyla Koordinator", PricingMode.PriceRequired), await ClassificationOfAsync(world.Row["bought"]));

        var changed = await PricingService(db, Rauf).SetAsync(
            world.BatchId, new SetImportPricingCommand([world.Row["bought"]], PricingMode.InternalFreeSupply), None);
        Assert.Equal((1, 0), (changed.Changed, changed.Unchanged));
        Assert.Equal(("Rauf Admin", PricingMode.InternalFreeSupply), await ClassificationOfAsync(world.Row["bought"]));

        // The refreshed preview already counts it: of the home group's seven unpriced rows, one is now set aside.
        var home = changed.Preview.Groups.Single(group => group.LocationId == world.HomeId);
        Assert.Equal((6, 1), (home.MissingPriceRows, home.InternalSupplyRows));

        var cleared = await PricingService(db, Leyla).SetAsync(
            world.BatchId, new SetImportPricingCommand([world.Row["bought"]], PricingMode.Unresolved), None);
        Assert.Equal((1, 0, PricingMode.Unresolved), (cleared.Changed, cleared.Unchanged, cleared.PricingMode));
        Assert.Equal((null, null), await ClassificationOfAsync(world.Row["bought"]));

        var clearedAgain = await PricingService(db, Leyla).SetAsync(
            world.BatchId, new SetImportPricingCommand([world.Row["bought"]], PricingMode.Unresolved), None);
        Assert.Equal((0, 1), (clearedAgain.Changed, clearedAgain.Unchanged));

        await using var check = database.CreateContext();
        var stored = await check.ImportRows.AsNoTracking().SingleAsync(row => row.Id == world.Row["bought"]);
        Assert.Equal((null, null, null, null),
            (stored.PricingClassification, stored.PricingClassifiedByUserId, stored.PricingClassifiedByDisplayName, stored.PricingClassifiedAtUtc));
    }

    [PostgresFact]
    public async Task Classifying_writes_the_four_columns_and_nothing_else()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        var before = await FingerprintAsync(world.BatchId);

        await PricingService(db, Leyla).SetAsync(
            world.BatchId, new SetImportPricingCommand(world.Ids("bought", "free", "second.open"), PricingMode.InternalFreeSupply), None);
        await PricingService(db, Leyla).SetAsync(
            world.BatchId, new SetImportPricingCommand(world.Ids("free"), PricingMode.Unresolved), None);

        // No value, issue, match, status, counter, correction or resolution moved; the batch is as ready as it was.
        Assert.Equal(before, await FingerprintAsync(world.BatchId));

        await using var check = database.CreateContext();
        var stored = await check.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == world.BatchId && row.PricingClassification != null)
            .Select(row => row.Id)
            .ToListAsync();
        Assert.Equal(world.Ids("bought", "second.open"), stored.Order().ToArray());
    }

    [PostgresFact]
    public async Task Every_refusal_is_answered_before_anything_is_written()
    {
        await using var db = database.CreateContext();
        var world = await ClassifiedWorldAsync(db);
        var other = await WorldAsync(db);
        var before = await ClassificationsAsync(world.BatchId);

        Task<ImportPricingResult> Set(IReadOnlyList<long> ids, PricingMode mode, ICurrentUserContext? user = null) =>
            PricingService(db, user ?? Leyla).SetAsync(world.BatchId, new SetImportPricingCommand(ids, mode), None);

        await Assert.ThrowsAsync<ValidationException>(() => Set([], PricingMode.PriceRequired));
        await Assert.ThrowsAsync<ValidationException>(() => Set(world.Ids("qala"), (PricingMode)99));
        await Assert.ThrowsAsync<NotFoundException>(() => Set([world.Row["qala"], other.Row["qala"]], PricingMode.PriceRequired));
        await Assert.ThrowsAsync<NotFoundException>(() => Set([-1], PricingMode.PriceRequired));
        await Assert.ThrowsAsync<DomainException>(() => Set([world.Row["qala"], world.Row["excluded"]], PricingMode.PriceRequired));
        await Assert.ThrowsAsync<DomainException>(() => Set([world.Row["qala"], world.Row["priced"]], PricingMode.PriceRequired));
        await Assert.ThrowsAsync<ForbiddenException>(() => Set(world.Ids("qala"), PricingMode.PriceRequired, TestCurrentUser.Anonymous()));
        await Assert.ThrowsAsync<NotFoundException>(() =>
            PricingService(db, Leyla).SetAsync(-1, new SetImportPricingCommand(world.Ids("qala"), PricingMode.PriceRequired), None));

        Assert.Equal(before, await ClassificationsAsync(world.BatchId));
        Assert.Equal((null, null), await ClassificationOfAsync(other.Row["qala"]));
    }

    [PostgresFact]
    public async Task An_imported_batch_is_no_longer_classified()
    {
        await using var db = database.CreateContext();
        var world = await ClassifiedWorldAsync(db);
        await ConfirmationService(db).ConfirmAsync(world.BatchId, new ImportConfirmationCommand([]), None);

        await Assert.ThrowsAsync<DomainException>(() => PricingService(db, Leyla).SetAsync(
            world.BatchId, new SetImportPricingCommand(world.Ids("qala"), PricingMode.InternalFreeSupply), None));

        Assert.Equal((null, null), await ClassificationOfAsync(world.Row["qala"]));
    }

    // ---- criterion 3: every import count speaks Task 2 -----------------------------------------------------

    [PostgresFact]
    public async Task Readiness_the_previews_and_the_result_count_the_same_three_states()
    {
        await using var db = database.CreateContext();
        var world = await ClassifiedWorldAsync(db);

        var readiness = (await ReadinessQueries(db).GetReadinessAsync(world.BatchId, None))!;
        var preview = (await ConfirmationPlanner(db).PreviewAsync(world.BatchId, None))!;
        var staging = (await new Application.Imports.ImportPreviewQueries(db).GetPreviewAsync(world.BatchId, None))!;

        // Unclassified: the store's, Qala's, Azpetrol's and the unusable price at home, one in the second group.
        // Bought: one in each group. Supplied free: one in each group. The excluded row is in none of them.
        Assert.True(readiness.CanImport);
        Assert.Equal((7, 5, 2, 2), (readiness.Warnings.MissingPrice, readiness.Warnings.UnclassifiedPrice,
            readiness.Warnings.PriceRequired, readiness.Warnings.PriceNotRequired));
        Assert.Equal(1, readiness.Warnings.InvalidPrice);

        Assert.Equal((7, 5, 2, 2), (preview.MissingPriceRows, preview.UnclassifiedPriceRows, preview.PriceRequiredRows, preview.InternalSupplyRows));
        Assert.Equal(preview.UnclassifiedPriceRows + preview.PriceRequiredRows, preview.MissingPriceRows);

        var home = preview.Groups.Single(group => group.LocationId == world.HomeId);
        var second = preview.Groups.Single(group => group.LocationId == world.SecondId);
        Assert.Equal((5, 4, 1, 1), (home.MissingPriceItemCount, home.UnclassifiedPriceItemCount, home.PriceRequiredItemCount, home.InternalSupplyItemCount));
        Assert.Equal((2, 1, 1, 1), (second.MissingPriceItemCount, second.UnclassifiedPriceItemCount, second.PriceRequiredItemCount, second.InternalSupplyItemCount));

        var stagingHome = staging.Groups.Single(group => group.LocationId == world.HomeId);
        var stagingSecond = staging.Groups.Single(group => group.LocationId == world.SecondId);
        Assert.Equal((5, 1), (stagingHome.MissingPriceRows, stagingHome.InternalSupplyRows));
        Assert.Equal((2, 1), (stagingSecond.MissingPriceRows, stagingSecond.InternalSupplyRows));

        var result = await ConfirmationService(db).ConfirmAsync(world.BatchId, new ImportConfirmationCommand([]), None);
        Assert.Equal((7, 5, 2, 2), (result.MissingPriceItems, result.UnclassifiedPriceItems, result.PriceRequiredItems, result.InternalSupplyItems));

        // A replay writes nothing new and, as before, reports no counts of its own.
        var replay = await ConfirmationService(db).ConfirmAsync(world.BatchId, new ImportConfirmationCommand([]), None);
        Assert.True(replay.AlreadyImported);
        Assert.Equal((0, 0, 0, 0), (replay.MissingPriceItems, replay.UnclassifiedPriceItems, replay.PriceRequiredItems, replay.InternalSupplyItems));
    }

    [PostgresFact]
    public async Task A_row_whose_price_was_corrected_in_keeps_its_classification_inert()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        await PricingService(db, Leyla).SetAsync(
            world.BatchId, new SetImportPricingCommand(world.Ids("free"), PricingMode.InternalFreeSupply), None);

        // A correction gives the row a price: a price answers the question, and nothing reads what was said before.
        await CorrectionService(db).ApplyAsync(
            new ApplyCorrectionCommand(world.BatchId, world.Row["free"], ImportCorrectionField.UnitPrice, "4.5"), None);

        // Ten unpriced rows, less the one that now carries a price; the classification it still holds counts nowhere.
        var list = (await PricingService(db, Leyla).GetAsync(world.BatchId, new ImportPricingQuery(), None))!;
        Assert.DoesNotContain(list.Rows, row => row.ImportRowId == world.Row["free"]);
        Assert.Equal((9, 0, 0), (list.Unclassified, list.PriceRequired, list.InternalFreeSupply));

        var preview = (await ConfirmationPlanner(db).PreviewAsync(world.BatchId, None))!;
        Assert.Equal((9, 0, 0), (preview.UnclassifiedPriceRows, preview.PriceRequiredRows, preview.InternalSupplyRows));

        await ConfirmationService(db).ConfirmAsync(world.BatchId, new ImportConfirmationCommand([]), None);
        var line = await LineOfAsync(world.Row["free"]);
        Assert.Equal((4.5m, PricingMode.PriceRequired), (line.UnitPrice, line.PricingMode));
        Assert.Empty(await DecisionsOfAsync(line.Id));
    }

    // ---- criterion 4: no classification by source ------------------------------------------------------------

    [PostgresFact]
    public async Task A_source_that_never_charges_or_reads_Qala_or_Azpetrol_classifies_nothing()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);

        // The store really is marked as never charging, and its row really is matched to it.
        await using (var check = database.CreateContext())
        {
            Assert.Equal(SupplierPriceRequirement.NotRequired,
                (await check.Suppliers.AsNoTracking().SingleAsync(supplier => supplier.Id == world.StoreId)).PriceRequirement);
            Assert.Equal(world.StoreId, (await check.ImportRows.AsNoTracking().SingleAsync(row => row.Id == world.Row["store"])).MatchedSupplierId);
        }

        var readiness = (await ReadinessQueries(db).GetReadinessAsync(world.BatchId, None))!;
        var preview = (await ConfirmationPlanner(db).PreviewAsync(world.BatchId, None))!;
        var unclassified = (await PricingService(db, Leyla).GetAsync(world.BatchId, new ImportPricingQuery(PricingMode.Unresolved), None))!;

        // Nobody has said anything, so every unpriced row is «Təsnif edilməyib» — the store's included.
        Assert.Equal((10, 10, 0, 0), (readiness.Warnings.MissingPrice, readiness.Warnings.UnclassifiedPrice,
            readiness.Warnings.PriceRequired, readiness.Warnings.PriceNotRequired));
        Assert.Equal((10, 0, 0), (preview.UnclassifiedPriceRows, preview.PriceRequiredRows, preview.InternalSupplyRows));
        Assert.Contains(world.Row["store"], unclassified.Rows.Select(row => row.ImportRowId));
        Assert.Contains(world.Row["qala"], unclassified.Rows.Select(row => row.ImportRowId));
        Assert.Contains(world.Row["azpetrol"], unclassified.Rows.Select(row => row.ImportRowId));

        await ConfirmationService(db).ConfirmAsync(world.BatchId, new ImportConfirmationCommand([]), None);

        foreach (var label in new[] { "store", "qala", "azpetrol" })
        {
            var line = await LineOfAsync(world.Row[label]);
            Assert.Equal(PricingMode.Unresolved, line.PricingMode);
            Assert.Empty(await DecisionsOfAsync(line.Id));
        }

        // The supplier is still attached exactly as before; only the mode stopped being read from it.
        Assert.Equal(world.StoreId, (await LineOfAsync(world.Row["store"])).SupplierId);
    }

    // ---- criterion 5: the counts add up after the import ----------------------------------------------------

    [PostgresFact]
    public async Task Qiymet_tesnifati_rises_by_exactly_what_the_preview_said()
    {
        await using var db = database.CreateContext();
        var world = await ClassifiedWorldAsync(db);
        var before = await TotalsAsync();

        var preview = (await ConfirmationPlanner(db).PreviewAsync(world.BatchId, None))!;
        var result = await ConfirmationService(db).ConfirmAsync(world.BatchId, new ImportConfirmationCommand([]), None);
        var after = await TotalsAsync();

        Assert.Equal(before.Unresolved + preview.UnclassifiedPriceRows, after.Unresolved);
        Assert.Equal(before.MissingRequiredPrice + preview.PriceRequiredRows, after.MissingRequiredPrice);
        Assert.Equal(before.InternalFreeSupply + preview.InternalSupplyRows, after.InternalFreeSupply);
        Assert.Equal(
            (preview.UnclassifiedPriceRows, preview.PriceRequiredRows, preview.InternalSupplyRows),
            (result.UnclassifiedPriceItems, result.PriceRequiredItems, result.InternalSupplyItems));

        await AssertEveryOrderWarnsAboutItsOwnGapsAsync(world.BatchId);
    }

    [PostgresFact]
    public async Task A_classified_line_carries_the_mode_and_one_decision_by_the_person_who_classified_it()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        await PricingService(db, Leyla).SetAsync(
            world.BatchId, new SetImportPricingCommand(world.Ids("bought"), PricingMode.PriceRequired), None);
        await PricingService(db, Rauf).SetAsync(
            world.BatchId, new SetImportPricingCommand(world.Ids("free"), PricingMode.InternalFreeSupply), None);

        await ConfirmationService(db).ConfirmAsync(world.BatchId, new ImportConfirmationCommand([]), None);

        foreach (var (label, mode, person) in new[]
                 {
                     ("bought", PricingMode.PriceRequired, Leyla),
                     ("free", PricingMode.InternalFreeSupply, Rauf),
                 })
        {
            var line = await LineOfAsync(world.Row[label]);
            Assert.Equal(mode, line.PricingMode);

            var decision = Assert.Single(await DecisionsOfAsync(line.Id));
            Assert.Equal((PricingMode.Unresolved, mode), (decision.PreviousMode, decision.NewMode));
            Assert.Equal(person.UserId, decision.ActorUserId);
            Assert.Equal(person.DisplayName, decision.ActorDisplayName);
            Assert.Equal($"Import #{world.BatchId} yoxlamasında təsnif edilib", decision.Reason);
        }

        // A priced row and an unclassified one: no decision for either.
        var priced = await LineOfAsync(world.Row["priced"]);
        Assert.Equal((2m, PricingMode.PriceRequired), (priced.UnitPrice, priced.PricingMode));
        Assert.Empty(await DecisionsOfAsync(priced.Id));
        Assert.Empty(await DecisionsOfAsync((await LineOfAsync(world.Row["second.open"])).Id));
    }

    [PostgresFact]
    public async Task With_a_group_skipped_each_rise_is_the_preview_less_that_group()
    {
        await using var db = database.CreateContext();
        var world = await ClassifiedWorldAsync(db);
        var before = await TotalsAsync();

        var preview = (await ConfirmationPlanner(db).PreviewAsync(world.BatchId, None))!;
        var skipped = preview.Groups.Single(group => group.LocationId == world.SecondId);

        var result = await ConfirmationService(db).ConfirmAsync(
            world.BatchId,
            new ImportConfirmationCommand([new ConfirmationGroupDecision(world.SecondId, world.Period, GroupDecisionAction.Skip, "ayrıca göndəriləcək")]),
            None);
        var after = await TotalsAsync();

        Assert.Equal(before.Unresolved + preview.UnclassifiedPriceRows - skipped.UnclassifiedPriceItemCount, after.Unresolved);
        Assert.Equal(before.MissingRequiredPrice + preview.PriceRequiredRows - skipped.PriceRequiredItemCount, after.MissingRequiredPrice);
        Assert.Equal(before.InternalFreeSupply + preview.InternalSupplyRows - skipped.InternalSupplyItemCount, after.InternalFreeSupply);

        // The result counts what was written, after the skip.
        Assert.Equal((4, 1, 1, 5), (result.UnclassifiedPriceItems, result.PriceRequiredItems, result.InternalSupplyItems, result.MissingPriceItems));
        await AssertEveryOrderWarnsAboutItsOwnGapsAsync(world.BatchId);
    }

    // ---- criterion 6: correctable afterwards on Qiymət təsnifatı --------------------------------------------

    [PostgresFact]
    public async Task What_was_said_at_import_is_corrected_on_Qiymet_tesnifati_like_any_other_line()
    {
        await using var db = database.CreateContext();
        var world = await WorldAsync(db);
        await PricingService(db, Leyla).SetAsync(
            world.BatchId, new SetImportPricingCommand(world.Ids("free"), PricingMode.InternalFreeSupply), None);
        await ConfirmationService(db).ConfirmAsync(world.BatchId, new ImportConfirmationCommand([]), None);

        var line = await LineOfAsync(world.Row["free"]);
        var pricing = new PricingModeReviewService(db, Rauf);

        // Listed under its classification, on the order it belongs to.
        var listed = await pricing.GetAsync(new PricingModeReviewQuery(PricingMode.InternalFreeSupply, OrderRequestId: line.OrderRequestId), None);
        Assert.Equal(line.Id, Assert.Single(listed.Rows).OrderRequestItemId);

        var before = await TotalsAsync();
        var moved = await pricing.SetAsync(new SetPricingModeCommand([line.Id], PricingMode.PriceRequired, "Alınıb, qiymət gözlənilir"), None);
        var after = await TotalsAsync();

        Assert.Equal(1, moved.Changed);
        Assert.Equal(before.InternalFreeSupply - 1, after.InternalFreeSupply);
        Assert.Equal(before.MissingRequiredPrice + 1, after.MissingRequiredPrice);
        Assert.Equal(before.Unresolved, after.Unresolved);

        var decisions = await DecisionsOfAsync(line.Id);
        Assert.Equal(2, decisions.Count);
        Assert.Equal((PricingMode.Unresolved, PricingMode.InternalFreeSupply, "Leyla Koordinator"),
            (decisions[0].PreviousMode, decisions[0].NewMode, decisions[0].ActorDisplayName));
        Assert.Equal((PricingMode.InternalFreeSupply, PricingMode.PriceRequired, "Rauf Admin"),
            (decisions[1].PreviousMode, decisions[1].NewMode, decisions[1].ActorDisplayName));
        Assert.Equal(PricingMode.PriceRequired, (await LineOfAsync(world.Row["free"])).PricingMode);
    }

    // ---- criterion 8: objects recognised as before, Task 3's alternative names included --------------------

    /// <summary>
    /// "H.Ə.M Təmizlik" is one of the owner's alternative names for Heydər Əliyev Mərkəzi (Task 3). A workbook row
    /// that says so stages matched to HEM and imports into HEM's order, as it did before this task.
    /// </summary>
    /// <remarks>
    /// On a database of its own: the shared one has HEM's orders for other tests, and a new one would move them.
    /// </remarks>
    [PostgresFact]
    public async Task H_E_M_Temizlik_is_still_Heydar_Aliyev_Merkezi_and_imports_into_its_order()
    {
        await using var isolated = await IsolatedDatabase.CreateAsync("baxorders_hem_alias");
        await using var db = isolated.CreateContext();

        var hem = await db.Locations.SingleAsync(location => location.Code == "HEM");
        Assert.Equal("Heydər Əliyev Mərkəzi", hem.Name);
        db.LocationAliases.Add(new LocationAlias(hem, "H.Ə.M Təmizlik"));
        await db.SaveChangesAsync();

        const string product = "Döşəmə yuyucusu";
        var batchId = await StageAsync(db,
            new OrderLine(Product: product, Location: "H.Ə.M Təmizlik", Quantity: 4, Price: 3.5, Date: new DateTime(2026, 9, 1)),
            new OrderLine(Product: product, Location: "H.Ə.M Təmizlik", Quantity: 2, Price: null, Date: new DateTime(2026, 9, 1)));

        var staged = await db.ImportRows.AsNoTracking()
            .Include(row => row.Issues)
            .Where(row => row.ImportBatchId == batchId)
            .ToListAsync();
        Assert.All(staged, row => Assert.Equal(hem.Id, row.MatchedLocationId));
        Assert.DoesNotContain(staged.SelectMany(row => row.Issues), issue => issue.IssueType == ImportIssueType.UnknownLocation);

        var review = ResolutionService(db);
        await review.CreateProductAsync(
            new CreateProductCommand(batchId, TextNormalizer.Normalize(product), product, null, ResolutionScope.BatchOnly), None);
        foreach (var key in await db.ImportRows.AsNoTracking()
                     .Where(row => row.ImportBatchId == batchId && row.VariantSourceKey != null && row.MatchedProductVariantId == null)
                     .Select(row => row.VariantSourceKey!)
                     .Distinct()
                     .ToListAsync())
        {
            await review.CreateProductVariantAsync(new CreateProductVariantCommand(batchId, key), None);
        }

        await ConfirmationService(db).ConfirmAsync(batchId, new ImportConfirmationCommand([]), None);

        await using var check = isolated.CreateContext();
        var order = await check.OrderRequests.AsNoTracking()
            .Include(request => request.Items)
            .SingleAsync(request => request.SourceImportBatchId == batchId);
        Assert.Equal((hem.Id, new DateOnly(2026, 9, 1), 2), (order.LocationId, order.RequestPeriod, order.Items.Count));
        Assert.Equal(PricingMode.Unresolved, order.Items.Single(item => item.UnitPrice is null).PricingMode);
    }

    // ---- fixture -------------------------------------------------------------------------------------------

    /// <summary>The rows with no price that are still part of the import, in the order the list shows them.</summary>
    private static readonly string[] Unpriced =
        ["store", "qala", "azpetrol", "bought", "free", "unusable", "second.open", "second.bought", "second.free"];

    /// <param name="Row">Each staged row by its label, in the order the workbook lists them.</param>
    private sealed record World(
        long BatchId,
        string Home,
        string Second,
        int HomeId,
        int SecondId,
        DateOnly Period,
        string Product,
        int StoreId,
        string StoreName,
        IReadOnlyDictionary<string, long> Row)
    {
        public long[] Ids(params string[] labels) => Ids(labels, ordered: false);

        public long[] Ids(string[] labels, bool ordered)
        {
            var ids = labels.Select(label => Row[label]);
            return ordered ? ids.ToArray() : ids.Order().ToArray();
        }
    }

    /// <summary>
    /// One import of two objects in one month, ready to confirm. At home: a priced row; unpriced rows from a store
    /// marked as never charging, from "Qala baza", from "Azpetrol baza", and three plain ones; one whose price cell is
    /// unusable. In the second object: one unpriced row of each kind to come, and a priced one. Nothing is classified.
    /// </summary>
    private async Task<World> WorldAsync(BaxOrdersDbContext db)
    {
        var tag = Guid.NewGuid().ToString("N")[..6];
        var product = $"Təsnif malı {tag}";
        var home = $"A təsnif obyekti {tag}";
        var second = $"B təsnif obyekti {tag}";
        var store = $"Daxili anbar {tag}";

        var lines = new (string Label, OrderLine Line)[]
        {
            ("priced", new(Quantity: 1, Price: 2, Location: home)),
            ("store", new(Quantity: 2, Price: null, Location: home, Supplier: store)),
            ("qala", new(Quantity: 3, Price: null, Location: home, Supplier: "Qala baza")),
            ("azpetrol", new(Quantity: 4, Price: null, Location: home, Supplier: "Azpetrol baza")),
            ("bought", new(Quantity: 5, Price: null, Location: home)),
            ("free", new(Quantity: 6, Price: null, Location: home)),
            ("unusable", new(Quantity: 7, Price: -3, Location: home)),
            ("excluded", new(Quantity: 8, Price: null, Location: home)),
            ("second.open", new(Quantity: 9, Price: null, Location: second)),
            ("second.bought", new(Quantity: 10, Price: null, Location: second)),
            ("second.free", new(Quantity: 11, Price: null, Location: second)),
            ("second.priced", new(Quantity: 12, Price: 5, Location: second)),
        };

        var batchId = await StageAsync(db, [.. lines.Select(item => item.Line with { Product = product })]);

        var review = ResolutionService(db);
        foreach (var name in new[] { home, second })
        {
            await review.CreateLocationAsync(
                new CreateLocationCommand(batchId, TextNormalizer.Normalize(name), name, ResolutionScope.BatchOnly), None);
        }

        await review.CreateProductAsync(
            new CreateProductCommand(batchId, TextNormalizer.Normalize(product), product, null, ResolutionScope.BatchOnly), None);

        foreach (var key in await db.ImportRows.AsNoTracking()
                     .Where(row => row.ImportBatchId == batchId && !row.IsExcluded && row.VariantSourceKey != null && row.MatchedProductVariantId == null)
                     .Select(row => row.VariantSourceKey!)
                     .Distinct()
                     .ToListAsync())
        {
            await review.CreateProductVariantAsync(new CreateProductVariantCommand(batchId, key), None);
        }

        // The store is resolved, then marked as never charging — by a person, as the Suppliers page would.
        var created = await review.CreateSupplierAsync(
            new CreateSupplierCommand(batchId, TextNormalizer.Normalize(store), store, null, ResolutionScope.BatchOnly), None);
        await using (var suppliers = database.CreateContext())
        {
            var supplier = await suppliers.Suppliers.SingleAsync(item => item.Id == (int)created.TargetId);
            supplier.ChangePriceRequirement(SupplierPriceRequirement.NotRequired);
            await suppliers.SaveChangesAsync();
        }

        var staged = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId)
            .OrderBy(row => row.RowNumber)
            .ToListAsync();
        Assert.Equal(lines.Length, staged.Count);

        var batch = await db.ImportBatches.AsNoTracking().SingleAsync(item => item.Id == batchId);
        Assert.Equal(ImportStatus.ReadyToImport, batch.Status);

        return new World(
            batchId,
            home,
            second,
            staged[0].MatchedLocationId!.Value,
            staged[^1].MatchedLocationId!.Value,
            staged[0].ParsedRequestPeriod!.Value,
            product,
            (int)created.TargetId,
            store,
            lines.Select((item, index) => (item.Label, staged[index].Id)).ToDictionary(item => item.Label, item => item.Id));
    }

    /// <summary>
    /// <see cref="WorldAsync"/>, with one row of each group said to be bought and one supplied free, and a row that
    /// was classified before it was excluded.
    /// </summary>
    private async Task<World> ClassifiedWorldAsync(BaxOrdersDbContext db)
    {
        var world = await WorldAsync(db);
        var service = PricingService(db, Leyla);

        await service.SetAsync(world.BatchId, new SetImportPricingCommand(world.Ids("bought", "second.bought"), PricingMode.PriceRequired), None);
        await service.SetAsync(world.BatchId, new SetImportPricingCommand(world.Ids("free", "second.free", "excluded"), PricingMode.InternalFreeSupply), None);
        await CorrectionService(db).ExcludeAsync(new ExcludeRowCommand(world.BatchId, world.Row["excluded"], "Təkrar sətir"), None);

        return world;
    }

    private async Task<PricingModeReviewDto> TotalsAsync()
    {
        await using var db = database.CreateContext();
        return await new PricingModeReviewService(db, TestCurrentUser.Anonymous()).GetAsync(new PricingModeReviewQuery(PageSize: 1), None);
    }

    /// <summary>Each new order's warning is exactly its unclassified lines plus those said to be bought.</summary>
    private async Task AssertEveryOrderWarnsAboutItsOwnGapsAsync(long batchId)
    {
        await using var db = database.CreateContext();
        var orders = await db.OrderRequests.AsNoTracking()
            .Where(request => request.SourceImportBatchId == batchId)
            .Select(request => request.Id)
            .ToListAsync();
        Assert.NotEmpty(orders);

        foreach (var orderId in orders)
        {
            var order = (await new OrderWorkflowService(db, TestCurrentUser.Anonymous(), new PostgresOrderRequestLock(db)).GetAsync(orderId, None))!;
            var modes = await db.OrderRequestItems.AsNoTracking()
                .Where(item => item.OrderRequestId == orderId && item.UnitPrice == null)
                .Select(item => item.PricingMode)
                .ToListAsync();

            Assert.Equal(modes.Count(mode => mode is PricingMode.Unresolved or PricingMode.PriceRequired), order.MissingPriceItemCount);
        }
    }

    private async Task<OrderRequestItem> LineOfAsync(long importRowId)
    {
        await using var db = database.CreateContext();
        return await db.ImportRowMaterializations.AsNoTracking()
            .Where(link => link.ImportRowId == importRowId)
            .Select(link => link.OrderRequestItem)
            .SingleAsync();
    }

    private async Task<List<OrderItemPricingDecision>> DecisionsOfAsync(long orderRequestItemId)
    {
        await using var db = database.CreateContext();
        return await db.OrderItemPricingDecisions.AsNoTracking()
            .Where(decision => decision.OrderRequestItemId == orderRequestItemId)
            .OrderBy(decision => decision.OccurredAtUtc)
            .ThenBy(decision => decision.Id)
            .ToListAsync();
    }

    private async Task<(string? By, PricingMode? Mode)> ClassificationOfAsync(long importRowId)
    {
        await using var db = database.CreateContext();
        var row = await db.ImportRows.AsNoTracking().SingleAsync(item => item.Id == importRowId);
        return (row.PricingClassifiedByDisplayName, row.PricingClassification);
    }

    private async Task<string> ClassificationsAsync(long batchId)
    {
        await using var db = database.CreateContext();
        var rows = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId)
            .OrderBy(row => row.Id)
            .Select(row => new { row.Id, row.PricingClassification, row.PricingClassifiedByUserId, row.PricingClassifiedAtUtc })
            .ToListAsync();
        return string.Join('|', rows.Select(row => $"{row.Id}:{row.PricingClassification}:{row.PricingClassifiedByUserId}:{row.PricingClassifiedAtUtc:O}"));
    }

    /// <summary>Everything about a batch a classification must leave alone.</summary>
    private async Task<string> FingerprintAsync(long batchId)
    {
        await using var db = database.CreateContext();
        var batch = await db.ImportBatches.AsNoTracking().SingleAsync(item => item.Id == batchId);
        var rows = await db.ImportRows.AsNoTracking()
            .Include(row => row.Issues)
            .Include(row => row.Corrections)
            .Where(row => row.ImportBatchId == batchId)
            .OrderBy(row => row.Id)
            .ToListAsync();
        var resolutions = await db.ImportResolutions.AsNoTracking().CountAsync(resolution => resolution.ImportBatchId == batchId);

        return string.Join('\n', rows.Select(row => string.Join('|',
                row.Id, row.ParsedQuantity, row.ParsedUnitPrice, row.ParsedRequestPeriod, row.IsExcluded, row.ValidationStatus,
                row.MatchedLocationId, row.MatchedSupplierId, row.MatchedProductId, row.MatchedProductVariantId,
                string.Join(',', row.Issues.OrderBy(issue => issue.Id).Select(issue => $"{issue.Id}:{issue.IssueType}:{issue.Severity}")),
                string.Join(',', row.Corrections.Select(correction => $"{correction.Field}={correction.CorrectedValue}")))))
            + $"\n{batch.Status}|{batch.TotalRows}|{batch.ValidRows}|{batch.WarningRows}|{batch.InvalidRows}|{batch.ExcludedRows}|{resolutions}";
    }
}
