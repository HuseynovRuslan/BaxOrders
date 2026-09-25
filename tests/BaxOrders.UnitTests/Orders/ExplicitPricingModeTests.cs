using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.Suppliers;
using BaxOrders.UnitTests.TestSupport;

namespace BaxOrders.UnitTests.Orders;

/// <summary>
/// A line can be built with the mode it starts in. An import always says (brief 16: nothing is classified by source);
/// a line built by hand says nothing and keeps the supplier's seed exactly as before.
/// </summary>
public sealed class ExplicitPricingModeTests
{
    private static readonly DateOnly March = new(2026, 3, 1);

    [Theory]
    [InlineData(PricingMode.Unresolved)]
    [InlineData(PricingMode.PriceRequired)]
    [InlineData(PricingMode.InternalFreeSupply)]
    public void A_given_mode_is_used_as_given_for_an_unpriced_line(PricingMode mode)
    {
        var request = new OrderRequest(Mastaga(), March);

        var item = request.AddItem(Shovel(), 3m, null, supplier: null, pricingMode: mode);

        Assert.Equal(mode, item.PricingMode);
    }

    /// <summary>
    /// The case the import exists to stop: a supplier somebody marked as never charging does not decide the line when
    /// the mode is given. Qala anbar holds bought and free material alike.
    /// </summary>
    [Fact]
    public void A_given_mode_wins_over_a_supplier_that_never_charges()
    {
        var request = new OrderRequest(Mastaga(), March);

        var item = request.AddItem(Shovel(), 3m, null, OwnStore(), pricingMode: PricingMode.Unresolved);

        Assert.Equal(PricingMode.Unresolved, item.PricingMode);
        Assert.Equal(OrderLinePricingState.MissingUnclassified, item.PricingState);
        Assert.True(item.IsMissingRequiredPrice);
    }

    [Fact]
    public void A_priced_line_may_start_as_bought()
    {
        var request = new OrderRequest(Mastaga(), March);

        var item = request.AddItem(Shovel(), 3m, 4.5m, OwnStore(), pricingMode: PricingMode.PriceRequired);

        Assert.Equal(PricingMode.PriceRequired, item.PricingMode);
        Assert.Equal(OrderLinePricingState.Priced, item.PricingState);
    }

    [Fact]
    public void A_priced_line_cannot_start_as_supplied_free()
    {
        var request = new OrderRequest(Mastaga(), March);

        var refused = Assert.Throws<DomainException>(() =>
            request.AddItem(Shovel(), 3m, 4.5m, supplier: null, pricingMode: PricingMode.InternalFreeSupply));

        // The same sentence SetPricingMode gives.
        Assert.Equal("This line carries a price, so it cannot be recorded as supplied free of charge.", refused.Message);
        Assert.Empty(request.Items);
    }

    [Fact]
    public void A_mode_the_system_does_not_know_is_refused()
    {
        var request = new OrderRequest(Mastaga(), March);

        Assert.Throws<DomainException>(() => request.AddItem(Shovel(), 3m, null, pricingMode: (PricingMode)99));
    }

    /// <summary>
    /// Without a mode nothing changes for a line built by hand: a supplier that never charges seeds it as supplied
    /// free, any other supplier — or none — as bought. (The integration tests
    /// <c>SupplierPriceRequirementTests.Material_from_the_companys_own_store_is_not_a_missing_price</c> and
    /// <c>An_external_supplier_with_no_price_is_a_missing_price</c> prove the same through the database.)
    /// </summary>
    [Fact]
    public void Without_a_mode_the_supplier_still_seeds_a_line_built_by_hand()
    {
        var request = new OrderRequest(Mastaga(), March);

        Assert.Equal(PricingMode.InternalFreeSupply, request.AddItem(Shovel(), 3m, null, OwnStore()).PricingMode);
        Assert.Equal(PricingMode.PriceRequired, request.AddItem(Shovel(), 3m, null, new Supplier("Cleanfix MMC")).PricingMode);
        Assert.Equal(PricingMode.PriceRequired, request.AddItem(Shovel(), 3m, null).PricingMode);
    }

    private static Supplier OwnStore()
    {
        var store = new Supplier("Qala anbar");
        store.ChangePriceRequirement(SupplierPriceRequirement.NotRequired);
        return store;
    }

    private static Location Mastaga() => new("MASTAGA", "Maştağa");

    private static ProductVariant Shovel() =>
        new Product("PRD-000100", "Lapatka").AddVariant(null, null, null, TestEntities.Pieces());
}
