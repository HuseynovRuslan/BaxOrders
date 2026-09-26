using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Analytics.Dashboard;

/// <summary>One line ordered on top of the monthly plan, as it stands in the permanent order.</summary>
/// <param name="KnownAmount">Quantity × price, or null when nobody has priced the line.</param>
public sealed record OutsideMonthlyLineDto(
    long OrderRequestItemId,
    long OrderRequestId,
    string ProductName,
    string? SpecificationValue,
    string? SpecificationUnitCode,
    string? SpecificationDescriptor,
    decimal Quantity,
    string? OrderUnitName,
    decimal? UnitPrice,
    decimal? KnownAmount,
    string? SupplierName);

/// <summary>What one object ordered outside the monthly plan in the month being looked at.</summary>
public sealed record OutsideMonthlyLocationDto(
    int LocationId,
    string LocationCode,
    string LocationName,
    int LineCount,
    decimal? KnownAmount,
    int MissingPriceLineCount,
    IReadOnlyList<OutsideMonthlyLineDto> Lines);

/// <summary>
/// The month's ad-hoc orders, object by object.
/// </summary>
/// <param name="KnownAmount">The month's outside-monthly money. Null when not one of its lines is priced.</param>
/// <param name="MissingPriceLineCount">
/// Lines somebody still owes a price for. The money above leaves them out, and this says how many.
/// </param>
public sealed record OutsideMonthlyDto(
    DateOnly Period,
    int LineCount,
    decimal? KnownAmount,
    int MissingPriceLineCount,
    IReadOnlyList<OutsideMonthlyLocationDto> Locations);

/// <summary>
/// What was ordered on top of the monthly plan in one month: which objects, which products, how much.
/// </summary>
/// <remarks>
/// <para>
/// Deliberately a plain list and nothing more. These lines are exactly the ones the monthly comparison leaves
/// out, so a manager needs to be able to see what they were — but an ad-hoc purchase has no month to be
/// compared against, and inventing a trend, a driver or a judgement for it would be the same mistake the
/// comparison avoids by not mixing it in. Facts only: object, product, quantity, price, supplier.
/// </para>
/// <para>
/// Reads only, like everything else on the dashboard, and it never falls back to another month: an empty
/// month answers "none", which is an answer.
/// </para>
/// </remarks>
public sealed class OutsideMonthlyQueries(IBaxOrdersDbContext db)
{
    public async Task<OutsideMonthlyDto> GetAsync(DateOnly period, CancellationToken cancellationToken)
    {
        // The permanent order of each object for the month: its newest version, the one every screen reads.
        var requestIds = await db.OrderRequests.AsNoTracking()
            .Where(request => request.RequestPeriod == period
                && !db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version))
            .Select(request => request.Id)
            .ToListAsync(cancellationToken);

        var rows = await db.OrderRequestItems.AsNoTracking()
            .Where(item => requestIds.Contains(item.OrderRequestId)
                && item.OrderLineType == OrderLineType.OutsideMonthly)
            .Select(item => new
            {
                item.Id,
                item.OrderRequestId,
                LocationId = item.OrderRequest.LocationId,
                LocationCode = item.OrderRequest.Location.Code,
                LocationName = item.OrderRequest.Location.Name,
                ProductName = item.ProductVariant.Product.Name,
                item.ProductVariant.SpecificationValue,
                SpecificationUnitCode = item.ProductVariant.SpecificationUnit != null
                    ? item.ProductVariant.SpecificationUnit.Code
                    : null,
                item.ProductVariant.SpecificationDescriptor,
                item.Quantity,
                OrderUnitName = item.ProductVariant.OrderUnit != null ? item.ProductVariant.OrderUnit.Name : null,
                item.UnitPrice,
                item.PricingMode,
                SupplierName = item.Supplier != null ? item.Supplier.Name : null,
            })
            .ToListAsync(cancellationToken);

        var locations = rows
            .GroupBy(row => (row.LocationId, row.LocationCode, row.LocationName))
            .Select(group => new OutsideMonthlyLocationDto(
                group.Key.LocationId,
                group.Key.LocationCode,
                group.Key.LocationName,
                group.Count(),
                AmountOf(group.Select(row => row.UnitPrice is { } price ? row.Quantity * price : (decimal?)null)),
                group.Count(row => row.UnitPrice is null && row.PricingMode != PricingMode.InternalFreeSupply),
                [.. group
                    .OrderByDescending(row => row.UnitPrice is { } price ? row.Quantity * price : 0m)
                    .ThenBy(row => row.ProductName, AzerbaijaniCollation.Comparer)
                    .Select(row => new OutsideMonthlyLineDto(
                        row.Id,
                        row.OrderRequestId,
                        row.ProductName,
                        row.SpecificationValue,
                        row.SpecificationUnitCode,
                        row.SpecificationDescriptor,
                        row.Quantity,
                        row.OrderUnitName,
                        row.UnitPrice,
                        row.UnitPrice is { } price ? Money.RoundCents(row.Quantity * price) : null,
                        row.SupplierName))]))
            // The object that spent the most first: the manager's question is "where did this month's ad-hoc
            // money go", and the answer is read from the top.
            .OrderByDescending(location => location.KnownAmount ?? 0m)
            .ThenBy(location => location.LocationName, AzerbaijaniCollation.Comparer)
            .ToList();

        return new OutsideMonthlyDto(
            period,
            rows.Count,
            AmountOf(rows.Select(row => row.UnitPrice is { } price ? row.Quantity * price : (decimal?)null)),
            rows.Count(row => row.UnitPrice is null && row.PricingMode != PricingMode.InternalFreeSupply),
            locations);
    }

    /// <summary>
    /// The money that is known. Null — never zero — when not one line of the group carries a price: a line
    /// nobody has priced is not a line that cost nothing.
    /// </summary>
    private static decimal? AmountOf(IEnumerable<decimal?> amounts)
    {
        var known = amounts.Where(amount => amount is not null).Select(amount => amount!.Value).ToList();
        return known.Count == 0 ? null : Money.RoundCents(known.Sum());
    }
}
