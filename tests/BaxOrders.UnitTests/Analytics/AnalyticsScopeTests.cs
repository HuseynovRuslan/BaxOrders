using BaxOrders.Application.Analytics;
using BaxOrders.Domain.Orders;

namespace BaxOrders.UnitTests.Analytics;

/// <summary>
/// One word for the question a manager keeps asking in three ways, so the answer means the same everywhere.
/// </summary>
/// <remarks>
/// The rule these tests hold is the one the whole product rests on: a line nobody has classified may reach the
/// factual total and nothing else. Counting it as monthly demand would be exactly the guess the classification
/// exists to prevent.
/// </remarks>
public sealed class AnalyticsScopeTests
{
    private static readonly OrderLineType[] EveryKind =
        [OrderLineType.Monthly, OrderLineType.OutsideMonthly, OrderLineType.Unclassified];

    [Theory]
    [InlineData(AnalyticsScope.Monthly, OrderLineType.Monthly)]
    [InlineData(AnalyticsScope.OutsideMonthly, OrderLineType.OutsideMonthly)]
    public void A_single_kind_scope_reads_that_kind_and_no_other(AnalyticsScope scope, OrderLineType kind)
    {
        var kept = Items(EveryKind).InScope(scope).ToList();

        Assert.Equal(kind, Assert.Single(kept).OrderLineType);
    }

    [Fact]
    public void The_factual_total_reads_every_line_including_the_unclassified_ones()
    {
        var kept = Items(EveryKind).InScope(AnalyticsScope.All).ToList();

        Assert.Equal(EveryKind, kept.Select(item => item.OrderLineType));
    }

    /// <summary>The line nobody classified is the one that must never be counted as demand.</summary>
    [Theory]
    [InlineData(AnalyticsScope.Monthly)]
    [InlineData(AnalyticsScope.OutsideMonthly)]
    public void An_unclassified_line_reaches_no_scope_but_the_factual_total(AnalyticsScope scope)
    {
        var kept = Items([OrderLineType.Unclassified]).InScope(scope).ToList();

        Assert.Empty(kept);
    }

    /// <summary>The old name still means what it meant, because a great deal is written against it.</summary>
    [Fact]
    public void Only_monthly_is_the_monthly_scope()
    {
        var items = Items(EveryKind);

        Assert.Equal(
            items.InScope(AnalyticsScope.Monthly).Select(item => item.OrderLineType),
            items.OnlyMonthly().Select(item => item.OrderLineType));
    }

    [Fact]
    public void A_scope_the_contract_does_not_define_is_refused_rather_than_guessed()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Items(EveryKind).InScope((AnalyticsScope)99).ToList());
    }

    /// <summary>
    /// The lines are shaped by hand rather than built through the domain: this is a question about the
    /// population and nothing else, and a real order would drag a catalog behind it for no gain.
    /// </summary>
    private static IQueryable<OrderRequestItem> Items(IReadOnlyList<OrderLineType> kinds) =>
        kinds.Select(kind =>
        {
            var item = (OrderRequestItem)System.Runtime.CompilerServices.RuntimeHelpers
                .GetUninitializedObject(typeof(OrderRequestItem));
            typeof(OrderRequestItem).GetProperty(nameof(OrderRequestItem.OrderLineType))!
                .SetValue(item, kind);
            return item;
        }).AsQueryable();
}
