using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Application.Users;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Identity;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.ApprovalSandbox;

/// <summary>
/// Fills a sandbox that has just been created: <see cref="SandboxScenario"/>, and nothing copied from anywhere.
/// </summary>
/// <remarks>
/// Everything goes through the application's own code. The accounts are made by <see cref="IUserDirectory"/>,
/// so Identity hashes the password and assigns the role the way the users page does. The catalogue and the
/// orders are built by the domain model, the way the screens' own services build them. The one workflow step —
/// sending the test order — is taken by <see cref="OrderWorkflowService"/>, acting as the coordinator.
/// <para>
/// The single exception is the historical carry-in. The domain cannot produce an order that was approved
/// before this system existed, so it is written with the statements the real migration used.
/// </para>
/// </remarks>
internal static class SandboxSeed
{
    /// <returns>What was made, by id.</returns>
    /// <exception cref="SandboxRefusedException">
    /// Guard 4: the database already holds an order request, so it was not just created. Nothing is written.
    /// Also when Identity refuses the password.
    /// </exception>
    public static async Task<SandboxContents> SeedAsync(
        IServiceProvider services, string databaseName, string? accountPassword, CancellationToken cancellationToken)
    {
        var db = services.GetRequiredService<BaxOrdersDbContext>();

        // Only a database this tool has just made is seeded. One that holds orders is somebody's data.
        if (await db.OrderRequests.AnyAsync(cancellationToken))
        {
            throw new SandboxRefusedException(
                $"'{databaseName}' already holds order requests, so it was not just created. Nothing was written; "
                + "use --reset for a fresh sandbox.");
        }

        var password = SandboxPassword.Require(accountPassword);

        // The roles, the way the API brings them into existence at startup. No administrator is configured, so
        // it creates none: the three accounts below are the only people in the sandbox.
        await services.GetRequiredService<IdentityInitializer>().InitializeAsync(new BootstrapAdminOptions(), cancellationToken);

        var accounts = new Dictionary<string, UserDto>(StringComparer.Ordinal);
        var directory = services.GetRequiredService<IUserDirectory>();
        foreach (var account in SandboxScenario.Accounts)
        {
            var (user, failure) = await directory.CreateAsync(
                new CreateUserCommand(account.UserName, account.DisplayName, account.Role, password), cancellationToken);

            if (failure is not null)
            {
                // Identity's reasons describe the rule the password broke, never the password.
                throw new SandboxRefusedException($"The test account {account.UserName} could not be created: {failure.Message}");
            }

            accounts[account.UserName] = user!;
        }

        var location1 = new Location(SandboxScenario.Location1.Code, SandboxScenario.Location1.Name);
        var location2 = new Location(SandboxScenario.Location2.Code, SandboxScenario.Location2.Name);
        var responsible = new ResponsiblePerson(SandboxScenario.ResponsiblePersonName);
        var supplier = new Supplier(SandboxScenario.SupplierName);
        db.Locations.AddRange(location1, location2);
        db.ResponsiblePeople.Add(responsible);
        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync(cancellationToken);

        var variants = await VariantsAsync(services, db, cancellationToken);
        var locations = new Dictionary<string, Location>(StringComparer.Ordinal)
        {
            [location1.Code] = location1,
            [location2.Code] = location2,
        };

        OrderRequest Build(SandboxOrder order, ImportBatch? batch)
        {
            var request = new OrderRequest(locations[order.Location.Code], order.Period, null, responsible, batch);
            foreach (var line in order.Lines)
            {
                request.AddItem(variants[line.Product], line.Quantity, line.UnitPrice, supplier);
            }

            db.OrderRequests.Add(request);
            return request;
        }

        // History first, the way it came: each month from its own workbook, carried in as already approved.
        var historical = new List<long>();
        foreach (var order in SandboxScenario.HistoricalOrders)
        {
            var batch = ImportedWorkbook(order.Period);
            db.ImportBatches.Add(batch);
            var request = Build(order, batch);
            await db.SaveChangesAsync(cancellationToken);

            await CarryInAsHistoricalAsync(db, request.Id, cancellationToken);
            historical.Add(request.Id);
        }

        var testOrder = Build(SandboxScenario.TestOrder, batch: null);
        var draft = Build(SandboxScenario.Draft, batch: null);
        await db.SaveChangesAsync(cancellationToken);

        // The service loads what it acts on itself, as it does behind the API.
        db.ChangeTracker.Clear();

        var actor = services.GetRequiredService<SeedActor>();
        actor.ActAs(accounts[SandboxScenario.Coordinator.UserName]);
        try
        {
            await services.GetRequiredService<OrderWorkflowService>()
                .SubmitAsync(testOrder.Id, new SubmitForApprovalCommand(), cancellationToken);
        }
        finally
        {
            actor.ActAs(null);
        }

        return new SandboxContents(
            databaseName,
            testOrder.Id,
            draft.Id,
            historical,
            accounts.ToDictionary(pair => pair.Key, pair => pair.Value.Id, StringComparer.Ordinal));
    }

