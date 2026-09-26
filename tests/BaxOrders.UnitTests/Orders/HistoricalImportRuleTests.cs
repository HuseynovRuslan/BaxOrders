using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain.Orders;

namespace BaxOrders.UnitTests.Orders;

/// <summary>
/// The one rule that says an order was carried in from Excel as already approved, and the chain walk it reads.
/// The order page and the lists both ask it, so what is pinned here is what every screen says (owner decision 22.4).
/// </summary>
public sealed class HistoricalImportRuleTests
{
    private const OrderWorkflowAction Imported = OrderWorkflowAction.ImportedAsApproved;
    private const OrderWorkflowAction Submitted = OrderWorkflowAction.SubmittedForApproval;
    private const OrderWorkflowAction Approved = OrderWorkflowAction.Approved;
    private const OrderWorkflowAction Returned = OrderWorkflowAction.ReturnedForCorrection;

    // ---- Holds ---------------------------------------------------------------------------------------

    [Fact]
    public void The_carried_over_event_alone_is_a_historical_import() =>
        Assert.True(HistoricalImportRule.Holds([Imported], []));

    [Fact]
    public void No_event_at_all_is_not_one() =>
        Assert.False(HistoricalImportRule.Holds([], []));

    [Fact]
    public void An_order_approved_through_this_application_is_not_one() =>
        Assert.False(HistoricalImportRule.Holds([Submitted, Approved], []));

    [Fact]
    public void Being_sent_for_approval_after_the_carried_over_event_makes_it_not_one() =>
        Assert.False(HistoricalImportRule.Holds([Imported, Submitted], []));

    [Fact]
    public void A_submission_anywhere_earlier_in_the_chain_makes_it_not_one() =>
        Assert.False(HistoricalImportRule.Holds([Imported], [Submitted, Returned]));

    /// <summary>Only the request's own carried-over event counts; one on a version it corrects does not.</summary>
    [Fact]
    public void A_carried_over_event_on_an_earlier_version_only_is_not_one() =>
        Assert.False(HistoricalImportRule.Holds([], [Imported]));

    // ---- EarlierVersions -----------------------------------------------------------------------------

    [Fact]
    public void A_request_with_no_revision_link_corrects_nothing() =>
        Assert.Empty(HistoricalImportRule.EarlierVersions(10, new Dictionary<long, long> { [20] = 21 }));

    [Fact]
    public void A_three_version_chain_is_walked_back_nearest_first()
    {
        // 3 corrects 2, which corrects 1.
        var links = new Dictionary<long, long> { [3] = 2, [2] = 1 };

        Assert.Equal([2L, 1L], HistoricalImportRule.EarlierVersions(3, links));
        Assert.Equal([1L], HistoricalImportRule.EarlierVersions(2, links));
        Assert.Empty(HistoricalImportRule.EarlierVersions(1, links));
    }

    [Fact]
    public void A_cycle_in_the_links_ends_the_walk()
    {
        var links = new Dictionary<long, long> { [1] = 2, [2] = 3, [3] = 1 };

        var earlier = HistoricalImportRule.EarlierVersions(1, links);

        // Each link is followed once, and then the walk stops rather than going round for ever.
        Assert.Equal([2L, 3L, 1L], earlier);
    }
}
