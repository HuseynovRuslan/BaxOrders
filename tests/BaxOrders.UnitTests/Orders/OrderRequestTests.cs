using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.UnitTests.TestSupport;

namespace BaxOrders.UnitTests.Orders;

public sealed class OrderRequestTests
{
    private static readonly DateOnly March = new(2026, 3, 1);

    [Fact]
    public void Request_from_the_order_workbook_has_a_period_and_no_request_date()
    {
        var request = new OrderRequest(Mastaga(), March);

        Assert.Equal(March, request.RequestPeriod);
        Assert.Null(request.RequestDate);
        Assert.Equal(OrderRequestStatus.Draft, request.Status);
        Assert.Equal(1, request.Version);
    }

    [Fact]
    public void Request_date_may_fall_before_the_period()
    {
        // Legacy request form: "Tarix: 22.06.2026", "Dövr: 01.07.2026 - 31.07.2026".
        var request = new OrderRequest(Mastaga(), new DateOnly(2026, 7, 1), requestDate: new DateOnly(2026, 6, 22));

        Assert.Equal(new DateOnly(2026, 7, 1), request.RequestPeriod);
        Assert.Equal(new DateOnly(2026, 6, 22), request.RequestDate);
    }

    [Fact]
    public void Period_must_be_the_first_day_of_a_month()
    {
        Assert.Throws<DomainException>(() => new OrderRequest(Mastaga(), new DateOnly(2026, 3, 15)));
    }

    [Fact]
    public void Inactive_location_cannot_create_requests()
    {
        var location = Mastaga();
        location.Deactivate();

        Assert.Throws<DomainException>(() => new OrderRequest(location, March));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Quantity_must_be_positive(decimal quantity)
    {
        var request = new OrderRequest(Mastaga(), March);

        Assert.Throws<DomainException>(() => request.AddItem(Shovel(), quantity, 10m));
    }

    [Fact]
    public void Unit_price_must_not_be_negative()
    {
        var request = new OrderRequest(Mastaga(), March);

        Assert.Throws<DomainException>(() => request.AddItem(Shovel(), 1m, -0.01m));
    }

    [Fact]
    public void Values_that_the_database_would_round_are_rejected()
    {
        var request = new OrderRequest(Mastaga(), March);

        Assert.Throws<DomainException>(() => request.AddItem(Shovel(), 1.2345m, 1m));
        Assert.Throws<DomainException>(() => request.AddItem(Shovel(), 1m, 4.12345m));
    }

    [Fact]
    public void Line_total_is_derived_from_quantity_and_unit_price()
    {
        var request = new OrderRequest(Mastaga(), March);

        var item = request.AddItem(Shovel(), 43m, 4.50m);

        Assert.Equal(193.50m, item.LineTotal);
    }

    [Fact]
    public void Line_total_is_unknown_without_a_price()
    {
        var request = new OrderRequest(Mastaga(), March);

        var item = request.AddItem(Shovel(), 43m, unitPrice: null);

        Assert.Null(item.LineTotal);
    }

    [Fact]
    public void Empty_request_cannot_be_submitted()
    {
        var request = new OrderRequest(Mastaga(), March);

        Assert.Throws<DomainException>(() => request.Submit(DateTime.UtcNow));
    }

    [Fact]
    public void Request_goes_from_draft_to_pending_approval_to_approved()
    {
        var request = new OrderRequest(Mastaga(), March);
        request.AddItem(Shovel(), 120m, 7m);
        var submittedAt = new DateTime(2026, 3, 18, 8, 0, 0, DateTimeKind.Utc);
        var approvedAt = submittedAt.AddHours(3);

        request.Submit(submittedAt);
        request.Approve(approvedAt);

        Assert.Equal(OrderRequestStatus.Approved, request.Status);
        Assert.Equal(submittedAt, request.SubmittedAtUtc);
        Assert.Equal(approvedAt, request.ApprovedAtUtc);
        Assert.Null(request.RejectedAtUtc);
    }

    [Fact]
    public void Draft_cannot_be_approved_or_rejected()
    {
        var request = new OrderRequest(Mastaga(), March);

        Assert.Throws<DomainException>(() => request.Approve(DateTime.UtcNow));
        Assert.Throws<DomainException>(() => request.Reject(DateTime.UtcNow));
    }

    [Fact]
    public void Submitted_request_cannot_be_changed()
    {
        var request = new OrderRequest(Mastaga(), March);
        var item = request.AddItem(Shovel(), 1m, 1m);
        request.Submit(DateTime.UtcNow);

        Assert.Throws<DomainException>(() => request.AddItem(Shovel(), 1m, 1m));
        Assert.Throws<DomainException>(() => request.RemoveItem(item));
    }

    [Fact]
    public void Timestamps_must_be_utc()
    {
        var request = new OrderRequest(Mastaga(), March);
        request.AddItem(Shovel(), 1m, 1m);

        Assert.Throws<DomainException>(() => request.Submit(new DateTime(2026, 3, 18, 8, 0, 0, DateTimeKind.Local)));
    }

    [Fact]
    public void Correction_creates_the_next_version_of_the_same_logical_request()
    {
        var original = SubmittedRequest();

        var correction = original.CreateNextVersion(requestDate: new DateOnly(2026, 3, 20));

        Assert.Equal(2, correction.Version);
        Assert.Same(original.Location, correction.Location);
        Assert.Equal(original.RequestPeriod, correction.RequestPeriod);
        Assert.Equal(new DateOnly(2026, 3, 20), correction.RequestDate!.Value);
        Assert.Equal(OrderRequestStatus.Draft, correction.Status);
        Assert.Empty(correction.Items);
    }

    [Fact]
    public void Correction_without_a_request_date_keeps_the_period()
    {
        var correction = SubmittedRequest().CreateNextVersion();

        Assert.Equal(March, correction.RequestPeriod);
        Assert.Null(correction.RequestDate);
    }

    [Fact]
    public void Creating_a_correction_leaves_the_earlier_version_untouched()
    {
        var original = SubmittedRequest();

        original.CreateNextVersion();

        Assert.Equal(1, original.Version);
        Assert.Equal(OrderRequestStatus.PendingApproval, original.Status);
        Assert.Single(original.Items);
    }

    [Fact]
    public void Correction_submitted_next_month_stays_in_the_original_period()
    {
        var correction = SubmittedRequest().CreateNextVersion(requestDate: new DateOnly(2026, 4, 2));

        Assert.Equal(March, correction.RequestPeriod);
    }

    [Fact]
    public void Versions_keep_incrementing()
    {
        var second = SubmittedRequest().CreateNextVersion();
        second.AddItem(Shovel(), 1m, 1m);
        second.Submit(DateTime.UtcNow);
        second.Reject(DateTime.UtcNow);

        var third = second.CreateNextVersion();

        Assert.Equal(3, third.Version);
    }

    [Fact]
    public void Draft_is_corrected_in_place_not_versioned()
    {
        var draft = new OrderRequest(Mastaga(), March);

        Assert.Throws<DomainException>(() => draft.CreateNextVersion());
    }

    private static OrderRequest SubmittedRequest()
    {
        var request = new OrderRequest(Mastaga(), March);
        request.AddItem(Shovel(), 100m, 7m);
        request.Submit(DateTime.UtcNow);
        return request;
    }

    private static Location Mastaga() => new("MASTAGA", "Maştağa");

    private static ProductVariant Shovel() =>
        new Product("PRD-000100", "Lapatka").AddVariant(null, null, null, TestEntities.Pieces());
}
