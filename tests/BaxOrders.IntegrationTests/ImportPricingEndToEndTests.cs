using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Imports.Confirmation;
using BaxOrders.Application.Imports.Pricing;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Orders;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using static BaxOrders.IntegrationTests.ImportWorkbooks;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Pricing classification during import review over real HTTP, with real cookies and real antiforgery tokens
/// (brief 16.1): the people who run imports list and classify; a Rəhbər is refused both, as every import endpoint
/// refuses them since brief 14; nobody signed in is asked to sign in.
/// </summary>
/// <remarks>
/// The ids in every refusal exist, so a 403 here is never a 404 in disguise.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ImportPricingEndToEndTests(PostgresDatabaseFixture database) : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;

    private WebApplicationFactory<Program> factory = null!;

    public Task InitializeAsync()
    {
        factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:BaxOrders", PostgresDatabaseFixture.ConnectionString);
        });

        return Task.CompletedTask;
    }

    public async Task DisposeAsync() => await factory.DisposeAsync();

    [PostgresFact]
    public async Task A_coordinator_and_an_administrator_list_set_change_and_clear()
    {
        foreach (var role in new[] { BaxOrdersRoles.Coordinator, BaxOrdersRoles.Admin })
        {
            var world = await WorldAsync();
            using var session = await SignedInAsync(role);

            var first = await ReviewAsync(session, world.BatchId, string.Empty);
            Assert.Equal(world.Open.Order().ToArray(), first.Rows.Select(row => row.ImportRowId).Order().ToArray());
            Assert.Equal((3, 3, 0, 0), (first.TotalCount, first.Unclassified, first.PriceRequired, first.InternalFreeSupply));

            var set = await ClassifyAsync(session, world.BatchId, [world.Open[0]], "InternalFreeSupply");
            Assert.Equal(HttpStatusCode.OK, set.StatusCode);
            var body = await set.Content.ReadFromJsonAsync<JsonElement>(AuthenticatedApi.Json);
            Assert.Equal(1, body.GetProperty("changed").GetInt32());
            Assert.Equal("InternalFreeSupply", body.GetProperty("pricingMode").GetString());
            Assert.Equal(world.BatchId, body.GetProperty("preview").GetProperty("batch").GetProperty("id").GetInt64());

            Assert.Equal(HttpStatusCode.OK, (await ClassifyAsync(session, world.BatchId, [world.Open[1]], "PriceRequired")).StatusCode);

            var free = await ReviewAsync(session, world.BatchId, "mode=InternalFreeSupply");
            var row = Assert.Single(free.Rows);
            Assert.Equal((world.Open[0], PricingMode.InternalFreeSupply, $"Sınaq {role}"),
                (row.ImportRowId, row.Classification, row.ClassifiedByDisplayName));

            var open = await ReviewAsync(session, world.BatchId, "mode=Unresolved&page=1&pageSize=1");
            Assert.Equal(world.Open[2], Assert.Single(open.Rows).ImportRowId);
            Assert.Equal((1, 1, 1, 1), (open.TotalCount, open.Unclassified, open.PriceRequired, open.InternalFreeSupply));

            // "Unresolved" takes it back to «Təsnif edilməyib».
            Assert.Equal(HttpStatusCode.OK, (await ClassifyAsync(session, world.BatchId, [world.Open[0]], "Unresolved")).StatusCode);
            var cleared = await ReviewAsync(session, world.BatchId, string.Empty);
            Assert.Equal((2, 1, 0), (cleared.Unclassified, cleared.PriceRequired, cleared.InternalFreeSupply));
        }
    }

    [PostgresFact]
    public async Task Every_refusal_answers_its_status_and_writes_nothing()
    {
        var world = await WorldAsync();
        using var session = await SignedInAsync(BaxOrdersRoles.Coordinator);

        Assert.Equal(HttpStatusCode.BadRequest, (await ClassifyAsync(session, world.BatchId, [], "PriceRequired")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await ClassifyAsync(session, world.BatchId, [world.Open[0]], "Bogus")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await ClassifyAsync(session, world.BatchId, [world.Open[0]], 99)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await ClassifyAsync(session, world.BatchId, [world.Open[0], -1], "PriceRequired")).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await ClassifyAsync(session, world.BatchId, [world.Open[0], world.Excluded], "PriceRequired")).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await ClassifyAsync(session, world.BatchId, [world.Open[0], world.Priced], "PriceRequired")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await session.GetAsync("/api/v1/imports/-1/pricing")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await session.GetAsync($"/api/v1/imports/{world.BatchId}/pricing?mode=Bogus")).StatusCode);

        Assert.Equal(0, await ClassifiedRowsAsync(world.BatchId));

        // Once imported, the review is over.
        var confirmed = await AuthenticatedApi.PostAsync(session, $"/api/v1/imports/{world.BatchId}/confirmation", new { decisions = Array.Empty<object>() });
        Assert.Equal(HttpStatusCode.OK, confirmed.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await ClassifyAsync(session, world.BatchId, [world.Open[0]], "PriceRequired")).StatusCode);

        Assert.Equal(0, await ClassifiedRowsAsync(world.BatchId));
    }

    [PostgresFact]
    public async Task A_manager_is_refused_both_and_nobody_signed_in_is_asked_to_sign_in()
    {
        var world = await WorldAsync();

        using var manager = await SignedInAsync(BaxOrdersRoles.Manager);
        Assert.Equal(HttpStatusCode.Forbidden, (await manager.GetAsync($"/api/v1/imports/{world.BatchId}/pricing")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await ClassifyAsync(manager, world.BatchId, [world.Open[0]], "InternalFreeSupply")).StatusCode);

        using var anonymous = AuthenticatedApi.Anonymous(factory);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"/api/v1/imports/{world.BatchId}/pricing")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ClassifyAsync(anonymous, world.BatchId, [world.Open[0]], "InternalFreeSupply")).StatusCode);

        Assert.Equal(0, await ClassifiedRowsAsync(world.BatchId));
    }

    /// <summary>
    /// Acceptance 3, as the Koordinator does it: classified in review, imported, then corrected on Qiymət təsnifatı
    /// through its own endpoint — the line's history keeps both decisions.
    /// </summary>
    [PostgresFact]
    public async Task What_the_review_said_is_corrected_on_Qiymet_tesnifati_over_http()
    {
        var world = await WorldAsync();
        using var session = await SignedInAsync(BaxOrdersRoles.Coordinator);

        Assert.Equal(HttpStatusCode.OK, (await ClassifyAsync(session, world.BatchId, [world.Open[0]], "InternalFreeSupply")).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await AuthenticatedApi.PostAsync(session, $"/api/v1/imports/{world.BatchId}/confirmation", new { decisions = Array.Empty<object>() })).StatusCode);

        long lineId, orderId;
        await using (var db = database.CreateContext())
        {
            var line = await db.ImportRowMaterializations.AsNoTracking()
                .Where(link => link.ImportRowId == world.Open[0])
                .Select(link => new { link.OrderRequestItemId, link.OrderRequestItem.OrderRequestId })
                .SingleAsync(None);
            (lineId, orderId) = (line.OrderRequestItemId, line.OrderRequestId);
        }

        var listed = await session.GetFromJsonAsync<JsonElement>(
            $"/api/v1/pricing-mode-review?mode=InternalFreeSupply&orderRequestId={orderId}", AuthenticatedApi.Json);
        Assert.Equal(lineId, Assert.Single(listed.GetProperty("rows").EnumerateArray()).GetProperty("orderRequestItemId").GetInt64());
        Assert.Equal((2, 0, 1), (listed.GetProperty("unresolved").GetInt32(), listed.GetProperty("missingRequiredPrice").GetInt32(),
            listed.GetProperty("internalFreeSupply").GetInt32()));

        var moved = await AuthenticatedApi.PostAsync(
            session, "/api/v1/pricing-mode-review", new { orderRequestItemIds = new[] { lineId }, pricingMode = "PriceRequired" });
        Assert.Equal(HttpStatusCode.OK, moved.StatusCode);

        var after = await session.GetFromJsonAsync<JsonElement>($"/api/v1/pricing-mode-review?orderRequestId={orderId}", AuthenticatedApi.Json);
        Assert.Equal((2, 1, 0), (after.GetProperty("unresolved").GetInt32(), after.GetProperty("missingRequiredPrice").GetInt32(),
            after.GetProperty("internalFreeSupply").GetInt32()));

        await using var check = database.CreateContext();
        var decisions = await check.OrderItemPricingDecisions.AsNoTracking()
            .Where(decision => decision.OrderRequestItemId == lineId)
            .OrderBy(decision => decision.OccurredAtUtc)
            .Select(decision => new { decision.PreviousMode, decision.NewMode, decision.Reason })
            .ToListAsync(None);
        Assert.Equal(2, decisions.Count);
        Assert.Equal((PricingMode.Unresolved, PricingMode.InternalFreeSupply), (decisions[0].PreviousMode, decisions[0].NewMode));
        Assert.Equal($"Import #{world.BatchId} yoxlamasında təsnif edilib", decisions[0].Reason);
        Assert.Equal((PricingMode.InternalFreeSupply, PricingMode.PriceRequired), (decisions[1].PreviousMode, decisions[1].NewMode));
    }

    // ---- fixture -------------------------------------------------------------------------------------------

    /// <param name="Open">The three included rows with no price, in workbook order.</param>
    private sealed record World(long BatchId, long Priced, IReadOnlyList<long> Open, long Excluded);

    /// <summary>One object, one month, ready to confirm: a priced row, three unpriced rows and an excluded unpriced one.</summary>
    private async Task<World> WorldAsync()
    {
        await using var db = database.CreateContext();
        var tag = Guid.NewGuid().ToString("N")[..8];
        var product = $"HTTP təsnif malı {tag}";
        var location = $"HTTP təsnif obyekti {tag}";

        var batchId = await StageAsync(
            db,
            new OrderLine(Product: product, Location: location, Quantity: 1, Price: 2),
            new OrderLine(Product: product, Location: location, Quantity: 2, Price: null),
            new OrderLine(Product: product, Location: location, Quantity: 3, Price: null),
            new OrderLine(Product: product, Location: location, Quantity: 4, Price: null),
            new OrderLine(Product: product, Location: location, Quantity: 5, Price: null));

        var review = ResolutionService(db);
        await review.CreateLocationAsync(
            new CreateLocationCommand(batchId, TextNormalizer.Normalize(location), location, ResolutionScope.BatchOnly), None);
        await review.CreateProductAsync(
            new CreateProductCommand(batchId, TextNormalizer.Normalize(product), product, null, ResolutionScope.BatchOnly), None);
        foreach (var key in await db.ImportRows.AsNoTracking()
                     .Where(row => row.ImportBatchId == batchId && row.VariantSourceKey != null && row.MatchedProductVariantId == null)
                     .Select(row => row.VariantSourceKey!)
                     .Distinct()
                     .ToListAsync(None))
        {
            await review.CreateProductVariantAsync(new CreateProductVariantCommand(batchId, key), None);
        }

        var rows = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId)
            .OrderBy(row => row.RowNumber)
            .Select(row => row.Id)
            .ToListAsync(None);
        await CorrectionService(db).ExcludeAsync(new ExcludeRowCommand(batchId, rows[4], "Təkrar sətir"), None);

        Assert.Equal(ImportStatus.ReadyToImport, (await db.ImportBatches.AsNoTracking().SingleAsync(batch => batch.Id == batchId, None)).Status);
        return new World(batchId, rows[0], [rows[1], rows[2], rows[3]], rows[4]);
    }

    private static Task<HttpResponseMessage> ClassifyAsync(HttpClient client, long batchId, long[] importRowIds, object pricingMode) =>
        AuthenticatedApi.PostAsync(client, $"/api/v1/imports/{batchId}/pricing", new { importRowIds, pricingMode });

    private static async Task<ImportPricingReviewDto> ReviewAsync(HttpClient client, long batchId, string query)
    {
        var response = await client.GetAsync($"/api/v1/imports/{batchId}/pricing?{query}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ImportPricingReviewDto>(AuthenticatedApi.Json))!;
    }

    private async Task<int> ClassifiedRowsAsync(long batchId)
    {
        await using var db = database.CreateContext();
        return await db.ImportRows.AsNoTracking()
            .CountAsync(row => row.ImportBatchId == batchId && row.PricingClassification != null, None);
    }

    private async Task<HttpClient> SignedInAsync(string role)
    {
        var account = await AuthenticatedApi.CreateUserAsync(factory, role, $"Sınaq {role}");
        var client = AuthenticatedApi.Anonymous(factory);
        await AuthenticatedApi.SignInAsync(client, account.UserName, account.Password);
        return client;
    }
}
