using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;

namespace BaxOrders.UnitTests.Catalog;

public sealed class UnitTypeTests
{
    [Fact]
    public void A_square_metre_unit_is_an_area_and_not_something_else()
    {
        // The real workbook orders paint and turf by surface; "Other" would hide what the number means.
        var squareMetre = new UnitOfMeasure("M2", "Kvadrat metr", "m²", UnitType.Area);

        Assert.Equal(UnitType.Area, squareMetre.UnitType);
        Assert.NotEqual(UnitType.Other, squareMetre.UnitType);

        // A surface is not a length: 1 m and 1 m² are different measures, so the types stay apart.
        Assert.NotEqual(UnitType.Length, squareMetre.UnitType);
    }

    [Fact]
    public void Every_defined_unit_type_is_accepted()
    {
        foreach (var unitType in Enum.GetValues<UnitType>())
        {
            var unit = new UnitOfMeasure($"U{(int)unitType}", $"Vahid {(int)unitType}", "v", unitType);
            Assert.Equal(unitType, unit.UnitType);
        }

        Assert.Throws<DomainException>(() => new UnitOfMeasure("X", "Naməlum", "x", (UnitType)0));
    }
}
