using BaxOrders.Application.Imports.Confirmation;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>A synthetic request that really came from an import, with its workbook rows behind its lines.</summary>
internal sealed record ImportedOrder(long OrderRequestId, int LocationId, string LocationName, DateOnly Period, long ImportBatchId);

/// <summary>
/// Makes a permanent request the way the company's requests were made: staged from a workbook, reviewed, and
/// confirmed. Its lines therefore carry real import provenance, which is what a correction has to lead back to.
/// </summary>
/// <remarks>
/// Every call uses its own product and location, so no test's request becomes another's "existing request",
/// and nothing here reads or touches a company workbook.
/// </remarks>
internal static class ImportedOrders
{
    public static async Task<ImportedOrder> ImportAsync(BaxOrdersDbContext db, params OrderLine[] lines)
    {
        var product = $"Sınaq malı {Unique()}";
        var location = $"Sınaq obyekti {Unique()}";
        lines = [.. lines.Select(line => line with { Product = product, Location = location })];

        var batchId = await StageAsync(db, lines);
        var review = ResolutionService(db);

        await review.CreateLocationAsync(
            new CreateLocationCommand(batchId, TextNormalizer.Normalize(location), location, ResolutionScope.BatchOnly),
            CancellationToken.None);
        await review.CreateProductAsync(
            new CreateProductCommand(batchId, TextNormalizer.Normalize(product), product, null, ResolutionScope.BatchOnly),
            CancellationToken.None);

        var variantKeys = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId && !row.IsExcluded && row.VariantSourceKey != null && row.MatchedProductVariantId == null)
            .Select(row => row.VariantSourceKey!)
            .Distinct()
            .ToListAsync();

        foreach (var key in variantKeys)
        {
            await review.CreateProductVariantAsync(new CreateProductVariantCommand(batchId, key), CancellationToken.None);
        }

        await ConfirmationService(db).ConfirmAsync(batchId, new ImportConfirmationCommand([]), CancellationToken.None);

        var request = await db.OrderRequests.AsNoTracking()
            .Include(item => item.Location)
            .SingleAsync(item => item.SourceImportBatchId == batchId);

        return new ImportedOrder(request.Id, request.LocationId, request.Location.Name, request.RequestPeriod, batchId);
    }

    private static string Unique() => Guid.NewGuid().ToString("N")[..6];
}
