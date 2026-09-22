using BaxOrders.Domain;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;

namespace BaxOrders.UnitTests.Aliases;

public sealed class AliasTests
{
    [Fact]
    public void Supplier_alias_keeps_the_spelling_and_normalizes_it()
    {
        var alias = new SupplierAlias(new Supplier("Cleanfix MMC"), " Cleanfix ");

        Assert.Equal("Cleanfix", alias.Alias);
        Assert.Equal("cleanfix", alias.NormalizedAlias);
    }

    [Theory]
    [InlineData("CLEANFIX")]
    [InlineData(" cleanfix  ")]
    [InlineData("\"Cleanfix\"")]
    public void Cosmetic_spellings_share_one_normalized_alias_so_the_unique_index_treats_them_as_one(string spelling)
    {
        var supplier = new Supplier("Cleanfix MMC");

        Assert.Equal(
            new SupplierAlias(supplier, "Cleanfix").NormalizedAlias,
            new SupplierAlias(supplier, spelling).NormalizedAlias);
    }

    [Fact]
    public void Location_alias_is_normalized()
    {
        var alias = new LocationAlias(new Location("HEM", "H.Ə.M"), "HƏM ");

        Assert.Equal("həm", alias.NormalizedAlias);
    }

    [Fact]
    public void Responsible_person_alias_is_normalized()
    {
        var alias = new ResponsiblePersonAlias(new ResponsiblePerson("Eldar Məmmədov"), " ELDAR ");

        Assert.Equal("eldar", alias.NormalizedAlias);
    }

    [Fact]
    public void Alias_that_equals_the_canonical_name_is_rejected()
    {
        Assert.Throws<DomainException>(() => new SupplierAlias(new Supplier("Cleanfix MMC"), "cleanfix  mmc"));
        Assert.Throws<DomainException>(() => new LocationAlias(new Location("HEM", "H.Ə.M"), "H. Ə. M"));
        Assert.Throws<DomainException>(() => new ResponsiblePersonAlias(new ResponsiblePerson("Eldar"), "ELDAR"));
    }

    [Fact]
    public void Inactive_targets_cannot_receive_aliases()
    {
        var supplier = new Supplier("Cleanfix MMC");
        supplier.Deactivate();
        var location = new Location("RAMANA", "Ramana");
        location.Deactivate();
        var person = new ResponsiblePerson("Eldar Məmmədov");
        person.Deactivate();

        Assert.Throws<DomainException>(() => new SupplierAlias(supplier, "Cleanfix"));
        Assert.Throws<DomainException>(() => new LocationAlias(location, "Ramana obyekti"));
        Assert.Throws<DomainException>(() => new ResponsiblePersonAlias(person, "Eldar"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\"\"")]
    public void Blank_aliases_are_rejected(string alias)
    {
        Assert.Throws<DomainException>(() => new SupplierAlias(new Supplier("Cleanfix MMC"), alias));
    }
}
