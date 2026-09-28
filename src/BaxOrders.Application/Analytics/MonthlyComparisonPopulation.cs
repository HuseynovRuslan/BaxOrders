using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Analytics;

/// <summary>
/// Which lines a screen is asking about.
/// </summary>
/// <remarks>
/// One word for a question the manager keeps asking in three different ways, so that the answer means the same
/// on every screen. It is a population, never a filter on top of one: everything downstream — the amounts, the
/// differences, the averages, the decomposition — is computed over exactly these lines and nothing else.
/// </remarks>
public enum AnalyticsScope
{
    /// <summary>
    /// The month's planned material: what the company orders every month.
    /// </summary>
    /// <remarks>
    /// The default everywhere, and the only scope a month-on-month comparison may be read as demand. A one-off
    /// purchase for a broken pump is not a rise in demand, and a line nobody has classified is not evidence of
    /// either, so neither is here.
    /// </remarks>
    Monthly = 1,

    /// <summary>
    /// What was bought on top of the plan.
    /// </summary>
    /// <remarks>
    /// Real money, and a real question — "is our off-plan spending growing" — but a question about spend and
    /// never about demand. A screen showing this scope must say so in its words.
    /// </remarks>
    OutsideMonthly = 2,

    /// <summary>
    /// Everything the company actually spent, whatever kind of line it was.
    /// </summary>
    /// <remarks>
    /// The only scope that carries lines nobody has classified, because this is the factual total and leaving
    /// them out would understate it. It must never be described as monthly demand: «Ümumi faktiki xərc».
    /// </remarks>
    All = 3,
}

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
/// So <see cref="AnalyticsScope.Monthly"/> reads <see cref="OrderLineType.Monthly"/> lines and nothing else.
/// <see cref="OrderLineType.Unclassified"/> is in no scope but <see cref="AnalyticsScope.All"/>, because
/// nobody has said which it is — counting it as monthly would be the guess this classification exists to
/// prevent, and leaving it out of the factual total would understate what was spent.
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
        items.InScope(AnalyticsScope.Monthly);

    /// <summary>The lines one scope is about.</summary>
    public static IQueryable<OrderRequestItem> InScope(this IQueryable<OrderRequestItem> items, AnalyticsScope scope) =>
        scope switch
        {
            AnalyticsScope.Monthly => items.Where(item => item.OrderLineType == OrderLineType.Monthly),
            AnalyticsScope.OutsideMonthly => items.Where(item => item.OrderLineType == OrderLineType.OutsideMonthly),
            AnalyticsScope.All => items,
            _ => throw new ArgumentOutOfRangeException(nameof(scope), scope, "Unknown analytics scope."),
        };
}
