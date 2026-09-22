using BaxOrders.Domain;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Suppliers;

namespace BaxOrders.UnitTests.Locations;

public sealed class LocationTests
{
    [Fact]
    public void Location_keeps_display_name_and_normalized_name()
    {
        var location = new Location("hem", " H. Ə. M ");

        Assert.Equal("HEM", location.Code);
        Assert.Equal("H. Ə. M", location.Name);
        Assert.Equal("h.ə.m", location.NormalizedName);
        Assert.True(location.IsActive);
    }

    [Fact]
    public void Location_is_deactivated_not_deleted()
    {
        var location = new Location("RAMANA", "Ramana");

        location.Deactivate();

        Assert.False(location.IsActive);
    }

    [Fact]
    public void Supplier_names_with_different_spacing_normalize_equally()
    {
        Assert.Equal(new Supplier(" Cleanfix MMC ").NormalizedName, new Supplier("Cleanfix  MMC").NormalizedName);
    }

    [Fact]
    public void Supplier_code_is_optional()
    {
        Assert.Null(new Supplier("Azclean", code: "  ").Code);
        Assert.Throws<DomainException>(() => new Supplier("Azclean", code: "AZ CLEAN"));
    }
}
