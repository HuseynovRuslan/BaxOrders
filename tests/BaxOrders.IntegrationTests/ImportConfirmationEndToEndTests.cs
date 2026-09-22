using BaxOrders.Application.Imports.Confirmation;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// One synthetic workbook of the shape the real one has — two objects, two months, a missing price, two
/// identical-looking lines, a specification descriptor, a monthly service, a unitless service and a footer
/// row — carried through review, preview, confirmation, reconciliation and a retry.
/// </summary>
[Collection(SqlServerCollection.Name)]
public sealed class ImportConfirmationEndToEndTests(SqlServerDatabaseFixture database)
{
    [SqlServerFact]
    public async Task A_whole_workbook_goes_from_staging_to_orders_and_back_adds_nothing()
    {
        var tag = Guid.NewGuid().ToString("N")[..6];
        var north = $"Şimal parkı {tag}";
        var south = $"Cənub parkı {tag}";
        var may = new DateTime(2026, 5, 1);
        var june = new DateTime(2026, 6, 1);

        var material = $"Mop {tag}";
        var chain = $"Sep {tag}";
        var toilet = $"Ayaqyolu pulu {tag}";
        var repair = $"Təmir işləri {tag}";
        // The sheet's own word for the monthly service period, unique so the catalog record cannot collide
        // with another test's.
        var monthly = $"ay{tag}";

        await using var db = database.CreateContext();
        var batchId = await StageAsync(
            db,
            new OrderLine(Product: material, Quantity: 10, Price: 2, Location: north, Date: may),
            // Two lines nothing tells apart: they stay two lines all the way through.
            new OrderLine(Product: material, Quantity: 4, Price: 3, Location: north, Date: may),
            new OrderLine(Product: material, Quantity: 4, Price: 3, Location: north, Date: may),
            new OrderLine(Product: material, Quantity: 5, Price: null, Location: north, Date: june),
            new OrderLine(Product: chain, Quantity: 2, Price: 12, Location: south, Date: may, SpecificationValue: "28", SpecificationUnit: "diş"),
            new OrderLine(Product: toilet, Quantity: 1, Price: 100, OrderUnit: monthly, Location: south, Date: june),
            new OrderLine(Product: repair, Quantity: 1, Price: 200, OrderUnit: null, Location: south, Date: june),
            new OrderLine(Product: null, Quantity: null, Price: null, OrderUnit: null, Location: null, Date: null));

        // ---- review: exactly the decisions the real batch needed ------------------------------------
        var resolutions = ResolutionService(db);
        foreach (var name in new[] { north, south })
        {
            await resolutions.CreateLocationAsync(
                new CreateLocationCommand(batchId, TextNormalizer.Normalize(name), name, ResolutionScope.BatchOnly), CancellationToken.None);
        }

        foreach (var name in new[] { material, chain, toilet, repair })
        {
            await resolutions.CreateProductAsync(
                new CreateProductCommand(batchId, TextNormalizer.Normalize(name), name, null, ResolutionScope.BatchOnly), CancellationToken.None);
        }

        await resolutions.CreateUnitAsync(
            new CreateUnitCommand(batchId, ImportResolutionKind.OrderUnit, monthly, $"MON{tag[..3].ToUpperInvariant()}", $"Ay {tag}", monthly,
                UnitType.Other, ResolutionScope.BatchOnly),
            CancellationToken.None);
        await resolutions.MarkNotAUnitAsync(
            new MarkNotAUnitCommand(batchId, ImportResolutionKind.SpecificationUnit, "diş"), CancellationToken.None);

        var footer = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId && row.OriginalProductName == null)
            .Select(row => row.Id)
            .SingleAsync();
        await CorrectionService(db).ExcludeAsync(
            new ExcludeRowCommand(batchId, footer, "Excel yekun cəm sətri — sifariş sətri deyil"), CancellationToken.None);

