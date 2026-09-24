using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Imports;
using BaxOrders.Domain;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Orders.Pricing;

/// <summary>
/// The queue of unpriced lines nobody has classified, and the one decision that empties it.
/// </summary>
/// <remarks>
/// <para>
/// This exists because one source can be both. The business states that Qala anbar buys some material through
/// Cleanfix MMC and issues the rest free from the same store, and nothing in the data separates the two — the
/// same supplier carries 94 unpriced lines and 103 priced ones, and nineteen of its product variants also
/// come from Cleanfix. No rule could have split them without guessing, so they were left for a person.
/// </para>
/// <para>
/// Nothing here writes a price. A decision moves one flag on one line and leaves the money, the quantity and
/// the provenance exactly as they were.
/// </para>
/// </remarks>
public sealed class PricingModeReviewService(IBaxOrdersDbContext db, ICurrentUserContext currentUser)
{
    public const int MaxPageSize = 200;

    /// <summary>
    /// The lines waiting on a decision, with the provenance that lets somebody make one.
    /// </summary>
    /// <remarks>
    /// Three queries: the counts over the whole queue, how many rows the filter and the search leave, then one
    /// page of them. The second is not free, and it is not optional either — a footer that counts the whole
    /// queue while the table shows one filtered row offers a "Növbəti" that leads to an empty page.
    /// </remarks>
    public async Task<PricingModeReviewDto> GetAsync(
        PricingModeReviewQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        // Only unpriced lines are ever in question. A line with a price has answered the question by having one.
        var unpriced = db.OrderRequestItems.AsNoTracking().Where(item => item.UnitPrice == null);

        var totals = await unpriced
            .GroupBy(item => item.PricingMode)
            .Select(group => new { Mode = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        int CountOf(PricingMode mode) => totals.FirstOrDefault(row => row.Mode == mode)?.Count ?? 0;

        var filtered = query.Mode is { } mode ? unpriced.Where(item => item.PricingMode == mode) : unpriced;

        if (Search.Of(query.Search) is { } needle)
        {
            filtered = filtered.Where(item =>
                item.ProductVariant.Product.NormalizedName.Contains(needle)
                || item.ProductVariant.Product.Code.ToLower().Contains(needle)
                || item.OrderRequest.Location.NormalizedName.Contains(needle));
        }

        // What the pager is pacing: the filtered and searched set, never the whole queue.
        var totalCount = await filtered.CountAsync(cancellationToken);

        var (page, pageSize) = Paging.Of(query.Page, query.PageSize, 50);
        var rows = await filtered
            .OrderBy(item => item.OrderRequest.RequestPeriod)
            .ThenBy(item => item.ProductVariant.Product.Name)
            .ThenBy(item => item.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new PricingModeReviewRowDto(
                item.Id,
                item.OrderRequestId,
                item.OrderRequest.RequestPeriod,
                item.OrderRequest.LocationId,
                item.OrderRequest.Location.Name,
                item.ProductVariantId,
                item.ProductVariant.Product.Code,
                item.ProductVariant.Product.Name,
                item.ProductVariant.SpecificationValue,
                item.ProductVariant.SpecificationDescriptor,
                item.ProductVariant.OrderUnit != null ? item.ProductVariant.OrderUnit.Code : null,
                item.Quantity,
                item.SupplierId,
                item.Supplier != null ? item.Supplier.Name : null,
                // The workbook cell, which for these lines is often the only record of where they came from:
                // "Azpetrol baza" never matched a catalogue supplier, and it is what settled that decision.
                db.ImportRowMaterializations
                    .Where(link => link.OrderRequestItemId == item.Id)
                    .Select(link => link.ImportRow.OriginalSupplierName)
                    .FirstOrDefault(),
                db.ImportRowMaterializations
                    .Where(link => link.OrderRequestItemId == item.Id)
                    .Select(link => (long?)link.ImportRowId)
                    .FirstOrDefault(),
                db.ImportRowMaterializations
                    .Where(link => link.OrderRequestItemId == item.Id)
                    .Select(link => link.ImportRow.SheetName)
                    .FirstOrDefault(),
                db.ImportRowMaterializations
                    .Where(link => link.OrderRequestItemId == item.Id)
                    .Select(link => (int?)link.ImportRow.RowNumber)
                    .FirstOrDefault(),
                item.PricingMode))
            .ToListAsync(cancellationToken);

        return new PricingModeReviewDto(
            rows,
            totalCount,
            CountOf(PricingMode.Unresolved),
            CountOf(PricingMode.PriceRequired),
            CountOf(PricingMode.InternalFreeSupply));
    }

    /// <summary>
    /// Records how the named lines were supplied.
    /// </summary>
    /// <remarks>
    /// Line by line, always. There is deliberately no "mark every line of this supplier" here: that is the
    /// mistake this whole feature exists to undo, and a screen that offered it would invite somebody to make
    /// it again in one click.
    /// </remarks>
    public async Task<SetPricingModeResultDto> SetAsync(
        SetPricingModeCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        if (!Enum.IsDefined(command.PricingMode))
        {
            throw new ValidationException(
                $"'{nameof(command.PricingMode)}' must be one of: {string.Join(", ", Enum.GetNames<PricingMode>())}.");
        }

        if (command.OrderRequestItemIds.Count == 0)
        {
            throw new ValidationException("Choose at least one line to decide about.");
        }

        var actor = CurrentActor.Of(currentUser, "You must be signed in to decide how a line was supplied.");

        var ids = command.OrderRequestItemIds.Distinct().ToArray();
        var items = await db.OrderRequestItems
            .Where(item => ids.Contains(item.Id))
            .ToListAsync(cancellationToken);

        if (items.Count != ids.Length)
        {
            throw new NotFoundException("One of the chosen lines no longer exists.");
        }

        var priced = items.Where(item => item.UnitPrice is not null).ToList();
        if (priced.Count > 0)
        {
            // A line that carries a price has already answered this, and changing its mode would say the price
            // should not be there.
            throw new DomainException(
                $"{priced.Count} of the chosen lines already carry a price; their supply is not in question.");
        }

        var changed = 0;
        var utcNow = DateTime.UtcNow;
        foreach (var item in items)
        {
            if (item.SetPricingMode(command.PricingMode, actor, command.Reason, utcNow) is { } decision)
            {
                db.OrderItemPricingDecisions.Add(decision);
                changed++;
            }
        }

        if (changed > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        return new SetPricingModeResultDto(changed, items.Count - changed, command.PricingMode);
    }
}
