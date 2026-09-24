using System.Net;
using System.Net.Http.Json;
using System.Text.Encodings.Web;
using System.Text.Json;
using BaxOrders.Api.Controllers;
using BaxOrders.ApprovalSandbox;
using BaxOrders.Application.Approvals;
using BaxOrders.Application.Orders.Revisions;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain.Orders;
using BaxOrders.Infrastructure.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Xunit.Abstractions;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Task 4b: the brief's approval flow from start to finish, in the test environment, with the Rəhbər role —
/// sent, waiting in "Təsdiq gözləyənlər", returned with a reason, corrected and sent again, approved.
/// </summary>
/// <remarks>
/// The sandbox is made by the tool's own create logic and the real API is hosted against it in the Sandbox
/// environment. Three people sign in on three sessions, with real cookies and antiforgery tokens; nothing in
/// the pipeline is relaxed. At the end the tool drops the sandbox again.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ApprovalSandboxEndToEndTests(PostgresDatabaseFixture database, ITestOutputHelper output) : IAsyncLifetime
{
    private const string Password = AuthenticatedApi.Password;
    private const string Reason = "Zibil paketinin sayı keçən aydan çoxdur, yoxlayın.";

    private readonly SandboxTarget target = SandboxForTests.NewTarget();
    private WebApplicationFactory<Program>? factory;

    public Task InitializeAsync() => Task.CompletedTask;

    public async Task DisposeAsync()
    {
        if (factory is not null)
        {
            await factory.DisposeAsync();
        }

        await SandboxForTests.DropAsync(target);
    }

    [PostgresFact]
    public async Task The_brief_flow_runs_from_start_to_finish_in_the_sandbox_with_the_rehber_role()
    {
        // 1. The sandbox, by the tool's own create logic, and the real API against it in the Sandbox environment.
        var seeded = await SandboxLifecycle.CreateAsync(target, Password, CancellationToken.None);
        factory = SandboxForTests.Api(target);

        // 2. Three people, three sessions.
        using var rehber = await SignInAsync(SandboxScenario.Rehber);
        using var coordinator = await SignInAsync(SandboxScenario.Coordinator);
        using var admin = await SignInAsync(SandboxScenario.Admin);

        // 3. The Rəhbər opens "Təsdiq gözləyənlər": the test order is there, oldest submission first — and the
        //    screens are told this is the test environment.
        using (var anonymous = AuthenticatedApi.Anonymous(factory))
        {
            Assert.True((await anonymous.GetFromJsonAsync<EnvironmentDto>("/api/v1/environment", AuthenticatedApi.Json))!.IsSandbox);
        }

        var inbox = await InboxAsync(rehber);
        var waitingRow = Assert.Single(inbox.Rows.Items);
        Assert.Equal(seeded.TestOrderId, waitingRow.OrderRequestId);
        Assert.Equal(
            (SandboxScenario.Location1.Name, new DateOnly(2026, 9, 1), "Sınaq Koordinatoru", 5, 1, false),
            (waitingRow.LocationName, waitingRow.RequestPeriod, waitingRow.SubmittedByDisplayName,
             waitingRow.ItemCount, waitingRow.MissingPriceItemCount, waitingRow.IsRevision));
        Assert.True(waitingRow.CanApprove);
        Assert.Equal(
            inbox.Rows.Items.OrderBy(row => row.SubmittedAtUtc).Select(row => row.OrderRequestId),
            inbox.Rows.Items.Select(row => row.OrderRequestId));

        // 4. What the Rəhbər reads before deciding: the first submission, by whom and when.
        var waiting = await WorkflowAsync(rehber, seeded.TestOrderId);
        output.WriteLine($"Step 4 facts: {Describe(waiting.DecisionFacts)}");
        Assert.Equal(OrderRequestStatus.PendingApproval, waiting.Status);
        Assert.False(waiting.DecisionFacts.IsHistoricalImport);
        Assert.Equal(1, waiting.DecisionFacts.SubmissionNumber);
        Assert.Equal("Sınaq Koordinatoru", waiting.DecisionFacts.SubmittedByDisplayName);
        Assert.Equal(Assert.Single(waiting.History).OccurredAtUtc, waiting.DecisionFacts.SubmittedAtUtc);
        Assert.Null(waiting.DecisionFacts.PreviousReturn);
        Assert.Null(waiting.DecisionFacts.Decision);
        Assert.True(waiting.AllowedActions.CanApprove);

        // 5. The administrator can do neither, whatever they post, and nothing moves.
        await ExpectAsync(HttpStatusCode.Forbidden,
            AuthenticatedApi.PostAsync(admin, $"/api/v1/orders/{seeded.TestOrderId}/workflow/approve", new { acknowledgeMissingPrices = true }));
        await ExpectAsync(HttpStatusCode.Forbidden,
            AuthenticatedApi.PostAsync(admin, $"/api/v1/orders/{seeded.TestOrderId}/workflow/return", new { reason = Reason }));
        await AssertStandsAsync(seeded.TestOrderId, OrderRequestStatus.PendingApproval, events: 1);

        // 6. No reason, no correction request — refused, and no event written.
        await ExpectAsync(HttpStatusCode.UnprocessableEntity,
            AuthenticatedApi.PostAsync(rehber, $"/api/v1/orders/{seeded.TestOrderId}/workflow/return", new { reason = "" }));
        await ExpectAsync(HttpStatusCode.UnprocessableEntity,
            AuthenticatedApi.PostAsync(rehber, $"/api/v1/orders/{seeded.TestOrderId}/workflow/return", new { reason = "   " }));
        await AssertStandsAsync(seeded.TestOrderId, OrderRequestStatus.PendingApproval, events: 1);

        // 7. With a reason: returned, and the facts say who, when and why.
        var returned = await SendAsync(rehber, $"/api/v1/orders/{seeded.TestOrderId}/workflow/return", new { reason = Reason });
        output.WriteLine($"Step 7 facts: {Describe(returned.DecisionFacts)}");
        Assert.Equal(OrderRequestStatus.ReturnedForCorrection, returned.Status);
        var request = returned.DecisionFacts.Decision!;
        Assert.Equal(
            (OrderWorkflowAction.ReturnedForCorrection, "Sınaq Rəhbəri", Reason),
            (request.Action, request.ActorDisplayName, request.Reason));
        Assert.Equal(returned.History[^1].OccurredAtUtc, request.OccurredAtUtc);
        await AssertStandsAsync(seeded.TestOrderId, OrderRequestStatus.ReturnedForCorrection, events: 2);

        // 8. The coordinator makes the correction, changes one line and sends it again.
        var corrected = await CorrectAndResendAsync(coordinator, seeded.TestOrderId, newQuantity: 120m);

        // 9. The Rəhbər finds the correction in the queue: the second submission, after their own request.
        var correctionRow = Assert.Single((await InboxAsync(rehber)).Rows.Items);
        Assert.Equal(
            (corrected, true, (long?)seeded.TestOrderId, (int?)1, 2),
            (correctionRow.OrderRequestId, correctionRow.IsRevision, correctionRow.SourceOrderRequestId,
             correctionRow.SourceVersion, correctionRow.Version));

        var resent = await WorkflowAsync(rehber, corrected);
        output.WriteLine($"Step 9 facts: {Describe(resent.DecisionFacts)}");
        Assert.Equal(2, resent.DecisionFacts.SubmissionNumber);
        Assert.Equal("Sınaq Koordinatoru", resent.DecisionFacts.SubmittedByDisplayName);
        Assert.Equal(resent.History[^1].OccurredAtUtc, resent.DecisionFacts.SubmittedAtUtc);
        var previous = resent.DecisionFacts.PreviousReturn!;
        Assert.Equal((Reason, "Sınaq Rəhbəri", request.OccurredAtUtc), (previous.Reason, previous.ActorDisplayName, previous.OccurredAtUtc));
        Assert.Null(resent.DecisionFacts.Decision);

        // 10. Approving asks for the unpriced line to be acknowledged; acknowledged, it is approved, by whom and when.
        await ExpectAsync(HttpStatusCode.UnprocessableEntity,
            AuthenticatedApi.PostAsync(rehber, $"/api/v1/orders/{corrected}/workflow/approve", new { }));
        await AssertStandsAsync(corrected, OrderRequestStatus.PendingApproval, events: 1);

        var approved = await SendAsync(rehber, $"/api/v1/orders/{corrected}/workflow/approve", new { acknowledgeMissingPrices = true });
        output.WriteLine($"Step 10 facts: {Describe(approved.DecisionFacts)}");
        Assert.Equal(OrderRequestStatus.Approved, approved.Status);
        var approval = approved.DecisionFacts.Decision!;
        Assert.Equal((OrderWorkflowAction.Approved, "Sınaq Rəhbəri"), (approval.Action, approval.ActorDisplayName));
        Assert.Equal(approved.History[^1].OccurredAtUtc, approval.OccurredAtUtc);
        Assert.True(approved.History[^1].MissingPricesAcknowledged);
        Assert.Empty((await InboxAsync(rehber)).Rows.Items);

        // 11. "Sifariş göndərilir": the coordinator sends the seeded draft, and it reaches the Rəhbər's queue.
        var sent = await SendAsync(coordinator, $"/api/v1/orders/{seeded.DraftOrderId}/workflow/submit", new { });
        Assert.Equal(OrderRequestStatus.PendingApproval, sent.Status);
        var draftRow = Assert.Single((await InboxAsync(rehber)).Rows.Items);
        Assert.Equal(
            (seeded.DraftOrderId, SandboxScenario.Location2.Name, "Sınaq Koordinatoru"),
            (draftRow.OrderRequestId, draftRow.LocationName, draftRow.SubmittedByDisplayName));

        // 12. The historical order says it came from Excel, and names nobody and no date.
        var historical = await WorkflowAsync(rehber, seeded.HistoricalOrderId);
        output.WriteLine($"Step 12 facts: {Describe(historical.DecisionFacts)}");
        Assert.Equal(OrderRequestStatus.Approved, historical.Status);
        Assert.Null(historical.SubmittedAtUtc);
        Assert.Null(historical.ApprovedAtUtc);
        Assert.Equal(WorkflowDecisionFactsDto.HistoricalImport, historical.DecisionFacts);
        Assert.DoesNotContain("Sistem", JsonSerializer.Serialize(historical.DecisionFacts, AuthenticatedApi.Json), StringComparison.Ordinal);

        // 13. The tool drops the sandbox, and it is gone.
        await factory.DisposeAsync();
        factory = null;
        await SandboxLifecycle.DropAsync(target, CancellationToken.None);

        var gone = await Assert.ThrowsAsync<PostgresException>(async () =>
        {
            await using var connection = new NpgsqlConnection(SandboxForTests.ConnectionString(target));
            await connection.OpenAsync();
        });
        Assert.Equal(PostgresErrorCodes.InvalidCatalogName, gone.SqlState);
    }

    /// <summary>
    /// The sandbox writes nothing outside its own database: after a whole seed and flow, the database the rest
    /// of the suite shares has exactly the objects, orders and people it had before.
    /// </summary>
    [PostgresFact]
    public async Task A_whole_seed_and_flow_in_the_sandbox_changes_nothing_outside_it()
    {
        var before = await SharedAsync();

        var seeded = await SandboxLifecycle.CreateAsync(target, Password, CancellationToken.None);
        factory = SandboxForTests.Api(target);
        using var rehber = await SignInAsync(SandboxScenario.Rehber);
        using var coordinator = await SignInAsync(SandboxScenario.Coordinator);

        await SendAsync(rehber, $"/api/v1/orders/{seeded.TestOrderId}/workflow/return", new { reason = Reason });
        var corrected = await CorrectAndResendAsync(coordinator, seeded.TestOrderId, newQuantity: 120m);
        await SendAsync(rehber, $"/api/v1/orders/{corrected}/workflow/approve", new { acknowledgeMissingPrices = true });
        await SendAsync(coordinator, $"/api/v1/orders/{seeded.DraftOrderId}/workflow/submit", new { });

        await factory.DisposeAsync();
        factory = null;
        await SandboxLifecycle.DropAsync(target, CancellationToken.None);

        var after = await SharedAsync();
        output.WriteLine(
            $"Shared test database {new NpgsqlConnectionStringBuilder(PostgresDatabaseFixture.ConnectionString).Database}: "
            + $"locations {before.Locations.Count} → {after.Locations.Count}, order requests {before.Orders.Count} → {after.Orders.Count}, "
            + $"users {before.Users.Count} → {after.Users.Count}, roles {before.Roles.Count} → {after.Roles.Count}, "
            + $"products {before.Products.Count} → {after.Products.Count}, workflow events {before.WorkflowEvents} → {after.WorkflowEvents}");

        Assert.Equal(before.Locations, after.Locations);
        Assert.Equal(before.Orders, after.Orders);
        Assert.Equal(before.Users, after.Users);
        Assert.Equal(before.Roles, after.Roles);
        Assert.Equal(before.Products, after.Products);
        Assert.Equal(before.WorkflowEvents, after.WorkflowEvents);

        // And none of the sandbox's names ever reached it.
        await using var shared = database.CreateContext();
        Assert.False(await shared.Locations.AnyAsync(location => location.Code == SandboxScenario.Location1.Code || location.Code == SandboxScenario.Location2.Code));
        Assert.False(await shared.Set<ApplicationUser>().AnyAsync(user => user.UserName!.StartsWith("sinaq.")));
    }

    // ---- helpers --------------------------------------------------------------------------------------

    private sealed record Shared(
        List<int> Locations, List<long> Orders, List<Guid> Users, List<Guid> Roles, List<long> Products, int WorkflowEvents);

    private async Task<Shared> SharedAsync()
    {
        await using var db = database.CreateContext();
        return new Shared(
            await db.Locations.AsNoTracking().OrderBy(item => item.Id).Select(item => item.Id).ToListAsync(),
            await db.OrderRequests.AsNoTracking().OrderBy(item => item.Id).Select(item => item.Id).ToListAsync(),
            await db.Set<ApplicationUser>().AsNoTracking().OrderBy(item => item.Id).Select(item => item.Id).ToListAsync(),
            await db.Roles.AsNoTracking().OrderBy(item => item.Id).Select(item => item.Id).ToListAsync(),
            await db.Products.AsNoTracking().OrderBy(item => item.Id).Select(item => item.Id).ToListAsync(),
            await db.OrderRequestWorkflowEvents.CountAsync());
    }

    private async Task<HttpClient> SignInAsync(SandboxAccount account)
    {
        var client = AuthenticatedApi.Anonymous(factory!);
        var me = await AuthenticatedApi.SignInAsync(client, account.UserName, Password);
        Assert.Equal((account.DisplayName, account.Role), (me.DisplayName, me.Role));
        return client;
    }

    /// <summary>Makes the correction of a returned order, changes the first line's quantity and sends it again.</summary>
    /// <returns>The correction's id.</returns>
    private async Task<long> CorrectAndResendAsync(HttpClient coordinator, long returnedOrderId, decimal newQuantity)
    {
        var created = await AuthenticatedApi.PostAsync(coordinator, $"/api/v1/orders/{returnedOrderId}/revision", new { });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var correction = (await created.Content.ReadFromJsonAsync<CreateRevisionResultDto>(AuthenticatedApi.Json))!.OrderRequestId;

        long line;
        await using (var sandbox = SandboxForTests.Context(target))
        {
            line = await sandbox.OrderRequestItems.AsNoTracking()
                .Where(item => item.OrderRequestId == correction
                    && item.ProductVariant.Product.Name == SandboxScenario.Products[0].Name)
                .Select(item => item.Id)
                .SingleAsync();
        }

        var revision = (await coordinator.GetFromJsonAsync<OrderRevisionDto>($"/api/v1/orders/{correction}/revision", AuthenticatedApi.Json))!;
        await ExpectAsync(HttpStatusCode.OK, AuthenticatedApi.PatchAsync(
            coordinator,
            $"/api/v1/orders/{correction}/items/{line}",
            new Dictionary<string, object?> { ["rowVersion"] = revision.RowVersion, ["quantity"] = new { value = newQuantity } }));

        var resent = await SendAsync(coordinator, $"/api/v1/orders/{correction}/workflow/submit", new { });
        Assert.Equal(OrderRequestStatus.PendingApproval, resent.Status);
        return correction;
    }

    private async Task AssertStandsAsync(long orderRequestId, OrderRequestStatus status, int events)
    {
        await using var sandbox = SandboxForTests.Context(target);
        Assert.Equal(status, (await sandbox.OrderRequests.AsNoTracking().SingleAsync(item => item.Id == orderRequestId)).Status);
        Assert.Equal(events, await sandbox.OrderRequestWorkflowEvents.CountAsync(item => item.OrderRequestId == orderRequestId));
    }

    private static async Task<ApprovalInboxDto> InboxAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/v1/approvals/inbox");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ApprovalInboxDto>(AuthenticatedApi.Json))!;
    }

    private static async Task<OrderWorkflowDto> WorkflowAsync(HttpClient client, long orderRequestId)
    {
        var response = await client.GetAsync($"/api/v1/orders/{orderRequestId}/workflow");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<OrderWorkflowDto>(AuthenticatedApi.Json))!;
    }

    private static async Task<OrderWorkflowDto> SendAsync(HttpClient client, string url, object body)
    {
        var response = await AuthenticatedApi.PostAsync(client, url, body);
        Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<OrderWorkflowDto>(AuthenticatedApi.Json))!;
    }

    private static async Task ExpectAsync(HttpStatusCode expected, Task<HttpResponseMessage> call)
    {
        var response = await call;
        Assert.True(response.StatusCode == expected,
            $"Expected {(int)expected}, got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
    }

    /// <summary>The facts as the browser receives them, left readable for the test log.</summary>
    private static string Describe(WorkflowDecisionFactsDto facts) =>
        JsonSerializer.Serialize(facts, new JsonSerializerOptions(AuthenticatedApi.Json) { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
}