        var service = ResolutionService(db);
        var unitless = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId && row.OriginalProductName == repair)
            .Select(row => row.Id)
            .SingleAsync();
        await CorrectionService(db).ClearAsync(batchId, unitless, ImportCorrectionField.OrderUnit, CancellationToken.None);

        foreach (var key in await db.ImportRows.AsNoTracking()
                     .Where(row => row.ImportBatchId == batchId && !row.IsExcluded && row.VariantSourceKey != null && row.MatchedProductVariantId == null)
                     .Select(row => row.VariantSourceKey!)
                     .Distinct()
                     .ToListAsync())
        {
            await service.CreateProductVariantAsync(new CreateProductVariantCommand(batchId, key), CancellationToken.None);
        }

        Assert.Equal(ImportStatus.ReadyToImport, (await db.ImportBatches.AsNoTracking().SingleAsync(b => b.Id == batchId)).Status);

        // ---- preview -------------------------------------------------------------------------------
        var preview = await ConfirmationPlanner(db).PreviewAsync(batchId, CancellationToken.None);

        Assert.NotNull(preview);
        Assert.True(preview!.CanConfirm);
        Assert.Equal((7, 1, 4), (preview.RowsToImport, preview.ExcludedRows, preview.GroupCount));
        Assert.Equal((1, 2, 1, 1), (preview.MissingPriceRows, preview.PossibleDuplicateRows, preview.UnitlessVariantRows, preview.DescriptorVariantRows));
        Assert.All(preview.Groups, group => Assert.Equal(1, group.ProposedVersion));

        // ---- confirm -------------------------------------------------------------------------------
        var result = await ConfirmationService(db).ConfirmAsync(batchId, new ImportConfirmationCommand([]), CancellationToken.None);

        Assert.Equal((4, 7, 0, 0), (result.CreatedRequests, result.CreatedItems, result.SkippedGroups, result.SkippedRows));
        Assert.Equal(ImportStatus.Imported, result.BatchStatus);

        // ---- reconciliation ------------------------------------------------------------------------
        await using var check = database.CreateContext();
        var requests = await check.OrderRequests
            .Include(request => request.Items).ThenInclude(item => item.ProductVariant)
            .Where(request => request.SourceImportBatchId == batchId)
            .ToListAsync();

        Assert.Equal(4, requests.Count);
        Assert.Equal(7, requests.Sum(request => request.Items.Count));

        var items = requests.SelectMany(request => request.Items).ToList();
        Assert.Equal(2, items.Count(item => item.Quantity == 4m && item.UnitPrice == 3m));
        Assert.Single(items, item => item.UnitPrice is null);
        Assert.Single(items, item => item.ProductVariant.SpecificationDescriptor == "diş");
        Assert.Single(items, item => item.ProductVariant.OrderUnitId is null);

        var staged = await check.ImportRows
            .Where(row => row.ImportBatchId == batchId && !row.IsExcluded && row.ParsedUnitPrice != null)
            .Select(row => row.ParsedQuantity!.Value * row.ParsedUnitPrice!.Value)
            .ToListAsync();
        Assert.Equal(staged.Sum(), items.Where(item => item.UnitPrice is not null).Sum(item => item.Quantity * item.UnitPrice!.Value));

        var links = await check.ImportRowMaterializations
            .Where(link => link.Materialization.ImportBatchId == batchId)
            .ToListAsync();
        Assert.Equal(7, links.Count);
        Assert.DoesNotContain(footer, links.Select(link => link.ImportRowId));

        // ---- retry ---------------------------------------------------------------------------------
        var retry = await ConfirmationService(check).ConfirmAsync(batchId, new ImportConfirmationCommand([]), CancellationToken.None);

        Assert.True(retry.AlreadyImported);
        Assert.Equal((4, 7), (retry.CreatedRequests, retry.CreatedItems));

        await using var after = database.CreateContext();
        Assert.Equal(4, await after.OrderRequests.CountAsync(request => request.SourceImportBatchId == batchId));
        Assert.Equal(7, await after.ImportRowMaterializations.CountAsync(link => link.Materialization.ImportBatchId == batchId));
    }
}
