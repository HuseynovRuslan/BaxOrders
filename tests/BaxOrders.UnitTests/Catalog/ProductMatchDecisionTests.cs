using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Orders;
using BaxOrders.UnitTests.TestSupport;

namespace BaxOrders.UnitTests.Catalog;

/// <summary>
/// Brief (Task 13): a match is recorded, never applied to the catalogue; only a person decides it (13.2); a variant
/// stays a separate product (13.1); and "Səhv təsdiq geri alına bilir."
/// </summary>
public sealed class ProductMatchDecisionTests
{
    private static readonly DateTime Now = new(2026, 9, 25, 10, 0, 0, DateTimeKind.Utc);
    private static readonly WorkflowActor Admin = WorkflowActor.User(Guid.NewGuid(), "Administrator");

    [Fact]
    public void A_spelling_match_records_both_variants_and_both_products_and_keeps_the_targets_name()
    {
        var (source, target) = SpellingPair();

        var decision = ProductMatchDecision.ApproveSameItem(source, target, Admin, "  eyni lampa  ", Now);

        Assert.Equal((ProductMatchKind.SameItem, ProductMatchOutcome.Approved), (decision.Kind, decision.Outcome));
        Assert.Equal((source.Id, target.Id), (decision.SourceVariantId!.Value, decision.TargetVariantId!.Value));
        Assert.Equal((source.ProductId, target.ProductId), (decision.SourceProductId, decision.TargetProductId));
        Assert.Null(decision.VariantLabel);
        Assert.Equal("eyni lampa", decision.Reason);
        Assert.Equal((Admin.UserId!.Value, "Administrator", Now), (decision.DecidedByUserId, decision.DecidedByDisplayName, decision.DecidedAtUtc));
        Assert.True(decision.IsLive);
    }

    [Fact]
    public void A_variant_link_records_the_two_products_and_the_label_and_no_variant()
    {
        var (variant, baseProduct) = VariantPair();

        var decision = ProductMatchDecision.ApproveVariant(variant, baseProduct, "  lavanda ətirli ", Admin, null, Now);

        Assert.Equal((ProductMatchKind.Variant, ProductMatchOutcome.Approved), (decision.Kind, decision.Outcome));
        Assert.Equal((variant.Id, baseProduct.Id), (decision.SourceProductId, decision.TargetProductId));
        Assert.Null(decision.SourceVariantId);
        Assert.Null(decision.TargetVariantId);
        Assert.Equal("lavanda ətirli", decision.VariantLabel);
    }

    [Fact]
    public void Deciding_changes_nothing_about_the_products_or_variants_it_names()
    {
        var (variant, baseProduct) = VariantPair();
        var (source, target) = SpellingPair();

        ProductMatchDecision.ApproveVariant(variant, baseProduct, "lavanda ətirli", Admin, null, Now);
        ProductMatchDecision.ApproveSameItem(source, target, Admin, null, Now);

        Assert.Equal(("Sabun elano lavanda ətirli", true), (variant.Name, variant.IsActive));
        Assert.Equal(("Sabun elano", true), (baseProduct.Name, baseProduct.IsActive));
        Assert.True(source.IsActive);
        Assert.True(target.IsActive);
        Assert.Empty(variant.Aliases);
        Assert.Empty(baseProduct.Aliases);
    }

    [Fact]
    public void Rejections_are_recorded_the_same_way_without_a_label()
    {
        var (variant, baseProduct) = VariantPair();
        var (source, target) = SpellingPair();

        var variantRejection = ProductMatchDecision.RejectVariant(variant, baseProduct, Admin, "ayrı maldır", Now);
        var spellingRejection = ProductMatchDecision.RejectSameItem(source, target, Admin, null, Now);

        Assert.Equal((ProductMatchKind.Variant, ProductMatchOutcome.Rejected, (string?)null), (variantRejection.Kind, variantRejection.Outcome, variantRejection.VariantLabel));
        Assert.Equal((ProductMatchKind.SameItem, ProductMatchOutcome.Rejected), (spellingRejection.Kind, spellingRejection.Outcome));
        Assert.Equal(source.Id, spellingRejection.SourceVariantId);
    }

    [Fact]
    public void Nothing_is_matched_with_itself()
    {
        var (source, _) = SpellingPair();
        var (variant, _) = VariantPair();

        Assert.Throws<DomainException>(() => ProductMatchDecision.ApproveSameItem(source, source, Admin, null, Now));
        Assert.Throws<DomainException>(() => ProductMatchDecision.RejectSameItem(source, source, Admin, null, Now));
        Assert.Throws<DomainException>(() => ProductMatchDecision.ApproveVariant(variant, variant, "x", Admin, null, Now));
        Assert.Throws<DomainException>(() => ProductMatchDecision.RejectVariant(variant, variant, Admin, null, Now));
    }

