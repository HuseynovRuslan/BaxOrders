using System.Linq.Expressions;
using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Orders.Pricing;

/// <summary>
/// How many lines are priced, how many are a problem, and how many are the company supplying itself.
/// </summary>
/// <remarks>
/// One shape, read by every screen. Before this, each read model counted the raw lines its own way and three
/// of them forgot that an internally supplied line has no price on purpose — so one order was reported as
/// having one problem on the order screen and two on the object screen.
/// </remarks>
/// <param name="WarningLineCount">
/// Lines somebody has to put right: unpriced and either owed a price or not yet classified.
/// </param>
/// <param name="InternalSupplyLineCount">Lines the company supplies itself. Context, never a problem.</param>
public sealed record LinePricingCounts(
    int LineCount,
    int PricedLineCount,
    int WarningLineCount,
    int InternalSupplyLineCount)
{
    public static readonly LinePricingCounts Empty = new(0, 0, 0, 0);

    /// <summary>
    /// True when every line that needed a price has one.
    /// </summary>
    /// <remarks>
    /// Not "every line has a price". An order supplied entirely from the company's own store is complete and
    /// still has no money at all, and saying its amount is incomplete would send somebody looking for figures
    /// that were never owed.
    /// </remarks>
    public bool IsAmountComplete => WarningLineCount == 0;

    public static LinePricingCounts Of(IEnumerable<OrderLinePricingState> states)
    {
        ArgumentNullException.ThrowIfNull(states);

        int lines = 0, priced = 0, warning = 0, internalSupply = 0;
        foreach (var state in states)
        {
            lines++;
            if (state == OrderLinePricingState.Priced) priced++;
            else if (state.IsWarning()) warning++;
            else if (state.IsInternalSupply()) internalSupply++;
        }

        return new LinePricingCounts(lines, priced, warning, internalSupply);
    }

    public static LinePricingCounts Of(IEnumerable<OrderRequestItem> items)
    {
        ArgumentNullException.ThrowIfNull(items);
        return Of(items.Select(item => item.PricingState));
    }
}

/// <summary>
/// The same rule, expressed so the database can evaluate it.
/// </summary>
/// <remarks>
/// <para>
/// A read model that counts lines must count them through here. The predicates are the query-side twin of
/// <see cref="OrderLinePricing.Classify"/>; the unit tests hold the two to the same answers for every
/// combination of price and pricing mode, which is what stops them drifting apart again.
/// </para>
/// <para>
/// They are separate expressions rather than one classifier because EF translates a boolean predicate into
/// SQL and cannot translate a switch that returns an enum. This is the price of counting in the database
/// instead of pulling every line into memory, and it is worth paying once here rather than at each caller.
/// </para>
/// </remarks>
public static class OrderLinePricingQueries
{
    /// <summary>A price is recorded. Whatever the pricing mode says, the price is the fact.</summary>
    public static readonly Expression<Func<OrderRequestItem, bool>> Priced =
        item => item.UnitPrice != null;

    /// <summary>Unpriced and owed — or unpriced and unanswered, which is treated the same way.</summary>
    public static readonly Expression<Func<OrderRequestItem, bool>> Warning =
        item => item.UnitPrice == null && item.PricingMode != PricingMode.InternalFreeSupply;

    /// <summary>Unpriced because the company supplies it. Never a warning.</summary>
    public static readonly Expression<Func<OrderRequestItem, bool>> InternalSupply =
        item => item.UnitPrice == null && item.PricingMode == PricingMode.InternalFreeSupply;

}
