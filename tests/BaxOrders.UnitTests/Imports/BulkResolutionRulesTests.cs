using BaxOrders.Application.Common;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Imports;

namespace BaxOrders.UnitTests.Imports;

/// <summary>
/// What a bulk request may ask for. These rules run before any database work, and they are the line between
/// "an operator confirmed this for a selection" and "the importer decided something by itself".
/// </summary>
public sealed class BulkResolutionRulesTests
{
    private const int MaxItems = 150;

    [Fact]
    public void A_bulk_operation_needs_a_selection()
    {
        var empty = Assert.Throws<ValidationException>(() => Validate([]));

        Assert.Contains("at least one value", empty.Message);
    }

    [Fact]
    public void A_bulk_operation_is_bounded_so_it_stays_reviewable()
    {
        var items = Enumerable.Range(0, MaxItems + 1)
            .Select(index => Create(ImportResolutionKind.Product, $"mal {index}"))
            .ToList();

        var tooMany = Assert.Throws<ValidationException>(() => Validate(items));

        Assert.Contains($"at most {MaxItems}", tooMany.Message);
        Validate(items.Take(MaxItems).ToList());
    }

    [Fact]
    public void One_value_can_hold_only_one_decision()
    {
        var duplicate = Assert.Throws<ValidationException>(() => Validate(
        [
            Create(ImportResolutionKind.Product, "sement"),
            Map(ImportResolutionKind.Product, "sement", 5),
        ]));

        Assert.Contains("appears twice", duplicate.Message);

        // The same spelling under two different kinds is two different values.
        Validate([Create(ImportResolutionKind.Supplier, "sement"), Create(ImportResolutionKind.Product, "sement")]);
    }

    [Fact]
    public void A_blank_value_is_refused()
    {
        Assert.Throws<ValidationException>(() => Validate([Create(ImportResolutionKind.Product, "  ")]));
    }

    [Fact]
    public void Mapping_needs_a_target_and_creating_must_not_carry_one()
    {
        Assert.Throws<ValidationException>(() => Validate([new BulkResolutionItem(ImportResolutionKind.Supplier, "azclean", BulkResolutionAction.MapExisting)]));
        Assert.Throws<ValidationException>(() => Validate([new BulkResolutionItem(ImportResolutionKind.Supplier, "azclean", BulkResolutionAction.MapExisting, 0)]));
        Assert.Throws<ValidationException>(() => Validate(
            [new BulkResolutionItem(ImportResolutionKind.Supplier, "azclean", BulkResolutionAction.CreateFromValue, 12)]));
    }

    [Theory]
    [InlineData(ImportResolutionKind.OrderUnit)]
    [InlineData(ImportResolutionKind.SpecificationUnit)]
    public void Units_are_never_created_from_the_cell_text(ImportResolutionKind kind)
    {
        // "kv", "top" and "lik" carry meaning only a person knows; a code, a symbol and a type cannot be guessed.
        var refused = Assert.Throws<ValidationException>(() => Validate([Create(kind, "kv")]));

        Assert.Contains("only a person knows", refused.Message);

        // Mapping them to a unit the operator picked is fine.
        Validate([Map(kind, "kv", 7)]);
    }

    [Fact]
    public void Category_paths_are_never_created_in_bulk()
    {
        var refused = Assert.Throws<ValidationException>(() => Validate([Create(ImportResolutionKind.CategoryPath, "təmizlik|əlcək")]));

        Assert.Contains("hierarchy", refused.Message);
        Validate([Map(ImportResolutionKind.CategoryPath, "təmizlik|əlcək", 3)]);
    }

    [Theory]
    [InlineData(ImportResolutionKind.Location)]
    [InlineData(ImportResolutionKind.Supplier)]
    [InlineData(ImportResolutionKind.ResponsiblePerson)]
    [InlineData(ImportResolutionKind.Product)]
    [InlineData(ImportResolutionKind.ProductVariant)]
    public void Name_like_values_and_variants_may_be_created_for_a_selection(ImportResolutionKind kind)
    {
        Validate([Create(kind, "dəyər")]);
        Assert.Contains(kind, BulkResolutionRules.CreatableInBulk);
    }

    [Theory]
    [InlineData(ImportResolutionKind.CategoryPath)]
    [InlineData(ImportResolutionKind.ProductVariant)]
    public void A_path_and_a_variant_can_never_become_a_global_alias(ImportResolutionKind kind)
    {
        Assert.Throws<ValidationException>(() => Validate(
            [new BulkResolutionItem(kind, "dəyər", BulkResolutionAction.MapExisting, 4, ResolutionScope.GlobalAlias)]));
    }

    [Fact]
    public void A_mapping_defaults_to_this_import_only()
    {
        var item = Map(ImportResolutionKind.Supplier, "green gardem", 12);

        Assert.Equal(ResolutionScope.BatchOnly, item.Scope);
    }

    [Fact]
    public void The_summary_counts_what_the_confirmation_screen_shows()
    {
        var plan = new BulkResolutionPlan(1,
        [
            Planned(BulkItemStatus.Ready, rows: 42, createsRecord: true),
            Planned(BulkItemStatus.Ready, rows: 8, createsRecord: true),
            Planned(BulkItemStatus.Ready, rows: 5, createsRecord: false, createsAlias: true),
            Planned(BulkItemStatus.AlreadyResolved, rows: 3),
            Planned(BulkItemStatus.Conflict, rows: 7),
            Planned(BulkItemStatus.DependencyBlocked, rows: 11),
            Planned(BulkItemStatus.NotFound, rows: 0),
        ]);

        var summary = plan.ToResult().Summary;

        Assert.Equal((7, 3, 2, 1, 1), (summary.Selected, summary.Ready, summary.Conflicts, summary.AlreadyResolved, summary.DependencyBlocked));
        Assert.Equal((2, 1), (summary.RecordsToCreate, summary.AliasesToCreate));

        // Only the rows the operation would actually touch are counted.
        Assert.Equal(55, summary.RowsAffected);
        Assert.Equal(3, plan.Ready.Count);
        Assert.Equal(3, plan.Blocking.Count);
    }

    private static void Validate(IReadOnlyList<BulkResolutionItem> items) =>
        BulkResolutionRules.Validate(new BulkResolutionRequest(items), MaxItems);

    private static BulkResolutionItem Create(ImportResolutionKind kind, string sourceKey) =>
        new(kind, sourceKey, BulkResolutionAction.CreateFromValue);

    private static BulkResolutionItem Map(ImportResolutionKind kind, string sourceKey, long targetId) =>
        new(kind, sourceKey, BulkResolutionAction.MapExisting, targetId);

    private static PlannedItem Planned(BulkItemStatus status, int rows, bool createsRecord = false, bool createsAlias = false) =>
        new(Create(ImportResolutionKind.Product, $"dəyər {Guid.NewGuid():N}"), status, "Dəyər", rows, 1,
            null, null, createsRecord, createsAlias, null, null, null);
}
