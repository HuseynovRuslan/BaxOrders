using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain.Orders;

namespace BaxOrders.UnitTests.Orders;

/// <summary>
/// What the decision panel says about who sent an order, which time, what the last correction request said and
/// who decided — read off the recorded events of the request and of the versions it corrects, and nothing else.
/// </summary>
public sealed class WorkflowDecisionFactsTests
{
    private static readonly DateTime Start = new(2026, 9, 22, 8, 0, 0, DateTimeKind.Utc);

    private long nextId = 1;

    // ---- one version ---------------------------------------------------------------------------------

    [Fact]
    public void A_draft_nobody_has_sent_has_no_facts_but_its_own_emptiness()
    {
        var facts = WorkflowDecisionFactsDto.Compute(OrderRequestStatus.Draft, [], []);

        Assert.False(facts.IsHistoricalImport);
        Assert.Equal(0, facts.SubmissionNumber);
        Assert.Null(facts.SubmittedByDisplayName);
        Assert.Null(facts.SubmittedAtUtc);
        Assert.Null(facts.PreviousReturn);
        Assert.Null(facts.Decision);
    }

    [Fact]
    public void The_first_submission_is_number_one_and_names_who_sent_it()
    {
        var sent = Submitted("Koordinator A", 0);

        var facts = WorkflowDecisionFactsDto.Compute(OrderRequestStatus.PendingApproval, [sent], []);

        Assert.Equal(1, facts.SubmissionNumber);
        Assert.Equal("Koordinator A", facts.SubmittedByDisplayName);
        Assert.Equal(sent.OccurredAtUtc, facts.SubmittedAtUtc);
        Assert.Null(facts.PreviousReturn);
        Assert.Null(facts.Decision);
    }

    [Fact]
    public void Returned_and_sent_again_unchanged_is_the_second_submission_after_that_request()
    {
        var returned = Returned("Rəhbər B", 1, "Miqdarlar yoxlanmalıdır");
        var again = Submitted("Koordinator A", 2);

        var facts = WorkflowDecisionFactsDto.Compute(
            OrderRequestStatus.PendingApproval, [Submitted("Koordinator A", 0), returned, again], []);

        Assert.Equal(2, facts.SubmissionNumber);
        Assert.Equal(again.OccurredAtUtc, facts.SubmittedAtUtc);
        Assert.Equal(("Rəhbər B", returned.OccurredAtUtc, "Miqdarlar yoxlanmalıdır"),
            (facts.PreviousReturn!.ActorDisplayName, facts.PreviousReturn.OccurredAtUtc, facts.PreviousReturn.Reason));
        Assert.Null(facts.Decision);
    }

    // ---- along the correction chain ------------------------------------------------------------------

    [Fact]
    public void A_correction_sent_for_the_first_time_is_still_the_second_submission_of_the_order()
    {
        var returned = Returned("Rəhbər B", 1, "Qiymətlər dəqiqləşdirilməlidir");
        List<WorkflowEventDto> v1 = [Submitted("Koordinator A", 0), returned];
        List<WorkflowEventDto> v2 = [Submitted("Koordinator C", 3)];

        var facts = WorkflowDecisionFactsDto.Compute(OrderRequestStatus.PendingApproval, v2, v1);

        Assert.Equal(2, facts.SubmissionNumber);
        // Who sent it and when are this version's own submission, not the first one.
        Assert.Equal("Koordinator C", facts.SubmittedByDisplayName);
        Assert.Equal(v2[0].OccurredAtUtc, facts.SubmittedAtUtc);
        Assert.Equal("Qiymətlər dəqiqləşdirilməlidir", facts.PreviousReturn!.Reason);
        Assert.Equal("Rəhbər B", facts.PreviousReturn.ActorDisplayName);
    }

    [Fact]
    public void A_third_round_counts_three_and_shows_the_latest_request_for_correction()
    {
        List<WorkflowEventDto> v1 = [Submitted("Koordinator A", 0), Returned("Rəhbər B", 1, "Birinci səbəb")];
        List<WorkflowEventDto> v2 = [Submitted("Koordinator A", 3), Returned("Rəhbər B", 4, "İkinci səbəb")];
        List<WorkflowEventDto> v3 = [Submitted("Koordinator A", 6)];

        var facts = WorkflowDecisionFactsDto.Compute(OrderRequestStatus.PendingApproval, v3, [.. v1, .. v2]);

        Assert.Equal(3, facts.SubmissionNumber);
        Assert.Equal("İkinci səbəb", facts.PreviousReturn!.Reason);
    }

    [Fact]
    public void A_correction_not_yet_sent_shows_the_request_it_answers_but_no_submission()
    {
        List<WorkflowEventDto> v1 = [Submitted("Koordinator A", 0), Returned("Rəhbər B", 1, "Yenidən bax")];

        var facts = WorkflowDecisionFactsDto.Compute(OrderRequestStatus.Draft, [], v1);

        Assert.Equal(0, facts.SubmissionNumber);
        Assert.Null(facts.SubmittedByDisplayName);
        Assert.Equal("Yenidən bax", facts.PreviousReturn!.Reason);
        Assert.Null(facts.Decision);
    }

