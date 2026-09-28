using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Orders;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Catalog;

/// <summary>
/// One product's ordering history: every month it appears in, and the lines behind those months.
/// </summary>
/// <remarks>
/// <para>
/// The question a manager asks of a product is "do we order this every month, and is it moving". So the
/// figures that answer it — the months it was ordered in and the average quantity of those months — read
/// <b>planned material alone</b>. A pump bought once when one broke is not a product the company orders every
/// month, and counting it would make an article that appeared once look like a habit.
/// </para>
/// <para>
/// Nothing is hidden by that. Every line is listed with the kind it was, and the one-off spend has its own
/// figures beside the planned ones, because it happened and somebody paid for it.
/// </para>
/// <para>
/// <b>One version per month.</b> The highest version of a location and month is the one counted, which is the
/// policy the dashboard, the comparison screens and the report already follow. Earlier versions stay readable
/// from the order screens and are never added beside their successors.
/// </para>
/// </remarks>
public sealed class ProductHistoryQueries(IBaxOrdersDbContext db)
{
    /// <returns>Null when the product does not exist.</returns>
    public async Task<ProductHistoryDto?> GetAsync(
        long productId, ProductHistoryQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        var product = await db.Products.AsNoTracking()
            .Where(item => item.Id == productId)
            .Select(item => new { item.Id, item.Code, item.Name, item.IsActive })
            .FirstOrDefaultAsync(cancellationToken);

        if (product is null)
        {
            return null;
        }

        // Every line of this product, from the version of each month that is current. One query; the shaping
        // below is over a product's own lines, which is a handful of hundreds at most.
        var lines = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.ProductVariant.ProductId == productId
                && !db.OrderRequests.Any(other =>
                    other.LocationId == item.OrderRequest.LocationId
                    && other.RequestPeriod == item.OrderRequest.RequestPeriod
                    && other.Version > item.OrderRequest.Version))
            .Select(item => new LineRow(
                item.Id,
                item.OrderRequestId,
                item.OrderRequest.RequestPeriod,
                item.OrderRequest.LocationId,
                item.OrderRequest.Location.Name,
                item.ProductVariant.SpecificationValue,
                item.ProductVariant.SpecificationUnit == null ? null : item.ProductVariant.SpecificationUnit.Code,
                item.ProductVariant.ModelCode,
                item.ProductVariant.OrderUnit == null ? null : item.ProductVariant.OrderUnit.Code,
                item.Quantity,
                item.UnitPrice,
                item.OrderLineType,
                item.ResponsiblePerson == null ? null : item.ResponsiblePerson.Name))
            .ToListAsync(cancellationToken);

        var months = lines
            .GroupBy(line => line.Period)
            .OrderByDescending(group => group.Key)
            .Select(group => Month(group.Key, [.. group]))
            .ToList();

        // "Do we order this every month" is a question about planned material, so only those months count.
        var plannedMonths = months.Where(month => month.MonthlyLineCount > 0).ToList();
        var ordered = lines.Where(line => line.OrderLineType == OrderLineType.Monthly).ToList();

        return new ProductHistoryDto(
            product.Id,
            product.Code,
            product.Name,
            product.IsActive,
            plannedMonths.Count,
            plannedMonths.Count == 0
                ? null
                : Money.RoundCents(plannedMonths.Sum(month => month.MonthlyQuantity) / plannedMonths.Count),
            ordered.Count == 0 ? null : ordered.Min(line => line.Period),
            ordered.Count == 0 ? null : ordered.Max(line => line.Period),
            AmountOf(ordered),
            AmountOf(lines.Where(line => line.OrderLineType == OrderLineType.OutsideMonthly)),
            lines.Count(line => line.OrderLineType == OrderLineType.OutsideMonthly),
            lines.Count(line => line.OrderLineType == OrderLineType.Unclassified),
            months,
            [.. lines
                .OrderByDescending(line => line.Period)
                .ThenBy(line => line.LocationName, StringComparer.CurrentCulture)
                .Take(Math.Clamp(query.MaxLines, 1, 1000))
                .Select(Line)]);
    }

    private static ProductHistoryMonthDto Month(DateOnly period, IReadOnlyList<LineRow> lines)
    {
        var monthly = lines.Where(line => line.OrderLineType == OrderLineType.Monthly).ToList();
        var outside = lines.Where(line => line.OrderLineType == OrderLineType.OutsideMonthly).ToList();

        return new ProductHistoryMonthDto(
            period,
            monthly.Sum(line => line.Quantity),
            AmountOf(monthly),
            monthly.Count,
            outside.Sum(line => line.Quantity),
            AmountOf(outside),
            outside.Count,
            lines.Count(line => line.OrderLineType == OrderLineType.Unclassified),
            lines.Select(line => line.LocationId).Distinct().Count());
    }

    /// <summary>Unknown money stays unknown: a set with nothing priced has no total, never a zero.</summary>
    private static decimal? AmountOf(IEnumerable<LineRow> lines)
    {
        var priced = lines.Where(line => line.UnitPrice is not null).ToList();
        return priced.Count == 0 ? null : Money.RoundCents(priced.Sum(line => line.Quantity * line.UnitPrice!.Value));
    }

    private static ProductHistoryLineDto Line(LineRow line) => new(
        line.OrderRequestItemId,
        line.OrderRequestId,
        line.Period,
        line.LocationId,
        line.LocationName,
        VariantDescription.Of(line.SpecificationValue, line.SpecificationUnit, line.ModelCode,
            line.OrderUnit ?? VariantDescription.Unitless),
        line.Quantity,
        line.UnitPrice,
        line.UnitPrice is null ? null : Money.RoundCents(line.Quantity * line.UnitPrice.Value),
        line.OrderLineType,
        line.ResponsiblePersonName);

    private sealed record LineRow(
        long OrderRequestItemId,
        long OrderRequestId,
        DateOnly Period,
        int LocationId,
        string LocationName,
        string? SpecificationValue,
        string? SpecificationUnit,
        string? ModelCode,
        string? OrderUnit,
        decimal Quantity,
        decimal? UnitPrice,
        OrderLineType OrderLineType,
        string? ResponsiblePersonName);
}
