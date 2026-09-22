using BaxOrders.Domain;
using BaxOrders.Domain.Imports;

namespace BaxOrders.UnitTests.Imports;

public sealed class ImportResolutionTests
{
    [Fact]
    public void Decision_stores_the_target_of_its_kind()
    {
        var supplier = new ImportResolution(7, ImportResolutionKind.Supplier, "cleanfix", ResolutionScope.GlobalAlias, ResolutionAction.MapExisting, 12);

        Assert.Equal(12, supplier.SupplierId);
        Assert.Equal(12, supplier.TargetId);
        Assert.Null(supplier.LocationId);
        Assert.Equal(ImportSourceKeys.Hash("cleanfix"), supplier.SourceKeyHash);
    }

    [Theory]
    [InlineData(ImportResolutionKind.Location)]
    [InlineData(ImportResolutionKind.ResponsiblePerson)]
    [InlineData(ImportResolutionKind.OrderUnit)]
    [InlineData(ImportResolutionKind.SpecificationUnit)]
    [InlineData(ImportResolutionKind.CategoryPath)]
    [InlineData(ImportResolutionKind.Product)]
    [InlineData(ImportResolutionKind.ProductVariant)]
    public void Every_kind_sets_exactly_one_target(ImportResolutionKind kind)
    {
        var resolution = new ImportResolution(7, kind, "key", ResolutionScope.BatchOnly, ResolutionAction.MapExisting, 5);

        var targets = new long?[]
        {
            resolution.LocationId, resolution.SupplierId, resolution.ResponsiblePersonId, resolution.UnitOfMeasureId,
            resolution.CategoryId, resolution.ProductId, resolution.ProductVariantId,
        };

        Assert.Single(targets, target => target is not null);
        Assert.Equal(5, resolution.TargetId);
    }

    [Fact]
    public void Category_paths_cannot_become_global_aliases()
    {
        Assert.Throws<DomainException>(() =>
            new ImportResolution(7, ImportResolutionKind.CategoryPath, "təmizlik|əlcək", ResolutionScope.GlobalAlias, ResolutionAction.MapExisting, 3));

        var batchOnly = new ImportResolution(7, ImportResolutionKind.CategoryPath, "təmizlik|əlcək", ResolutionScope.BatchOnly, ResolutionAction.MapExisting, 3);
        Assert.Throws<DomainException>(batchOnly.PromoteToGlobalAlias);
    }

    [Fact]
    public void Promoting_a_batch_decision_records_the_alias_scope()
    {
        var resolution = new ImportResolution(7, ImportResolutionKind.Supplier, "cleanfix", ResolutionScope.BatchOnly, ResolutionAction.MapExisting, 12);

        resolution.PromoteToGlobalAlias();

        Assert.Equal(ResolutionScope.GlobalAlias, resolution.Scope);
    }

    [Theory]
    [InlineData(0, "key", 5)]
    [InlineData(7, "", 5)]
    [InlineData(7, "key", 0)]
    [InlineData(7, "key", -1)]
    public void Incomplete_decisions_are_rejected(long importBatchId, string sourceKey, long targetId)
    {
        Assert.Throws<DomainException>(() =>
            new ImportResolution(importBatchId, ImportResolutionKind.Supplier, sourceKey, ResolutionScope.BatchOnly, ResolutionAction.MapExisting, targetId));
    }

    [Fact]
    public void An_oversized_source_key_is_rejected()
    {
        var key = new string('x', ImportResolution.SourceKeyMaxLength + 1);

        Assert.Throws<DomainException>(() =>
            new ImportResolution(7, ImportResolutionKind.Supplier, key, ResolutionScope.BatchOnly, ResolutionAction.MapExisting, 1));
    }
}
