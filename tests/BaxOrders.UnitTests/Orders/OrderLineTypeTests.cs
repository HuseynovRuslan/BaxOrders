using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.UnitTests.TestSupport;

namespace BaxOrders.UnitTests.Orders;

/// <summary>
/// Whether a line is the month's planned material or was asked for on top of it. Today the value is written
/// only by the migration that carried the business's own classification in, so what the domain has to get
/// right is the two things it decides by itself: what an unclassified line says, and what happens to the
/// classification when a returned order is corrected.
/// </summary>
public sealed class OrderLineTypeTests
{
    private static readonly DateTime Now = new(2026, 9, 26, 10, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly July = new(2026, 7, 1);
    private static readonly WorkflowActor Coordinator = WorkflowActor.User(Guid.NewGuid(), "Sınaq koordinatoru");
    private static readonly WorkflowActor Manager = WorkflowActor.User(Guid.NewGuid(), "Sınaq rəhbəri");

    /// <summary>
    /// A line somebody adds by hand is the ordinary case — the month's planned material — and starts as that.
    /// The guess this feature exists to prevent is a guess about a <i>file</i>: an import always states the
    /// classification and states Unclassified when the workbook says nothing.
    /// </summary>
    [Fact]
    public void A_line_added_by_hand_starts_as_the_month_s_planned_material()
    {
        var request = new OrderRequest(Location(), July);

        var item = request.AddItem(Variant(), 3m, 4m);

        Assert.Equal(OrderLineType.Monthly, item.OrderLineType);
    }

    [Fact]
    public void A_line_the_source_said_nothing_about_is_left_unclassified()
    {
        var request = new OrderRequest(Location(), July);

        var item = request.AddItem(Variant(), 3m, 4m, orderLineType: OrderLineType.Unclassified);

        Assert.Equal(OrderLineType.Unclassified, item.OrderLineType);
    }

    /// <summary>
    /// Unclassified is the CLR default as well as the column default, so a line built in code and a row
    /// inserted without the column agree — there is no third state where the two disagree.
    /// </summary>
    [Fact]
    public void Unclassified_is_the_default_of_the_type_itself()
    {
        Assert.Equal(OrderLineType.Unclassified, default);
        Assert.Equal(0, (int)OrderLineType.Unclassified);
    }

    [Theory]
    [InlineData(OrderLineType.Monthly)]
    [InlineData(OrderLineType.OutsideMonthly)]
    [InlineData(OrderLineType.Unclassified)]
    public void A_correction_keeps_what_the_line_was_classified_as(OrderLineType type)
    {
        var source = Returned();
        TestEntities.With(source.Items.Single(), nameof(OrderRequestItem.OrderLineType), type);

        var copy = source.CreateRevision(Coordinator, Now).Items.Single();

        Assert.Equal(type, copy.OrderLineType);
    }

    /// <summary>
    /// The reason the classification is copied at all: a corrected order that lost it would drop out of the
    /// monthly figures it has been counted in since the day it was approved.
    /// </summary>
    [Fact]
    public void A_correction_does_not_quietly_drop_a_line_out_of_the_monthly_figures()
    {
        var source = Returned(request =>
        {
            request.AddItem(Variant("Vedrə"), 2m, 1m);
            request.AddItem(Variant("Şotka"), 5m, 3m);
        });
        foreach (var item in source.Items)
        {
            TestEntities.With(item, nameof(OrderRequestItem.OrderLineType), OrderLineType.Monthly);
        }

        var revision = source.CreateRevision(Coordinator, Now);

        Assert.Equal(source.Items.Count, revision.Items.Count(item => item.OrderLineType == OrderLineType.Monthly));
    }

    private static Location Location() => new("MASTAGA", "Maştağa");

    private static ProductVariant Variant(string name = "Bel") =>
        new Product("PRD-000001", name).AddVariant(null, null, null, TestEntities.Pieces());

    private static OrderRequest Returned(Action<OrderRequest>? lines = null)
    {
        var request = new OrderRequest(Location(), July);
        if (lines is null)
        {
            request.AddItem(Variant(), 3m, 4m);
        }
        else
        {
            lines(request);
        }

        request.SubmitForApproval(Coordinator, null, Now.AddHours(-2));
        request.ReturnForCorrection(Manager, "Miqdarlar yoxlanmalıdır", Now.AddHours(-1));
        return request;
    }
}