    [Fact]
    public void A_version_that_corrects_nothing_starts_its_own_count()
    {
        // A new version made by a second import is not a correction: nothing links it to the earlier version,
        // so the caller passes no earlier history and the count starts again.
        var facts = WorkflowDecisionFactsDto.Compute(OrderRequestStatus.PendingApproval, [Submitted("Koordinator A", 5)], []);

        Assert.Equal(1, facts.SubmissionNumber);
        Assert.Null(facts.PreviousReturn);
    }

    // ---- the decision --------------------------------------------------------------------------------

    [Fact]
    public void An_approved_order_names_who_approved_it_and_when()
    {
        var approved = Approved("Rəhbər B", 1);

        var facts = WorkflowDecisionFactsDto.Compute(OrderRequestStatus.Approved, [Submitted("Koordinator A", 0), approved], []);

        Assert.Equal(OrderWorkflowAction.Approved, facts.Decision!.Action);
        Assert.Equal(("Rəhbər B", approved.OccurredAtUtc), (facts.Decision.ActorDisplayName, facts.Decision.OccurredAtUtc));
        Assert.Null(facts.Decision.Reason);
        Assert.Equal(1, facts.SubmissionNumber);
    }

    [Fact]
    public void A_returned_order_names_who_asked_for_the_correction_and_why_and_keeps_the_one_before_apart()
    {
        var first = Returned("Rəhbər B", 1, "Birinci səbəb");
        var second = Returned("Rəhbər D", 3, "İkinci səbəb");

        var facts = WorkflowDecisionFactsDto.Compute(
            OrderRequestStatus.ReturnedForCorrection,
            [Submitted("Koordinator A", 0), first, Submitted("Koordinator A", 2), second],
            []);

        // The return that closed this cycle is the decision, not a "previous" one.
        Assert.Equal(OrderWorkflowAction.ReturnedForCorrection, facts.Decision!.Action);
        Assert.Equal(("Rəhbər D", "İkinci səbəb"), (facts.Decision.ActorDisplayName, facts.Decision.Reason));
        Assert.Equal("Birinci səbəb", facts.PreviousReturn!.Reason);
        Assert.Equal(2, facts.SubmissionNumber);
    }

    [Fact]
    public void A_waiting_order_has_no_decision_yet()
    {
        var facts = WorkflowDecisionFactsDto.Compute(OrderRequestStatus.PendingApproval, [Submitted("Koordinator A", 0)], []);

        Assert.Null(facts.Decision);
    }

    // ---- an order carried in from Excel --------------------------------------------------------------

    [Fact]
    public void A_historical_import_is_flagged_and_nothing_else_is_filled_in()
    {
        // 4.1: nobody sent it or approved it here, so no name and no date is made up for either.
        var carried = Event(OrderWorkflowAction.ImportedAsApproved, "Sistem", 0, "Tarixi sifariş sistemə artıq təsdiqlənmiş kimi köçürülüb.");

        var facts = WorkflowDecisionFactsDto.Compute(OrderRequestStatus.Approved, [carried], []);

        Assert.True(facts.IsHistoricalImport);
        Assert.Equal(0, facts.SubmissionNumber);
        Assert.Null(facts.SubmittedByDisplayName);
        Assert.Null(facts.SubmittedAtUtc);
        Assert.Null(facts.PreviousReturn);
        Assert.Null(facts.Decision);
    }

    [Fact]
    public void An_order_approved_through_this_application_is_not_a_historical_import()
    {
        var facts = WorkflowDecisionFactsDto.Compute(
            OrderRequestStatus.Approved, [Submitted("Koordinator A", 0), Approved("Rəhbər B", 1)], []);

        Assert.False(facts.IsHistoricalImport);
    }

    // ---- fixture -------------------------------------------------------------------------------------

    private WorkflowEventDto Submitted(string actor, int hour) =>
        Event(OrderWorkflowAction.SubmittedForApproval, actor, hour, null);

    private WorkflowEventDto Returned(string actor, int hour, string reason) =>
        Event(OrderWorkflowAction.ReturnedForCorrection, actor, hour, reason);

    private WorkflowEventDto Approved(string actor, int hour) =>
        Event(OrderWorkflowAction.Approved, actor, hour, null);

    private WorkflowEventDto Event(OrderWorkflowAction action, string actor, int hour, string? comment)
    {
        var (from, to) = action switch
        {
            OrderWorkflowAction.SubmittedForApproval => (OrderRequestStatus.Draft, OrderRequestStatus.PendingApproval),
            OrderWorkflowAction.ReturnedForCorrection => (OrderRequestStatus.PendingApproval, OrderRequestStatus.ReturnedForCorrection),
            OrderWorkflowAction.Approved => (OrderRequestStatus.PendingApproval, OrderRequestStatus.Approved),
            _ => (OrderRequestStatus.Draft, OrderRequestStatus.Approved),
        };

        return new WorkflowEventDto(
            nextId++, action, from, to, Guid.NewGuid(), actor, comment, 0, false, Start.AddHours(hour));
    }
}
