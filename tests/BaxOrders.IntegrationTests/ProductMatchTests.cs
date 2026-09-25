using System.Text.Json;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Catalog.ProductMatches;
using BaxOrders.Application.Common;
using BaxOrders.Application.Decisions;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Task 13a against a real PostgreSQL, on the brief's own example: the system suggests, only an administrator decides,
/// a decision is one row and nothing else, and a wrong one is undone exactly.
/// </summary>
/// <remarks>
/// Each test builds a database of its own and drops it afterwards: the suggestion rule reads the whole catalogue, so a
/// product another test left in the shared database would change what it finds.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ProductMatchTests : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;

    private static readonly AnalyticsComparisonBasis[] Bases =
    [
        AnalyticsComparisonBasis.PreviousMonth,
        AnalyticsComparisonBasis.Previous3MonthAverage,
        AnalyticsComparisonBasis.Previous6MonthAverage,
        AnalyticsComparisonBasis.AllPriorMonths,
    ];

    private IsolatedDatabase? _database;

    /// <summary>Acceptance 1 and criterion 2: the rule, on the fixture, finds exactly what it should.</summary>
    [PostgresFact]
    public async Task The_system_suggests_the_briefs_pair_and_the_spelling_pairs_and_nothing_else()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);

        var variants = await SuggestionsAsync(db, ProductMatchKind.Variant);
        var sameItem = await SuggestionsAsync(db, ProductMatchKind.SameItem);

        Assert.Equal(
            [
                ("Qab yuma", "Qab", "yuma"),
                ("Qab yuma limon", "Qab", "yuma limon"),
                ("Qab yuma nanə", "Qab", "yuma nanə"),
                ("Sabun elano lavanda ətirli", "Sabun elano", "lavanda ətirli"),
            ],
            variants.Suggestions.Items.Select(item => (item.Source.ProductName, item.Target.ProductName, item.ProposedLabel!)));
        var sabun = variants.Suggestions.Items.Single(item => item.Target.ProductName == "Sabun elano");
        Assert.Equal((1, 1, 1), (sabun.Source.LineCount, sabun.Target.LineCount, sabun.Source.LocationCount));
        Assert.Equal((ProductMatchFixture.September, ProductMatchFixture.August), (sabun.Source.FirstMonth, sabun.Target.LastMonth));

        Assert.Equal(
            [
                (fixture.Variant("Lampa 15 W"), fixture.Variant("Lampa 15W"), SpellingDifference.Whitespace),
                (fixture.Variant("Lampa15 W"), fixture.Variant("Lampa 15W"), SpellingDifference.Whitespace),
                (fixture.Variant("Kaplin 3\\4"), fixture.Variant("Kaplin 3/4"), SpellingDifference.Slash),
                (fixture.Variant("Lampa LED|15W"), fixture.Variant("Lampa LED|15 W"), SpellingDifference.Whitespace),
            ],
            sameItem.Suggestions.Items.Select(item => (item.Source.VariantId!.Value, item.Target.VariantId!.Value, item.Difference!.Value)));
        Assert.Equal((4, 4), (sameItem.SameItemCount, sameItem.VariantCount));

        // Different order units, a variant never ordered, and the business's do-not-merge pairs are never suggested.
        var mentioned = variants.Suggestions.Items.Concat(sameItem.Suggestions.Items)
            .SelectMany(item => new[] { item.Source.ProductName, item.Target.ProductName })
            .ToHashSet(StringComparer.Ordinal);
        Assert.DoesNotContain("Mop 40 sm", mentioned);
        Assert.DoesNotContain("Vedrə 10 L", mentioned);
        Assert.DoesNotContain("Metlaq Boz", mentioned);
        Assert.DoesNotContain("Metlaq boz rəng", mentioned);
        Assert.DoesNotContain("Əl arabası", mentioned);
        Assert.DoesNotContain("Əl arabası qaynaqlı", mentioned);
    }

    [PostgresFact]
    public async Task Suggestions_can_be_searched_by_either_sides_name()
    {
        await using var db = _database!.CreateContext();
        await ProductMatchFixture.CreateAsync(db);

        var byVariant = await new ProductMatchQueries(db).GetSuggestionsAsync(
            new ProductMatchSuggestionQuery(ProductMatchKind.Variant, Search: "LAVANDA"), None);
        var byBase = await new ProductMatchQueries(db).GetSuggestionsAsync(
            new ProductMatchSuggestionQuery(ProductMatchKind.Variant, Search: "sabun elano"), None);

        Assert.Equal((1, 4), (byVariant.FilteredCount, byVariant.VariantCount));
        Assert.Equal(1, byBase.FilteredCount);
    }

    /// <summary>Criterion 4: "özü heç nə etmir" — reading suggestions, twice, writes nothing.</summary>
    [PostgresFact]
    public async Task Reading_suggestions_writes_nothing()
    {
        await using var db = _database!.CreateContext();
        await ProductMatchFixture.CreateAsync(db);
        var before = await CatalogueAsync(db);

        await SuggestionsAsync(db, ProductMatchKind.SameItem);
        await SuggestionsAsync(db, ProductMatchKind.Variant);
        await SuggestionsAsync(db, ProductMatchKind.SameItem);
        await SuggestionsAsync(db, ProductMatchKind.Variant);

        Assert.Equal(before, await CatalogueAsync(db));
        Assert.Equal(0, await db.ProductMatchDecisions.CountAsync());
    }

    /// <summary>Acceptance 2 and criterion 5: one row, the two products stay two, and the pair leaves the suggestions.</summary>
    [PostgresFact]
    public async Task Approving_the_sabun_pair_records_one_link_and_changes_nothing_else()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var admin = await TestCurrentUser.AdminAsync(db, "Sınaq administratoru");
        var before = await CatalogueAsync(db);
        var started = DateTime.UtcNow;

        var decision = await Service(db, admin).ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano")), None);

        var row = await db.ProductMatchDecisions.AsNoTracking().SingleAsync();
        Assert.Equal(decision.Id, row.Id);
        Assert.Equal((ProductMatchKind.Variant, ProductMatchOutcome.Approved, "lavanda ətirli"), (row.Kind, row.Outcome, row.VariantLabel));
        Assert.Equal((fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano")), (row.SourceProductId, row.TargetProductId));
        Assert.Equal((admin.UserId!.Value, "Sınaq administratoru"), (row.DecidedByUserId, row.DecidedByDisplayName));
        Assert.InRange(row.DecidedAtUtc, started.AddSeconds(-5), DateTime.UtcNow.AddSeconds(5));
        Assert.Equal(("Sabun elano lavanda ətirli", "Sabun elano", "lavanda ətirli"), (decision.SourceProductName, decision.TargetProductName, decision.VariantLabel));

        // Two products, each with its own variant and its own line, exactly as before.
        Assert.Equal(before, await CatalogueAsync(db));

        var variants = await SuggestionsAsync(db, ProductMatchKind.Variant);
        Assert.DoesNotContain(variants.Suggestions.Items, item => item.Target.ProductName == "Sabun elano");
        Assert.Equal(3, variants.VariantCount);
    }

    [PostgresFact]
    public async Task An_administrator_may_name_the_variant_differently()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var admin = await TestCurrentUser.AdminAsync(db);

        var decision = await Service(db, admin).ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano"), "  lavanda  ", "ətir fərqi"), None);

        Assert.Equal(("lavanda", "ətir fərqi"), (decision.VariantLabel, decision.Reason));
    }

    /// <summary>Criterion 5: the administrator chooses which spelling is kept.</summary>
    [PostgresFact]
    public async Task Approving_a_spelling_pair_the_other_way_round_keeps_the_other_name()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var admin = await TestCurrentUser.AdminAsync(db);

        // Suggested as "Kaplin 3\4" → "Kaplin 3/4"; the administrator keeps "Kaplin 3\4" instead.
        var decision = await Service(db, admin).ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Kaplin 3/4"), fixture.Variant("Kaplin 3\\4")), None);

        Assert.Equal((fixture.Variant("Kaplin 3/4"), fixture.Variant("Kaplin 3\\4")), (decision.SourceVariantId!.Value, decision.TargetVariantId!.Value));
        Assert.Equal(("Kaplin 3/4", "Kaplin 3\\4"), (decision.SourceProductName, decision.TargetProductName));
        Assert.Equal("PCS", decision.TargetVariantDescription);

        var sameItem = await SuggestionsAsync(db, ProductMatchKind.SameItem);
        Assert.DoesNotContain(sameItem.Suggestions.Items, item => item.Source.ProductName.StartsWith("Kaplin", StringComparison.Ordinal));
    }

    /// <summary>Criterion 5: whatever was not suggested, or would make a chain, is refused and nothing is written.</summary>
    [PostgresFact]
    public async Task A_pair_nobody_was_shown_a_chain_a_second_base_and_a_variant_of_a_variant_are_refused()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var admin = await TestCurrentUser.AdminAsync(db);
        var service = Service(db, admin);

        // Not a suggestion: two unrelated variants, and a variant link in the wrong direction.
        var notShown = await Assert.ThrowsAsync<DomainException>(() => service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Lampa 15 W"), fixture.Variant("Kaplin 3/4")), None));
        Assert.Contains("not a current", notShown.Message);
        await Assert.ThrowsAsync<DomainException>(() => service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano"), fixture.Product("Sabun elano lavanda ətirli")), None));
        await Assert.ThrowsAsync<DomainException>(() => service.RejectAsync(
            new RejectProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Vedrə 10 L"), fixture.Variant("Vedrə 10L")), None));

        // Different order units: never one item.
        var units = await Assert.ThrowsAsync<DomainException>(() => service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Mop 40 sm"), fixture.Variant("Mop 40sm")), None));
        Assert.Contains("different units", units.Message);

        // A chain: "Lampa 15 W" already counts as "Lampa 15W", so "Lampa 15W" cannot count as anything else ...
        await service.ApproveAsync(new ApproveProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Lampa 15 W"), fixture.Variant("Lampa 15W")), None);
        var chain = await Assert.ThrowsAsync<DomainException>(() => service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Lampa 15W"), fixture.Variant("Lampa15 W")), None));
        Assert.Contains("chain", chain.Message);
        // ... and nothing can count as "Lampa 15 W", which itself counts as another.
        await Assert.ThrowsAsync<DomainException>(() => service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Lampa15 W"), fixture.Variant("Lampa 15 W")), None));

        // A second base: "Qab yuma limon" is a variant of "Qab" and cannot also be one of "Qab yuma".
        await service.ApproveAsync(new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Qab yuma limon"), fixture.Product("Qab")), None);
        var secondBase = await Assert.ThrowsAsync<DomainException>(() => service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Qab yuma limon"), fixture.Product("Qab yuma")), None));
        Assert.Contains("already a variant", secondBase.Message);

        // A variant of a variant: once "Qab yuma" is a variant of "Qab", nothing is a variant of "Qab yuma".
        await service.ApproveAsync(new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Qab yuma"), fixture.Product("Qab")), None);
        var nested = await Assert.ThrowsAsync<DomainException>(() => service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Qab yuma nanə"), fixture.Product("Qab yuma")), None));
        Assert.Contains("one level only", nested.Message);

        // Only the three approvals were written.
        Assert.Equal(3, await db.ProductMatchDecisions.CountAsync());
    }

    /// <summary>Acceptance 8 and criterion 7: undoing puts the suggestions back exactly as they were.</summary>
    [PostgresFact]
    public async Task Undoing_an_approval_keeps_the_row_and_brings_the_pair_back_exactly()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var admin = await TestCurrentUser.AdminAsync(db, "Sınaq administratoru");
        var service = Service(db, admin);
        var suggestionsBefore = Json(await SuggestionsAsync(db, ProductMatchKind.Variant));
        var catalogueBefore = await CatalogueAsync(db);

        var approved = await service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano")), None);
        var undone = await service.UndoAsync(approved.Id, new UndoProductMatchCommand("səhv təsdiq"), None);

        Assert.False(undone.IsLive);
        Assert.Equal((admin.UserId, "Sınaq administratoru", "səhv təsdiq"), (undone.UndoneByUserId, undone.UndoneByDisplayName, undone.UndoReason));
        Assert.NotNull(undone.UndoneAtUtc);

        var row = await db.ProductMatchDecisions.AsNoTracking().SingleAsync();
        Assert.Equal(("lavanda ətirli", ProductMatchOutcome.Approved), (row.VariantLabel, row.Outcome));
        Assert.NotNull(row.UndoneAtUtc);

        Assert.Equal(suggestionsBefore, Json(await SuggestionsAsync(db, ProductMatchKind.Variant)));
        Assert.Equal(catalogueBefore, await CatalogueAsync(db));

        await Assert.ThrowsAsync<ConflictException>(() => service.UndoAsync(approved.Id, new UndoProductMatchCommand(), None));
        await Assert.ThrowsAsync<NotFoundException>(() => service.UndoAsync(approved.Id + 1000, new UndoProductMatchCommand(), None));

        // After the undo the same pair can be decided again.
        await service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano")), None);
        Assert.Equal(2, await db.ProductMatchDecisions.CountAsync());
    }

    [PostgresFact]
    public async Task Rejecting_hides_the_pair_either_way_round_and_undoing_the_rejection_brings_it_back()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var admin = await TestCurrentUser.AdminAsync(db);
        var service = Service(db, admin);
        var before = Json(await SuggestionsAsync(db, ProductMatchKind.SameItem));

        // Suggested as "Lampa15 W" → "Lampa 15W"; rejected the other way round, it is gone all the same.
        var rejected = await service.RejectAsync(
            new RejectProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Lampa 15W"), fixture.Variant("Lampa15 W"), "fərqli lampadır"), None);
        Assert.Equal((ProductMatchOutcome.Rejected, "fərqli lampadır"), (rejected.Outcome, rejected.Reason));

        var hidden = await SuggestionsAsync(db, ProductMatchKind.SameItem);
        Assert.DoesNotContain(hidden.Suggestions.Items, item => item.Source.VariantId == fixture.Variant("Lampa15 W"));
        Assert.Equal(3, hidden.SameItemCount);

        // A rejected pair cannot be approved without undoing the rejection first.
        await Assert.ThrowsAsync<DomainException>(() => service.ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Lampa15 W"), fixture.Variant("Lampa 15W")), None));

        await service.UndoAsync(rejected.Id, new UndoProductMatchCommand(), None);
        Assert.Equal(before, Json(await SuggestionsAsync(db, ProductMatchKind.SameItem)));
        await Assert.ThrowsAsync<ConflictException>(() => service.UndoAsync(rejected.Id, new UndoProductMatchCommand(), None));
    }

    [PostgresFact]
    public async Task Decisions_are_listed_newest_first_and_an_undone_one_only_when_asked()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var admin = await TestCurrentUser.AdminAsync(db);
        var service = Service(db, admin);

        var first = await service.ApproveAsync(new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Qab yuma"), fixture.Product("Qab")), None);
        var second = await service.RejectAsync(new RejectProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Kaplin 3\\4"), fixture.Variant("Kaplin 3/4")), None);
        await service.UndoAsync(first.Id, new UndoProductMatchCommand(), None);

        var queries = new ProductMatchQueries(db);
        var live = await queries.GetDecisionsAsync(new ProductMatchDecisionQuery(), None);
        var all = await queries.GetDecisionsAsync(new ProductMatchDecisionQuery(IncludeUndone: true), None);
        var variants = await queries.GetDecisionsAsync(new ProductMatchDecisionQuery(ProductMatchKind.Variant, IncludeUndone: true), None);

        Assert.Equal([second.Id], live.Items.Select(item => item.Id));
        Assert.Equal([second.Id, first.Id], all.Items.Select(item => item.Id));
        Assert.Equal(("Kaplin 3\\4", "Kaplin 3/4"), (all.Items[0].SourceProductName, all.Items[0].TargetProductName));
        Assert.Equal([first.Id], variants.Items.Select(item => item.Id));
        Assert.False(variants.Items[0].IsLive);
    }

    /// <summary>Acceptance 6 and 13.2, at the service: whatever the endpoint said, only an administrator decides.</summary>
    [PostgresFact]
    public async Task Only_an_administrator_decides_whoever_calls_the_service()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var approve = new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano"));
        var reject = new RejectProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano"));

        foreach (var user in new ICurrentUserContext[]
                 {
                     await TestCurrentUser.ManagerAsync(db), await TestCurrentUser.CoordinatorAsync(db), TestCurrentUser.Anonymous(),
                 })
        {
            await Assert.ThrowsAsync<ForbiddenException>(() => Service(db, user).ApproveAsync(approve, None));
            await Assert.ThrowsAsync<ForbiddenException>(() => Service(db, user).RejectAsync(reject, None));
            await Assert.ThrowsAsync<ForbiddenException>(() => Service(db, user).UndoAsync(1, new UndoProductMatchCommand(), None));
        }

        Assert.Equal(0, await db.ProductMatchDecisions.CountAsync());
    }

    /// <summary>
    /// Acceptance 4 and 7, criterion 9: Heydər Əliyev's September order and the dashboard read exactly the same before an
    /// approval, after it and after its undo, on every basis.
    /// </summary>
    /// <remarks>
    /// Since 13b an approved spelling match does fold in every analytics read, and this still holds for two reasons. A
    /// variant link folds nothing (that is 13c's line). And the spelling match here is at the test object, which has no
    /// September order: its row carries no comparison, no causes and no product counts, and its baseline money is a sum
    /// that folding cannot change — so no September figure can move.
    /// </remarks>
    [PostgresFact]
    public async Task The_order_page_and_the_dashboard_do_not_move_when_a_match_is_approved_or_undone()
    {
        await using var db = _database!.CreateContext();
        var fixture = await ProductMatchFixture.CreateAsync(db);
        var admin = await TestCurrentUser.AdminAsync(db);

        var before = await AnalyticsAsync(db, fixture);
        var approved = await Service(db, admin).ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.Variant, fixture.Product("Sabun elano lavanda ətirli"), fixture.Product("Sabun elano")), None);
        await Service(db, admin).ApproveAsync(
            new ApproveProductMatchCommand(ProductMatchKind.SameItem, fixture.Variant("Lampa 15 W"), fixture.Variant("Lampa 15W")), None);
        var afterApproval = await AnalyticsAsync(db, fixture);
        await Service(db, admin).UndoAsync(approved.Id, new UndoProductMatchCommand(), None);
        var afterUndo = await AnalyticsAsync(db, fixture);

        Assert.Equal(before, afterApproval);
        Assert.Equal(before, afterUndo);

        // The brief's figures are what the screens show today: 750.00 against 750.00, the two products apart.
        var context = await new OrderDecisionContextQueries(db).GetAsync(fixture.SeptemberOrderId, new DecisionContextQuery(), None);
        Assert.Equal((750.00m, 750.00m, 0.00m), (context!.Current.KnownAmount, context.Primary.BaselineKnownAmount, context.Primary.DeltaAmount));
    }

    public async Task InitializeAsync()
    {
        if (PostgresDatabaseFixture.IsConfigured)
        {
            _database = await IsolatedDatabase.CreateAsync("baxorders_matches");
        }
    }

    public async Task DisposeAsync()
    {
        if (_database is not null)
        {
            await _database.DisposeAsync();
        }
    }

    // ---- helpers -------------------------------------------------------------------------------------------

    private static ProductMatchService Service(BaxOrdersDbContext db, ICurrentUserContext user) =>
        new(db, user, new PostgresProductMatchLock(db));

    private static Task<ProductMatchSuggestionListDto> SuggestionsAsync(BaxOrdersDbContext db, ProductMatchKind kind) =>
        new ProductMatchQueries(db).GetSuggestionsAsync(new ProductMatchSuggestionQuery(kind), None);

    private static string Json(object value) => JsonSerializer.Serialize(value);

    /// <summary>Every product, variant, alias and line, as a string that changes if any field of any row does.</summary>
    private static async Task<string> CatalogueAsync(BaxOrdersDbContext db)
    {
        var products = await db.Products.AsNoTracking().OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.Code, item.Name, item.NormalizedName, item.CategoryId, item.IsActive, item.UpdatedAtUtc })
            .ToListAsync();
        var variants = await db.ProductVariants.AsNoTracking().OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.ProductId, item.NormalizedVariantKey, item.OrderUnitId, item.IsActive, item.UpdatedAtUtc })
            .ToListAsync();
        var aliases = await db.ProductAliases.AsNoTracking().OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.ProductId, item.NormalizedAlias })
            .ToListAsync();
        var lines = await db.OrderRequestItems.AsNoTracking().OrderBy(item => item.Id)
            .Select(item => new { item.Id, item.OrderRequestId, item.ProductVariantId, item.Quantity, item.UnitPrice, item.PricingMode })
            .ToListAsync();

        return Json(new { products, variants, aliases, lines });
    }

    /// <summary>The September order's page and the September dashboard, on every standard basis.</summary>
    private static async Task<string> AnalyticsAsync(BaxOrdersDbContext db, ProductMatchFixture fixture)
    {
        var contexts = new OrderDecisionContextQueries(db);
        var dashboard = new ManagementDashboardQueries(db);
        var pieces = new List<object?>();

        foreach (var basis in Bases)
        {
            pieces.Add(await contexts.GetAsync(fixture.SeptemberOrderId, new DecisionContextQuery(basis), None));
            pieces.Add(await dashboard.GetAsync(ProductMatchFixture.September, new DashboardQuery(basis, PageSize: ManagementDashboardQueries.MaxPageSize), None));
        }

        return Json(pieces);
    }
}