    /// <summary>One product per <see cref="SandboxScenario.Products"/> entry, with the variant the orders use.</summary>
    private static async Task<List<ProductVariant>> VariantsAsync(
        IServiceProvider services, BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        var codes = services.GetRequiredService<IProductCodeGenerator>();
        var units = await db.UnitsOfMeasure.ToDictionaryAsync(unit => unit.Code, StringComparer.Ordinal, cancellationToken);

        var variants = new List<ProductVariant>(SandboxScenario.Products.Count);
        foreach (var definition in SandboxScenario.Products)
        {
            var product = new Product(await codes.NextAsync(cancellationToken), definition.Name);
            db.Products.Add(product);
            await db.SaveChangesAsync(cancellationToken);

            variants.Add(product.AddVariant(null, null, null, units[definition.UnitCode]));
            await db.SaveChangesAsync(cancellationToken);
        }

        return variants;
    }

    /// <summary>The workbook a historical month came from, taken through its own states to "imported".</summary>
    private static ImportBatch ImportedWorkbook(DateOnly period)
    {
        var now = DateTime.UtcNow;
        var batch = new ImportBatch($"sinaq-tarixi-{period:yyyy-MM}.xlsx", null, now);
        batch.StartParsing();
        batch.StartValidating();
        batch.CompleteValidation(0, 0, 0, requiresReview: false, now);
        batch.MarkImported(now);
        return batch;
    }

    /// <summary>
    /// What migration <c>20260923122642_AddLinePricingModeAndHistoricalApproval</c> did to every imported order,
    /// done to this one.
    /// </summary>
    /// <remarks>
    /// The same two statements, column for column: an <c>ImportedAsApproved</c> event with no actor, written as
    /// "Sistem", with the migration's comment and its count of lines owing a price; then the status. Neither
    /// <c>SubmittedAtUtc</c> nor <c>ApprovedAtUtc</c> is set, exactly as for the real history. The only
    /// difference is that each statement names this one order rather than every imported draft.
    /// </remarks>
    private static async Task CarryInAsHistoricalAsync(BaxOrdersDbContext db, long orderRequestId, CancellationToken cancellationToken)
    {
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO "OrderRequestWorkflowEvents"
                ("OrderRequestId", "Action", "FromStatus", "ToStatus", "ActorUserId", "ActorDisplayName",
                 "Comment", "MissingPriceItemCount", "MissingPricesAcknowledged", "OccurredAtUtc")
            SELECT r."Id", 'ImportedAsApproved', r."Status", 'Approved', NULL, 'Sistem',
                   {SandboxScenario.HistoricalComment},
                   (SELECT COUNT(*) FROM "OrderRequestItems" i
                    WHERE i."OrderRequestId" = r."Id" AND i."UnitPrice" IS NULL
                      AND i."PricingMode" <> 'InternalFreeSupply'),
                   FALSE, NOW() AT TIME ZONE 'UTC'
            FROM "OrderRequests" r
            WHERE r."Id" = {orderRequestId}
              AND r."SourceImportBatchId" IS NOT NULL
              AND r."Status" = 'Draft';
            """,
            cancellationToken);

        await db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE "OrderRequests"
            SET "Status" = 'Approved'
            WHERE "Id" = {orderRequestId} AND "SourceImportBatchId" IS NOT NULL AND "Status" = 'Draft';
            """,
            cancellationToken);
    }
}
