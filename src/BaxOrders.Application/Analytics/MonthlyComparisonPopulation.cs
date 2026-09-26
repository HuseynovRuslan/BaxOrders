using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Analytics;

/// <summary>
/// Which lines a month-on-month comparison is allowed to look at.
/// </summary>
/// <remarks>
/// <para>
/// The monthly comparison answers "why is this month's order bigger than last month's". That question is only
/// meaningful about material the company orders every month. A one-off purchase for a broken pump or an event
/// is not a rise in demand: it is a thing that happened once, and mixing it in makes the comparison say a
/// change is happening where none is.
/// </para>
/// <para>
/// So the comparison reads <see cref="OrderLineType.Monthly"/> lines and nothing else.
/// <see cref="OrderLineType.OutsideMonthly"/> has its own factual summary, and
/// <see cref="OrderLineType.Unclassified"/> is in neither, because nobody has said which it is — counting it
/// as monthly would be the guess this classification exists to prevent.
/// </para>
/// <para>
/// This changes only the population. Every quantity, price, interaction and rounding rule in the decomposition
/// stays exactly as it was; the filter is applied before any of them run.
/// </para>
/// </remarks>
public static class MonthlyComparisonPopulation
{
    /// <summary>The lines a monthly comparison may read.</summary>
    public static IQueryable<OrderRequestItem> OnlyMonthly(this IQueryable<OrderRequestItem> items) =>
        items.Where(item => item.OrderLineType == OrderLineType.Monthly);
}
