using BaxOrders.Domain.Catalog;

namespace BaxOrders.UnitTests.TestSupport;

internal static class TestEntities
{
    /// <summary>Simulates an entity that has been saved and received a database id.</summary>
    public static T WithId<T>(T entity, object id)
        where T : class
    {
        typeof(T).GetProperty("Id")!.SetValue(entity, id);
        return entity;
    }

    public static UnitOfMeasure Pieces() => WithId(new UnitOfMeasure("PCS", "Ədəd", "ədəd", UnitType.Count), 1);

    public static UnitOfMeasure Pack() => WithId(new UnitOfMeasure("PACK", "Paçka", "paçka", UnitType.Package), 2);

    public static UnitOfMeasure Centimeter() => WithId(new UnitOfMeasure("CM", "Santimetr", "sm", UnitType.Length), 4);

    public static UnitOfMeasure Meter() => WithId(new UnitOfMeasure("M", "Metr", "m", UnitType.Length), 5);

    public static UnitOfMeasure Liter() => WithId(new UnitOfMeasure("L", "Litr", "lt", UnitType.Volume), 9);
}
