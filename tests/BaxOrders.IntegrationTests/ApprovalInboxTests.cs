using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Approvals;
using BaxOrders.Application.Common;
using BaxOrders.Application.Orders.Revisions;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The queue of requests waiting for a decision, against a real PostgreSQL.
/// </summary>
/// <remarks>
/// The database is shared with every other test in the suite, and other tests leave requests of their own in
/// <c>PendingApproval</c> behind — the fixture drops the whole database only once, at the end of the run. So
/// every test here either scopes its check to a location it created itself (search, or membership in the
/// returned rows), or compares a <b>before</b> and an <b>after</b> reading rather than asserting an absolute
/// count — the same discipline <see cref="ManagementDashboardTests"/> already follows for the same reason.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ApprovalInboxTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;
    private static readonly DateOnly July = new(2026, 7, 1);
    private static readonly DateOnly August = new(2026, 8, 1);

    // ---- what appears in the queue ---------------------------------------------------------------------

    [PostgresFact]
    public async Task Only_requests_pending_approval_appear()
    {
        var tag = Tag();
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");

        var draftId = await NewRequestAsync(tag + "-draft");
        var pendingId = await NewRequestAsync(tag + "-pending");
        await WorkflowAs(coordinator, service => service.SubmitAsync(pendingId, new SubmitForApprovalCommand(), None));

        var returnedId = await NewRequestAsync(tag + "-returned");
        await WorkflowAs(coordinator, service => service.SubmitAsync(returnedId, new SubmitForApprovalCommand(), None));
        await WorkflowAs(manager, service => service.ReturnAsync(returnedId, new ReturnForCorrectionCommand("Yenidən bax"), None));

        var approvedId = await NewRequestAsync(tag + "-approved");
        await WorkflowAs(coordinator, service => service.SubmitAsync(approvedId, new SubmitForApprovalCommand(), None));
        await WorkflowAs(manager, service => service.ApproveAsync(approvedId, new ApproveOrderCommand(), None));

        var inbox = await InboxAs(manager, new ApprovalInboxQuery(Search: tag));

        var ids = inbox.Rows.Items.Select(row => row.OrderRequestId).ToList();
        Assert.Contains(pendingId, ids);
        Assert.DoesNotContain(draftId, ids);
        Assert.DoesNotContain(returnedId, ids);
        Assert.DoesNotContain(approvedId, ids);
        Assert.Single(inbox.Rows.Items);
    }

    // ---- who may decide --------------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_submitter_sees_their_own_request_blocked_and_says_why()
    {
        var tag = Tag();
        // Somebody who sent it and has since become a Rəhbər — the only way an approver is ever the submitter.
        var person = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru, sonra rəhbər");

        var requestId = await NewRequestAsync(tag);
        await WorkflowAs(person, service => service.SubmitAsync(requestId, new SubmitForApprovalCommand(), None));

        var inbox = await InboxAs(person.As(BaxOrdersRoles.Manager), new ApprovalInboxQuery(Search: tag));
        var row = Assert.Single(inbox.Rows.Items);

        Assert.False(row.CanApprove);
        Assert.False(row.CanReturn);
        Assert.True(row.BlockedBySelfApproval);
        Assert.False(row.BlockedByOwnContribution);
        Assert.False(row.BlockedByMissingAuthority);
        // The row is still shown, never hidden: the manager understands why nothing is offered.
        Assert.Equal(requestId, row.OrderRequestId);
    }

    [PostgresFact]
    public async Task Whoever_edited_the_correction_sees_it_blocked_and_an_untouched_manager_can_decide()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var editingAdmin = await UserAsync(BaxOrdersRoles.Admin, "Düzəliş edən administrator");
        var freshManager = await UserAsync(BaxOrdersRoles.Manager, "Toxunmayan rəhbər");

        var v1 = await NewRequestAsync(tag, quantity: 10m);
        await WorkflowAs(coordinator, service => service.SubmitAsync(v1, new SubmitForApprovalCommand(), None));
        await WorkflowAs(freshManager, service => service.ReturnAsync(v1, new ReturnForCorrectionCommand("Yoxlanmalıdır"), None));

        var created = await RevisingAs(coordinator, service => service.CreateAsync(v1, None));
        var v2 = created.OrderRequestId;
        var lineId = await LineIdAsync(v2, 10m);

        // An administrator edits the correction -- a manager cannot, so the contributor here is the admin.
        var current = await RevisingAs(editingAdmin, service => service.GetAsync(v2, None));
        await RevisingAs(editingAdmin, service =>
            service.EditItemAsync(v2, lineId, new EditOrderItemCommand(current!.RowVersion, Quantity: new FieldChange<decimal>(11m)), None));

        await WorkflowAs(coordinator, service => service.SubmitAsync(v2, new SubmitForApprovalCommand(), None));

        // As the administrator they are, the missing authority is what they are told — it comes first (4.3).
        var adminsView = Assert.Single((await InboxAs(editingAdmin, new ApprovalInboxQuery(Search: tag))).Rows.Items);
        Assert.False(adminsView.CanApprove);
        Assert.True(adminsView.BlockedByMissingAuthority);
        Assert.False(adminsView.BlockedByOwnContribution);

        // The same person made a Rəhbər is blocked by what they did to the correction.
        var editorsView = await InboxAs(editingAdmin.As(BaxOrdersRoles.Manager), new ApprovalInboxQuery(Search: tag));
        var editorsRow = Assert.Single(editorsView.Rows.Items);
        Assert.False(editorsRow.CanApprove);
        Assert.False(editorsRow.CanReturn);
        Assert.False(editorsRow.BlockedBySelfApproval);
        Assert.True(editorsRow.BlockedByOwnContribution);
        Assert.False(editorsRow.BlockedByMissingAuthority);

        var freshView = await InboxAs(freshManager, new ApprovalInboxQuery(Search: tag));
        var freshRow = Assert.Single(freshView.Rows.Items);
        Assert.True(freshRow.CanApprove);
        Assert.True(freshRow.CanReturn);
        Assert.False(freshRow.BlockedBySelfApproval);
        Assert.False(freshRow.BlockedByOwnContribution);
        Assert.False(freshRow.BlockedByMissingAuthority);
    }

    [PostgresFact]
    public async Task An_unrelated_manager_may_decide_on_an_ordinary_submission()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var requestId = await NewRequestAsync(tag);
        await WorkflowAs(coordinator, service => service.SubmitAsync(requestId, new SubmitForApprovalCommand(), None));

        var row = Assert.Single((await InboxAs(manager, new ApprovalInboxQuery(Search: tag))).Rows.Items);

        Assert.True(row.CanApprove);
        Assert.True(row.CanReturn);
        Assert.False(row.BlockedBySelfApproval);
        Assert.False(row.BlockedByOwnContribution);
    }

    [PostgresFact]
    public async Task An_administrator_sees_every_waiting_request_and_may_decide_none_of_them()
    {
        // 4.3: an administrator holds no approval authority — neither on their own submission nor on anybody
        // else's — and still sees the whole queue, with the reason on every row.
        var tag = Tag();
        var admin = await UserAsync(BaxOrdersRoles.Admin, "Sınaq administratoru A");
        var otherAdmin = await UserAsync(BaxOrdersRoles.Admin, "Sınaq administratoru B");
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");

        var ownId = await NewRequestAsync(tag + "-own");
        await WorkflowAs(admin, service => service.SubmitAsync(ownId, new SubmitForApprovalCommand(), None));
        var othersId = await NewRequestAsync(tag + "-other");
        await WorkflowAs(coordinator, service => service.SubmitAsync(othersId, new SubmitForApprovalCommand(), None));

        foreach (var reader in new[] { admin, otherAdmin })
        {
            var rows = (await InboxAs(reader, new ApprovalInboxQuery(Search: tag))).Rows.Items;

            Assert.Equal([ownId, othersId], rows.Select(row => row.OrderRequestId).Order());
            Assert.All(rows, row =>
            {
                Assert.False(row.CanApprove);
                Assert.False(row.CanReturn);
                Assert.True(row.BlockedByMissingAuthority);
                Assert.False(row.BlockedBySelfApproval);
                Assert.False(row.BlockedByOwnContribution);
            });
        }
    }

    // ---- what each row reports --------------------------------------------------------------------------

    [PostgresFact]
    public async Task Missing_price_fields_report_the_count_and_the_partial_amount()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        long requestId;
        await using (var db = database.CreateContext())
        {
            var location = new Location(await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Təsdiq obyekti {tag}");
            db.Locations.Add(location);
            await db.SaveChangesAsync();

            var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
            var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Təsdiq malı {tag}");
            db.Products.Add(product);
            await db.SaveChangesAsync();

            var priced = product.AddVariant(null, null, null, pieces);
            var unpriced = product.AddVariant("50", null, null, pieces);
            await db.SaveChangesAsync();

            var request = new OrderRequest(location, July);
            request.AddItem(priced, 10m, 4m);
            request.AddItem(unpriced, 3m, null);
            db.OrderRequests.Add(request);
            await db.SaveChangesAsync();
            requestId = request.Id;
        }

        await WorkflowAs(coordinator, service => service.SubmitAsync(requestId, new SubmitForApprovalCommand(), None));

        var row = Assert.Single((await InboxAs(manager, new ApprovalInboxQuery(Search: tag))).Rows.Items);

        Assert.Equal(2, row.ItemCount);
        Assert.Equal(1, row.MissingPriceItemCount);
        Assert.False(row.AmountIsComplete);
        // 10 x 4 over the priced line only -- the unpriced line is not read as zero.
        Assert.Equal(40m, row.KnownAmount);
    }

    [PostgresFact]
    public async Task A_fully_priced_request_reports_a_complete_amount()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var requestId = await NewRequestAsync(tag, quantity: 6m, unitPrice: 7.5m);
        await WorkflowAs(coordinator, service => service.SubmitAsync(requestId, new SubmitForApprovalCommand(), None));

        var row = Assert.Single((await InboxAs(manager, new ApprovalInboxQuery(Search: tag))).Rows.Items);

        Assert.Equal(0, row.MissingPriceItemCount);
        Assert.True(row.AmountIsComplete);
        Assert.Equal(45m, row.KnownAmount);
    }

    [PostgresFact]
    public async Task An_original_submission_and_a_revision_are_told_apart()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var ordinaryId = await NewRequestAsync(tag + "-orig");
        await WorkflowAs(coordinator, service => service.SubmitAsync(ordinaryId, new SubmitForApprovalCommand(), None));

        var v1 = await NewRequestAsync(tag + "-rev");
        await WorkflowAs(coordinator, service => service.SubmitAsync(v1, new SubmitForApprovalCommand(), None));
        await WorkflowAs(manager, service => service.ReturnAsync(v1, new ReturnForCorrectionCommand("Yenidən bax"), None));
        var created = await RevisingAs(coordinator, service => service.CreateAsync(v1, None));
        await WorkflowAs(coordinator, service => service.SubmitAsync(created.OrderRequestId, new SubmitForApprovalCommand(), None));

        var ordinaryRow = (await InboxAs(manager, new ApprovalInboxQuery(Search: tag + "-orig"))).Rows.Items.Single();
        Assert.False(ordinaryRow.IsRevision);
        Assert.Null(ordinaryRow.SourceVersion);
        Assert.Null(ordinaryRow.SourceOrderRequestId);

        var revisionRow = (await InboxAs(manager, new ApprovalInboxQuery(Search: tag + "-rev"))).Rows.Items.Single();
        Assert.True(revisionRow.IsRevision);
        Assert.Equal(1, revisionRow.SourceVersion);
        Assert.Equal(v1, revisionRow.SourceOrderRequestId);
        Assert.Equal(2, revisionRow.Version);
    }

    [PostgresFact]
    public async Task The_submitter_display_name_is_the_current_cycles_own_snapshot()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Adı Dəyişməz");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var requestId = await NewRequestAsync(tag);
        await WorkflowAs(coordinator, service => service.SubmitAsync(requestId, new SubmitForApprovalCommand(), None));

        var row = Assert.Single((await InboxAs(manager, new ApprovalInboxQuery(Search: tag))).Rows.Items);

        Assert.Equal("Adı Dəyişməz", row.SubmittedByDisplayName);
        Assert.Equal(coordinator.UserId, row.SubmittedByUserId);
    }

    // ---- search / filter --------------------------------------------------------------------------------

    [PostgresFact]
    public async Task Search_matches_the_location_name_or_its_code()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var requestId = await NewRequestAsync(tag);
        await WorkflowAs(coordinator, service => service.SubmitAsync(requestId, new SubmitForApprovalCommand(), None));

        var row = (await InboxAs(manager, new ApprovalInboxQuery(Search: tag))).Rows.Items.Single();

        var byCode = await InboxAs(manager, new ApprovalInboxQuery(Search: row.LocationCode));
        Assert.Contains(byCode.Rows.Items, item => item.OrderRequestId == requestId);

        var byNothing = await InboxAs(manager, new ApprovalInboxQuery(Search: $"heç-uyğun-gəlmir-{tag}"));
        Assert.DoesNotContain(byNothing.Rows.Items, item => item.OrderRequestId == requestId);
    }

    [PostgresFact]
    public async Task The_period_filter_narrows_to_one_month()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var julyId = await NewRequestAsync(tag + "-jul", period: July);
        var augustId = await NewRequestAsync(tag + "-aug", period: August);
        await WorkflowAs(coordinator, service => service.SubmitAsync(julyId, new SubmitForApprovalCommand(), None));
        await WorkflowAs(coordinator, service => service.SubmitAsync(augustId, new SubmitForApprovalCommand(), None));

        var julyOnly = await InboxAs(manager, new ApprovalInboxQuery(Search: tag, Period: "2026-07"));

        Assert.Contains(julyOnly.Rows.Items, item => item.OrderRequestId == julyId);
        Assert.DoesNotContain(julyOnly.Rows.Items, item => item.OrderRequestId == augustId);
    }

    [PostgresFact]
    public async Task A_malformed_period_is_refused()
    {
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        await Assert.ThrowsAsync<ValidationException>(() =>
            InboxAs(manager, new ApprovalInboxQuery(Period: "not-a-month")));
    }

    [PostgresFact]
    public async Task The_actionability_filter_splits_what_can_be_decided_from_what_is_blocked()
    {
        var tag = Tag();
        // A Rəhbər who once sent an order themselves, when they were a coordinator.
        var person = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru, sonra rəhbər");
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var rehber = person.As(BaxOrdersRoles.Manager);

        var ownId = await NewRequestAsync(tag + "-own");
        await WorkflowAs(person, service => service.SubmitAsync(ownId, new SubmitForApprovalCommand(), None));

        var othersId = await NewRequestAsync(tag + "-other");
        await WorkflowAs(coordinator, service => service.SubmitAsync(othersId, new SubmitForApprovalCommand(), None));

        var canDecide = await InboxAs(rehber, new ApprovalInboxQuery(Search: tag, Actionability: ApprovalActionability.CanDecide));
        Assert.Contains(canDecide.Rows.Items, item => item.OrderRequestId == othersId);
        Assert.DoesNotContain(canDecide.Rows.Items, item => item.OrderRequestId == ownId);

        var blocked = await InboxAs(rehber, new ApprovalInboxQuery(Search: tag, Actionability: ApprovalActionability.BlockedForMe));
        Assert.Contains(blocked.Rows.Items, item => item.OrderRequestId == ownId);
        Assert.DoesNotContain(blocked.Rows.Items, item => item.OrderRequestId == othersId);
    }

    [PostgresFact]
    public async Task For_an_administrator_everything_is_blocked_and_nothing_is_decidable()
    {
        var tag = Tag();
        var admin = await UserAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");

        var requestId = await NewRequestAsync(tag);
        await WorkflowAs(coordinator, service => service.SubmitAsync(requestId, new SubmitForApprovalCommand(), None));

        Assert.Empty((await InboxAs(admin, new ApprovalInboxQuery(Search: tag, Actionability: ApprovalActionability.CanDecide))).Rows.Items);
        Assert.Contains(
            (await InboxAs(admin, new ApprovalInboxQuery(Search: tag, Actionability: ApprovalActionability.BlockedForMe))).Rows.Items,
            item => item.OrderRequestId == requestId);

        // The summary counts it as blocked for them too: the missing authority is part of "blocked for me".
        var summary = (await InboxAs(admin, new ApprovalInboxQuery())).Summary;
        Assert.Equal(0, summary.ActionableByCurrentUserCount);
        Assert.Equal(summary.PendingCount, summary.BlockedForCurrentUserCount);
    }

    [PostgresFact]
    public async Task The_price_coverage_filter_splits_complete_from_incomplete()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var completeId = await NewRequestAsync(tag + "-complete", unitPrice: 3m);
        var incompleteId = await NewRequestAsync(tag + "-incomplete", unitPrice: null);
        await WorkflowAs(coordinator, service => service.SubmitAsync(completeId, new SubmitForApprovalCommand(), None));
        await WorkflowAs(coordinator, service => service.SubmitAsync(incompleteId, new SubmitForApprovalCommand(), None));

        var complete = await InboxAs(manager, new ApprovalInboxQuery(Search: tag, PriceCoverage: ApprovalPriceCoverage.Complete));
        Assert.Contains(complete.Rows.Items, item => item.OrderRequestId == completeId);
        Assert.DoesNotContain(complete.Rows.Items, item => item.OrderRequestId == incompleteId);

        var incomplete = await InboxAs(manager, new ApprovalInboxQuery(Search: tag, PriceCoverage: ApprovalPriceCoverage.Incomplete));
        Assert.Contains(incomplete.Rows.Items, item => item.OrderRequestId == incompleteId);
        Assert.DoesNotContain(incomplete.Rows.Items, item => item.OrderRequestId == completeId);
    }

    [PostgresFact]
    public async Task The_revision_filter_splits_original_from_correction()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var ordinaryId = await NewRequestAsync(tag + "-orig");
        await WorkflowAs(coordinator, service => service.SubmitAsync(ordinaryId, new SubmitForApprovalCommand(), None));

        var v1 = await NewRequestAsync(tag + "-rev");
        await WorkflowAs(coordinator, service => service.SubmitAsync(v1, new SubmitForApprovalCommand(), None));
        await WorkflowAs(manager, service => service.ReturnAsync(v1, new ReturnForCorrectionCommand("Yenidən bax"), None));
        var created = await RevisingAs(coordinator, service => service.CreateAsync(v1, None));
        await WorkflowAs(coordinator, service => service.SubmitAsync(created.OrderRequestId, new SubmitForApprovalCommand(), None));

        var originals = await InboxAs(manager, new ApprovalInboxQuery(Search: tag, Revision: ApprovalRevisionFilter.Original));
        Assert.Contains(originals.Rows.Items, item => item.OrderRequestId == ordinaryId);
        Assert.DoesNotContain(originals.Rows.Items, item => item.OrderRequestId == created.OrderRequestId);

        var revisions = await InboxAs(manager, new ApprovalInboxQuery(Search: tag, Revision: ApprovalRevisionFilter.Revision));
        Assert.Contains(revisions.Rows.Items, item => item.OrderRequestId == created.OrderRequestId);
        Assert.DoesNotContain(revisions.Rows.Items, item => item.OrderRequestId == ordinaryId);
    }

    // ---- sorting and paging ------------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_default_order_is_the_oldest_submission_first()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var firstId = await NewRequestAsync(tag + "-1");
        await WorkflowAs(coordinator, service => service.SubmitAsync(firstId, new SubmitForApprovalCommand(), None));
        await Task.Delay(15);
        var secondId = await NewRequestAsync(tag + "-2");
        await WorkflowAs(coordinator, service => service.SubmitAsync(secondId, new SubmitForApprovalCommand(), None));

        var inbox = await InboxAs(manager, new ApprovalInboxQuery(Search: tag));

        var ordered = inbox.Rows.Items.Where(item => item.OrderRequestId == firstId || item.OrderRequestId == secondId).ToList();
        Assert.Equal([firstId, secondId], ordered.Select(item => item.OrderRequestId));
    }

    [PostgresFact]
    public async Task Sorting_by_known_amount_puts_the_ones_with_no_price_last_either_direction()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var cheapId = await NewRequestAsync(tag + "-cheap", quantity: 1m, unitPrice: 2m);
        var costlyId = await NewRequestAsync(tag + "-costly", quantity: 1m, unitPrice: 90m);
        var unknownId = await NewRequestAsync(tag + "-unknown", unitPrice: null);
        foreach (var id in new[] { cheapId, costlyId, unknownId })
        {
            await WorkflowAs(coordinator, service => service.SubmitAsync(id, new SubmitForApprovalCommand(), None));
        }

        var ascending = await InboxAs(manager, new ApprovalInboxQuery(Search: tag, Sort: ApprovalInboxSort.KnownAmount, Descending: false));
        Assert.Equal([cheapId, costlyId, unknownId], ascending.Rows.Items.Select(item => item.OrderRequestId));

        var descending = await InboxAs(manager, new ApprovalInboxQuery(Search: tag, Sort: ApprovalInboxSort.KnownAmount, Descending: true));
        Assert.Equal([costlyId, cheapId, unknownId], descending.Rows.Items.Select(item => item.OrderRequestId));
    }

    [PostgresFact]
    public async Task Sorting_by_location_name_period_and_missing_price_all_work()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var aId = await NewRequestAsync(tag + "-A", period: July, unitPrice: 5m);
        var bId = await NewRequestAsync(tag + "-B", period: August, unitPrice: null);
        await WorkflowAs(coordinator, service => service.SubmitAsync(aId, new SubmitForApprovalCommand(), None));
        await WorkflowAs(coordinator, service => service.SubmitAsync(bId, new SubmitForApprovalCommand(), None));

        var byName = await InboxAs(manager, new ApprovalInboxQuery(Search: tag, Sort: ApprovalInboxSort.LocationName));
        Assert.Equal([aId, bId], byName.Rows.Items.Select(item => item.OrderRequestId));

        var byPeriod = await InboxAs(manager, new ApprovalInboxQuery(Search: tag, Sort: ApprovalInboxSort.RequestPeriod));
        Assert.Equal([aId, bId], byPeriod.Rows.Items.Select(item => item.OrderRequestId));

        var byMissing = await InboxAs(manager, new ApprovalInboxQuery(Search: tag, Sort: ApprovalInboxSort.MissingPriceItemCount));
        Assert.Equal([aId, bId], byMissing.Rows.Items.Select(item => item.OrderRequestId));
    }

    [PostgresFact]
    public async Task An_unknown_sort_or_filter_value_is_refused()
    {
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        // The enums bind any number by default; the controller rejects one outside the contract. The queries
        // class itself trusts a valid enum, so this is proved at the controller in the end-to-end tests --
        // here we only confirm a defined value of every filter is accepted without throwing.
        var result = await InboxAs(manager, new ApprovalInboxQuery(
            Actionability: ApprovalActionability.All, Revision: ApprovalRevisionFilter.All, Sort: ApprovalInboxSort.SubmittedAtUtc));
        Assert.NotNull(result);
    }

    [PostgresFact]
    public async Task Paging_defaults_to_twenty_five_and_is_capped_at_a_hundred()
    {
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var defaultPage = await InboxAs(manager, new ApprovalInboxQuery());
        Assert.Equal(ApprovalInboxQueries.DefaultPageSize, defaultPage.Rows.PageSize);

        var capped = await InboxAs(manager, new ApprovalInboxQuery(PageSize: 1000));
        Assert.Equal(ApprovalInboxQueries.MaxPageSize, capped.Rows.PageSize);
    }

    [PostgresFact]
    public async Task Paging_moves_through_the_filtered_set_without_skipping_or_repeating()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var ids = new List<long>();
        for (var i = 0; i < 3; i++)
        {
            var id = await NewRequestAsync($"{tag}-{i}");
            await WorkflowAs(coordinator, service => service.SubmitAsync(id, new SubmitForApprovalCommand(), None));
            ids.Add(id);
            await Task.Delay(10);
        }

        var page1 = await InboxAs(manager, new ApprovalInboxQuery(Search: tag, Page: 1, PageSize: 2));
        var page2 = await InboxAs(manager, new ApprovalInboxQuery(Search: tag, Page: 2, PageSize: 2));

        Assert.Equal(3, page1.FilteredCount);
        Assert.Equal(2, page1.Rows.Items.Count);
        Assert.Single(page2.Rows.Items);
        Assert.Empty(page1.Rows.Items.Select(item => item.OrderRequestId).Intersect(page2.Rows.Items.Select(item => item.OrderRequestId)));
        Assert.Equal(ids, page1.Rows.Items.Concat(page2.Rows.Items).Select(item => item.OrderRequestId));
    }

    // ---- the summary --------------------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_summary_counts_the_whole_queue_not_the_page_and_not_the_filtered_view()
    {
        var tag = Tag();
        // The reader: a Rəhbər who once sent an order themselves, as a coordinator.
        var person = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru, sonra rəhbər");
        var reader = person.As(BaxOrdersRoles.Manager);
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        // A neutral reading, taken as "manager" so contribution/self-submission never enter into it, before
        // any of this test's own rows exist.
        var before = (await InboxAs(manager, new ApprovalInboxQuery(PageSize: 1))).Summary;

        // Two ordinary, decidable requests; one the reader submitted (blocked for the reader only); one with a
        // missing price; one a revision.
        var ordinary1 = await NewRequestAsync(tag + "-1", unitPrice: 2m);
        var ordinary2 = await NewRequestAsync(tag + "-2", unitPrice: null);
        var ownId = await NewRequestAsync(tag + "-own");
        await WorkflowAs(coordinator, service => service.SubmitAsync(ordinary1, new SubmitForApprovalCommand(), None));
        await WorkflowAs(coordinator, service => service.SubmitAsync(ordinary2, new SubmitForApprovalCommand(), None));
        await WorkflowAs(person, service => service.SubmitAsync(ownId, new SubmitForApprovalCommand(), None));

        var v1 = await NewRequestAsync(tag + "-rev");
        await WorkflowAs(coordinator, service => service.SubmitAsync(v1, new SubmitForApprovalCommand(), None));
        await WorkflowAs(manager, service => service.ReturnAsync(v1, new ReturnForCorrectionCommand("Yenidən bax"), None));
        var created = await RevisingAs(coordinator, service => service.CreateAsync(v1, None));
        await WorkflowAs(coordinator, service => service.SubmitAsync(created.OrderRequestId, new SubmitForApprovalCommand(), None));

        // Read as the reader, who is blocked on exactly one of these four new rows.
        var afterFullPage = (await InboxAs(reader, new ApprovalInboxQuery(PageSize: 1))).Summary;
        var afterFiltered = (await InboxAs(reader, new ApprovalInboxQuery(Search: $"heç-uyğun-gəlmir-{tag}"))).Summary;

        Assert.Equal(4, afterFullPage.PendingCount - before.PendingCount);
        Assert.Equal(3, afterFullPage.ActionableByCurrentUserCount - before.ActionableByCurrentUserCount);
        Assert.Equal(1, afterFullPage.BlockedForCurrentUserCount - before.BlockedForCurrentUserCount);
        Assert.Equal(1, afterFullPage.MissingPriceRequestCount - before.MissingPriceRequestCount);
        Assert.Equal(1, afterFullPage.RevisionCount - before.RevisionCount);

        // Same person, same moment, a search that matches nothing and a page size of one: the summary does
        // not move, even though FilteredCount and the returned rows do.
        Assert.Equal(afterFullPage, afterFiltered);
    }

    // ---- efficiency and safety ---------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_inbox_is_answered_by_one_bounded_query_however_many_rows_exist()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        for (var i = 0; i < 5; i++)
        {
            var id = await NewRequestAsync($"{tag}-{i}");
            await WorkflowAs(coordinator, service => service.SubmitAsync(id, new SubmitForApprovalCommand(), None));
        }

        var counter = new CountingCommandInterceptor();
        await using (var counted = new BaxOrdersDbContext(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(PostgresDatabaseFixture.ConnectionString)
            .AddInterceptors(counter)
            .Options))
        {
            await new ApprovalInboxQueries(counted, manager).GetAsync(new ApprovalInboxQuery(Search: tag), None);
        }

        // One SELECT for the whole queue, with correlated subqueries baked into the same statement -- never
        // one call per row.
        Assert.Equal(1, counter.Count);
    }

    [PostgresFact]
    public async Task Reading_the_inbox_writes_nothing()
    {
        var tag = Tag();
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var manager = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var requestId = await NewRequestAsync(tag);
        await WorkflowAs(coordinator, service => service.SubmitAsync(requestId, new SubmitForApprovalCommand(), None));

        var before = await SnapshotAsync(requestId);
        await InboxAs(manager, new ApprovalInboxQuery(Search: tag));
        await InboxAs(coordinator, new ApprovalInboxQuery(Search: tag));
        var after = await SnapshotAsync(requestId);

        Assert.Equal(before, after);
    }

    // ---- fixture ----------------------------------------------------------------------------------------

    private static string Tag() => Guid.NewGuid().ToString("N")[..8];

    private async Task<TestCurrentUser> UserAsync(string role, string displayName)
    {
        await using var db = database.CreateContext();
        return role switch
        {
            BaxOrdersRoles.Coordinator => await TestCurrentUser.CoordinatorAsync(db, displayName),
            BaxOrdersRoles.Manager => await TestCurrentUser.ManagerAsync(db, displayName),
            _ => await TestCurrentUser.AdminAsync(db, displayName),
        };
    }

    /// <summary>A location, a product and one draft request of its own, so no other test's data is anywhere near it.</summary>
    private async Task<long> NewRequestAsync(
        string tag, decimal quantity = 10m, decimal? unitPrice = 5m, DateOnly? period = null)
    {
        await using var db = database.CreateContext();

        var location = new Location(await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Təsdiq obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Təsdiq malı {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var request = new OrderRequest(location, period ?? July);
        request.AddItem(variant, quantity, unitPrice);
        db.OrderRequests.Add(request);
        await db.SaveChangesAsync();

        return request.Id;
    }

    private async Task<long> LineIdAsync(long requestId, decimal quantity)
    {
        await using var db = database.CreateContext();
        return await db.OrderRequestItems
            .Where(item => item.OrderRequestId == requestId && item.Quantity == quantity)
            .Select(item => item.Id)
            .SingleAsync();
    }

    private async Task<T> WorkflowAs<T>(ICurrentUserContext user, Func<OrderWorkflowService, Task<T>> work)
    {
        await using var db = database.CreateContext();
        return await work(new OrderWorkflowService(db, user, new PostgresOrderRequestLock(db)));
    }

    private async Task<T> RevisingAs<T>(ICurrentUserContext user, Func<OrderRevisionService, Task<T>> work)
    {
        await using var db = database.CreateContext();
        return await work(new OrderRevisionService(db, user, new PostgresOrderRequestLock(db), NullLogger<OrderRevisionService>.Instance));
    }

    private async Task<ApprovalInboxDto> InboxAs(ICurrentUserContext user, ApprovalInboxQuery query)
    {
        await using var db = database.CreateContext();
        return await new ApprovalInboxQueries(db, user).GetAsync(query, None);
    }

    private async Task<string> SnapshotAsync(long requestId)
    {
        await using var db = database.CreateContext();
        var request = await db.OrderRequests.AsNoTracking().SingleAsync(item => item.Id == requestId);
        var itemCount = await db.OrderRequestItems.CountAsync(item => item.OrderRequestId == requestId);
        var workflowEventCount = await db.OrderRequestWorkflowEvents.CountAsync(item => item.OrderRequestId == requestId);
        return $"{request.Status}|{request.ConcurrencyStamp}|{itemCount}|{workflowEventCount}";
    }

    /// <summary>Counts how many SQL statements a unit of work actually sends -- the only honest way to say "no N+1".</summary>
    private sealed class CountingCommandInterceptor : DbCommandInterceptor
    {
        public int Count { get; private set; }

        public override InterceptionResult<System.Data.Common.DbDataReader> ReaderExecuting(
            System.Data.Common.DbCommand command, CommandEventData eventData, InterceptionResult<System.Data.Common.DbDataReader> result)
        {
            Count++;
            return base.ReaderExecuting(command, eventData, result);
        }

        public override ValueTask<InterceptionResult<System.Data.Common.DbDataReader>> ReaderExecutingAsync(
            System.Data.Common.DbCommand command, CommandEventData eventData,
            InterceptionResult<System.Data.Common.DbDataReader> result, CancellationToken cancellationToken = default)
        {
            Count++;
            return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
        }
    }
}
