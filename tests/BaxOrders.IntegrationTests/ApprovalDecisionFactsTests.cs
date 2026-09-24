using BaxOrders.Application.Abstractions;
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
/// Task 04a against a real PostgreSQL: approval authority belongs to the Rəhbər role alone, the service refuses
/// anybody else on its own, and the decision panel's facts — who sent it, which time, the last correction
/// request, who decided — come out of the recorded events along the correction chain.
/// </summary>
/// <remarks>
/// Every request here is synthetic and made by the test. No company request is submitted, approved or
/// returned, and nothing touches a real user or role.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ApprovalDecisionFactsTests(PostgresDatabaseFixture database)
{
    private static readonly CancellationToken None = CancellationToken.None;

    // ---- who may decide --------------------------------------------------------------------------------

    [PostgresFact]
    public async Task The_service_refuses_an_administrator_whatever_called_it_and_writes_nothing()
    {
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var admin = await UserAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        var request = await NewRequestAsync();
        await WorkflowAs(coordinator, service => service.SubmitAsync(request, new SubmitForApprovalCommand(), None));

        // Called directly, with no endpoint policy in front of it: the service asks the same question itself.
        await Assert.ThrowsAsync<ForbiddenException>(() => WorkflowAs(admin, service =>
            service.ApproveAsync(request, new ApproveOrderCommand(), None)));
        await Assert.ThrowsAsync<ForbiddenException>(() => WorkflowAs(admin, service =>
            service.ReturnAsync(request, new ReturnForCorrectionCommand("Yenidən bax"), None)));

        // A coordinator is refused the same way.
        await Assert.ThrowsAsync<ForbiddenException>(() => WorkflowAs(coordinator, service =>
            service.ApproveAsync(request, new ApproveOrderCommand(), None)));

        await using var check = database.CreateContext();
        Assert.Equal(OrderRequestStatus.PendingApproval, (await check.OrderRequests.SingleAsync(item => item.Id == request)).Status);
        Assert.Equal(OrderWorkflowAction.SubmittedForApproval,
            Assert.Single(await check.OrderRequestWorkflowEvents.Where(item => item.OrderRequestId == request).ToListAsync()).Action);
    }

    [PostgresFact]
    public async Task A_rehber_approves_and_asks_for_a_correction()
    {
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var rehber = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var approved = await NewRequestAsync();
        await WorkflowAs(coordinator, service => service.SubmitAsync(approved, new SubmitForApprovalCommand(), None));
        Assert.Equal(OrderRequestStatus.Approved,
            (await WorkflowAs(rehber, service => service.ApproveAsync(approved, new ApproveOrderCommand(), None))).Status);

        var returned = await NewRequestAsync();
        await WorkflowAs(coordinator, service => service.SubmitAsync(returned, new SubmitForApprovalCommand(), None));
        Assert.Equal(OrderRequestStatus.ReturnedForCorrection,
            (await WorkflowAs(rehber, service => service.ReturnAsync(returned, new ReturnForCorrectionCommand("Miqdar çoxdur"), None))).Status);
    }

    // ---- the facts, step by step -----------------------------------------------------------------------

    [PostgresFact]
    public async Task The_whole_cycle_submit_return_correct_resubmit_approve_reads_right_at_every_step()
    {
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var rehber = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        var v1 = await NewRequestAsync();

        // A draft nobody has sent.
        var draft = (await WorkflowAs(coordinator, service => service.GetAsync(v1, None)))!.DecisionFacts;
        Assert.Equal(new WorkflowDecisionFactsDto(false, 0, null, null, null, null), draft);

        // 1. Sent for the first time.
        var sent = await WorkflowAs(coordinator, service => service.SubmitAsync(v1, new SubmitForApprovalCommand(), None));
        Assert.Equal(1, sent.DecisionFacts.SubmissionNumber);
        Assert.Equal("Sınaq koordinatoru", sent.DecisionFacts.SubmittedByDisplayName);
        // The moment is the recorded event's, as stored — never a separate clock reading.
        Assert.Equal(sent.History.Single().OccurredAtUtc, sent.DecisionFacts.SubmittedAtUtc);
        Assert.Null(sent.DecisionFacts.PreviousReturn);
        Assert.Null(sent.DecisionFacts.Decision);

        // 2. A correction is asked for, with a reason.
        var returned = await WorkflowAs(rehber, service =>
            service.ReturnAsync(v1, new ReturnForCorrectionCommand("Zibil paketi sayı çoxdur"), None));
        var returnDecision = returned.DecisionFacts.Decision!;
        Assert.Equal(OrderWorkflowAction.ReturnedForCorrection, returnDecision.Action);
        Assert.Equal(("Sınaq rəhbəri", "Zibil paketi sayı çoxdur"), (returnDecision.ActorDisplayName, returnDecision.Reason));
        Assert.Equal(returned.History.Last().OccurredAtUtc, returnDecision.OccurredAtUtc);
        Assert.Equal(1, returned.DecisionFacts.SubmissionNumber);
        Assert.Null(returned.DecisionFacts.PreviousReturn);

        // 3. The coordinator makes the correction version: not sent yet, answering that request.
        var v2 = (await RevisingAs(coordinator, service => service.CreateAsync(v1, None))).OrderRequestId;
        var corrected = (await WorkflowAs(coordinator, service => service.GetAsync(v2, None)))!.DecisionFacts;
        Assert.Equal(0, corrected.SubmissionNumber);
        Assert.Null(corrected.SubmittedByDisplayName);
        Assert.Equal("Zibil paketi sayı çoxdur", corrected.PreviousReturn!.Reason);

        // 4. Sent again: the second time, after the Rəhbər's request, with their name and the moment.
        var resent = await WorkflowAs(coordinator, service => service.SubmitAsync(v2, new SubmitForApprovalCommand(), None));
        var rehbersView = (await WorkflowAs(rehber, service => service.GetAsync(v2, None)))!.DecisionFacts;
        Assert.Equal(resent.DecisionFacts, rehbersView);
        Assert.Equal(2, rehbersView.SubmissionNumber);
        Assert.Equal("Sınaq koordinatoru", rehbersView.SubmittedByDisplayName);
        Assert.Equal(resent.History.Last().OccurredAtUtc, rehbersView.SubmittedAtUtc);
        Assert.Equal(returnDecision, rehbersView.PreviousReturn);
        Assert.Null(rehbersView.Decision);

        // 5. Approved: who approved and when, with the submission facts still there.
        var approved = await WorkflowAs(rehber, service => service.ApproveAsync(v2, new ApproveOrderCommand(), None));
        var approval = approved.DecisionFacts.Decision!;
        Assert.Equal(OrderWorkflowAction.Approved, approval.Action);
        Assert.Equal("Sınaq rəhbəri", approval.ActorDisplayName);
        Assert.Equal(approved.History.Last().OccurredAtUtc, approval.OccurredAtUtc);
        Assert.Null(approval.Reason);
        Assert.Equal(2, approved.DecisionFacts.SubmissionNumber);
        Assert.Equal(returnDecision, approved.DecisionFacts.PreviousReturn);

        // The returned version itself still tells its own story, unchanged by what came after it.
        var original = (await WorkflowAs(rehber, service => service.GetAsync(v1, None)))!.DecisionFacts;
        Assert.Equal(returned.DecisionFacts, original);
    }

    [PostgresFact]
    public async Task Sent_back_unchanged_after_a_correction_request_is_the_second_submission()
    {
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var rehber = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        var request = await NewRequestAsync();

        await WorkflowAs(coordinator, service => service.SubmitAsync(request, new SubmitForApprovalCommand(), None));
        await WorkflowAs(rehber, service => service.ReturnAsync(request, new ReturnForCorrectionCommand("Bir daha bax"), None));
        var again = await WorkflowAs(coordinator, service => service.SubmitAsync(request, new SubmitForApprovalCommand(), None));

        Assert.Equal(2, again.DecisionFacts.SubmissionNumber);
        Assert.Equal("Bir daha bax", again.DecisionFacts.PreviousReturn!.Reason);
    }

    [PostgresFact]
    public async Task A_new_version_made_by_another_import_is_not_a_correction_and_starts_at_one()
    {
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var rehber = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        var v1 = await NewRequestAsync();

        await WorkflowAs(coordinator, service => service.SubmitAsync(v1, new SubmitForApprovalCommand(), None));
        await WorkflowAs(rehber, service => service.ReturnAsync(v1, new ReturnForCorrectionCommand("Yenidən bax"), None));

        // The next version of the same month, made the way an import makes one: no revision link.
        long v2;
        await using (var db = database.CreateContext())
        {
            var source = await db.OrderRequests.Include(item => item.Location).SingleAsync(item => item.Id == v1);
            var variant = await db.OrderRequestItems.Where(item => item.OrderRequestId == v1).Select(item => item.ProductVariant).FirstAsync();
            var next = source.CreateNextVersion();
            next.AddItem(variant, 4m, 2m);
            db.OrderRequests.Add(next);
            await db.SaveChangesAsync();
            v2 = next.Id;
        }

        var sent = await WorkflowAs(coordinator, service => service.SubmitAsync(v2, new SubmitForApprovalCommand(), None));

        Assert.Equal(1, sent.DecisionFacts.SubmissionNumber);
        Assert.Null(sent.DecisionFacts.PreviousReturn);
    }

    [PostgresFact]
    public async Task Reading_the_facts_costs_the_same_number_of_queries_however_long_the_chain()
    {
        var coordinator = await UserAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        var rehber = await UserAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");

        var v1 = await NewRequestAsync();
        await WorkflowAs(coordinator, service => service.SubmitAsync(v1, new SubmitForApprovalCommand(), None));
        await WorkflowAs(rehber, service => service.ReturnAsync(v1, new ReturnForCorrectionCommand("Birinci"), None));
        var v2 = (await RevisingAs(coordinator, service => service.CreateAsync(v1, None))).OrderRequestId;
        await WorkflowAs(coordinator, service => service.SubmitAsync(v2, new SubmitForApprovalCommand(), None));
        await WorkflowAs(rehber, service => service.ReturnAsync(v2, new ReturnForCorrectionCommand("İkinci"), None));
        var v3 = (await RevisingAs(coordinator, service => service.CreateAsync(v2, None))).OrderRequestId;
        await WorkflowAs(coordinator, service => service.SubmitAsync(v3, new SubmitForApprovalCommand(), None));

        var (secondFacts, secondQueries) = await CountedReadAsync(rehber, v2);
        var (thirdFacts, thirdQueries) = await CountedReadAsync(rehber, v3);

        Assert.Equal((3, "İkinci"), (thirdFacts.SubmissionNumber, thirdFacts.PreviousReturn!.Reason));
        Assert.Equal(2, secondFacts.SubmissionNumber);
        // One more version behind it is not one more query.
        Assert.Equal(secondQueries, thirdQueries);
    }

    // ---- fixture ----------------------------------------------------------------------------------------

    private async Task<(WorkflowDecisionFactsDto Facts, int Queries)> CountedReadAsync(ICurrentUserContext user, long request)
    {
        var counter = new CountingCommandInterceptor();
        await using var counted = new BaxOrdersDbContext(new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseNpgsql(PostgresDatabaseFixture.ConnectionString)
            .AddInterceptors(counter)
            .Options);

        var facts = (await new OrderWorkflowService(counted, user, new PostgresOrderRequestLock(counted)).GetAsync(request, None))!.DecisionFacts;
        return (facts, counter.Count);
    }

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
    private async Task<long> NewRequestAsync()
    {
        await using var db = database.CreateContext();
        var tag = Guid.NewGuid().ToString("N")[..8];

        var location = new Location(await new PostgresLocationCodeGenerator(db).NextAsync(None), $"Qərar obyekti {tag}");
        db.Locations.Add(location);
        await db.SaveChangesAsync();

        var pieces = await db.UnitsOfMeasure.SingleAsync(unit => unit.Code == "PCS");
        var product = new Product(await new PostgresProductCodeGenerator(db).NextAsync(None), $"Qərar malı {tag}");
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var variant = product.AddVariant(null, null, null, pieces);
        await db.SaveChangesAsync();

        var request = new OrderRequest(location, new DateOnly(2026, 7, 1));
        request.AddItem(variant, 10m, 5m);
        db.OrderRequests.Add(request);
        await db.SaveChangesAsync();

        return request.Id;
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

    /// <summary>Counts the SQL statements a unit of work sends.</summary>
    private sealed class CountingCommandInterceptor : DbCommandInterceptor
    {
        public int Count { get; private set; }

        public override ValueTask<InterceptionResult<System.Data.Common.DbDataReader>> ReaderExecutingAsync(
            System.Data.Common.DbCommand command, CommandEventData eventData,
            InterceptionResult<System.Data.Common.DbDataReader> result, CancellationToken cancellationToken = default)
        {
            Count++;
            return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
        }
    }
}