    [Fact]
    public void Two_variants_ordered_in_different_units_are_never_one_item()
    {
        var product = Product(1, "Rezin əlcək");
        var pieces = TestEntities.WithId(product.AddVariant(null, null, null, TestEntities.Pieces()), 11L);
        var packs = TestEntities.WithId(product.AddVariant(null, null, null, TestEntities.Pack()), 12L);

        var refused = Assert.Throws<DomainException>(() => ProductMatchDecision.ApproveSameItem(pieces, packs, Admin, null, Now));
        Assert.Contains("different units", refused.Message);
    }

    [Fact]
    public void Two_unitless_variants_are_the_same_unit()
    {
        var first = Product(1, "Təmir xidməti");
        var second = Product(2, "Təmir  xidməti");
        var a = TestEntities.WithId(first.AddVariant(null, null, null, null), 11L);
        var b = TestEntities.WithId(second.AddVariant(null, null, null, null), 12L);

        var decision = ProductMatchDecision.ApproveSameItem(a, b, Admin, null, Now);

        Assert.Equal(12L, decision.TargetVariantId);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void An_approved_variant_link_needs_a_label(string? label)
    {
        var (variant, baseProduct) = VariantPair();

        Assert.Throws<DomainException>(() => ProductMatchDecision.ApproveVariant(variant, baseProduct, label!, Admin, null, Now));
    }

    [Fact]
    public void A_label_is_at_most_a_hundred_characters()
    {
        var (variant, baseProduct) = VariantPair();

        Assert.Equal(100, ProductMatchDecision.ApproveVariant(variant, baseProduct, new string('a', 100), Admin, null, Now).VariantLabel!.Length);
        Assert.Throws<DomainException>(() => ProductMatchDecision.ApproveVariant(variant, baseProduct, new string('a', 101), Admin, null, Now));
    }

    [Fact]
    public void Only_a_signed_in_person_decides()
    {
        var (source, target) = SpellingPair();

        Assert.Throws<DomainException>(() => ProductMatchDecision.ApproveSameItem(source, target, WorkflowActor.System(), null, Now));
    }

    [Fact]
    public void The_time_is_utc()
    {
        var (source, target) = SpellingPair();

        Assert.Throws<DomainException>(() =>
            ProductMatchDecision.ApproveSameItem(source, target, Admin, null, DateTime.SpecifyKind(Now, DateTimeKind.Local)));
    }

    [Fact]
    public void Undo_fills_in_who_when_and_why_and_keeps_everything_that_was_decided()
    {
        var (variant, baseProduct) = VariantPair();
        var decision = ProductMatchDecision.ApproveVariant(variant, baseProduct, "lavanda ətirli", Admin, "eyni sabun", Now);
        var other = WorkflowActor.User(Guid.NewGuid(), "Başqa admin");

        decision.Undo(other, " səhv idi ", Now.AddHours(1));

        Assert.False(decision.IsLive);
        Assert.Equal((other.UserId, "Başqa admin", Now.AddHours(1), "səhv idi"),
            (decision.UndoneByUserId, decision.UndoneByDisplayName, decision.UndoneAtUtc, decision.UndoReason));
        Assert.Equal(("lavanda ətirli", "eyni sabun", "Administrator"),
            (decision.VariantLabel, decision.Reason, decision.DecidedByDisplayName));
    }

    [Fact]
    public void Undoing_twice_is_refused_and_the_first_undo_stands()
    {
        var (source, target) = SpellingPair();
        var decision = ProductMatchDecision.RejectSameItem(source, target, Admin, null, Now);
        decision.Undo(Admin, null, Now.AddMinutes(5));

        Assert.Throws<DomainException>(() => decision.Undo(Admin, "yenə", Now.AddMinutes(10)));
        Assert.Equal(Now.AddMinutes(5), decision.UndoneAtUtc);
        Assert.Null(decision.UndoReason);
    }

    [Fact]
    public void Undo_is_a_signed_in_persons_too()
    {
        var (source, target) = SpellingPair();
        var decision = ProductMatchDecision.ApproveSameItem(source, target, Admin, null, Now);

        Assert.Throws<DomainException>(() => decision.Undo(WorkflowActor.System(), null, Now));
        Assert.True(decision.IsLive);
    }

    private static Product Product(long id, string name) =>
        TestEntities.WithId(new Product($"PRD-{id:D6}", name), id);

    /// <summary>"Lampa 15 W" and "Lampa 15W", both in pieces.</summary>
    private static (ProductVariant Source, ProductVariant Target) SpellingPair()
    {
        var source = TestEntities.WithId(Product(1, "Lampa 15 W").AddVariant(null, null, null, TestEntities.Pieces()), 11L);
        var target = TestEntities.WithId(Product(2, "Lampa 15W").AddVariant(null, null, null, TestEntities.Pieces()), 12L);
        return (source, target);
    }

    private static (Product Variant, Product Base) VariantPair() =>
        (Product(3, "Sabun elano lavanda ətirli"), Product(4, "Sabun elano"));
}
