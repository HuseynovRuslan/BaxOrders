namespace BaxOrders.Domain.Catalog;

/// <summary>
/// Physical nature of a unit. Informational only: it does not imply that units of the same
/// type can be converted into each other (a pack is not a fixed number of pieces).
/// </summary>
public enum UnitType
{
    Count = 1,
    Length = 2,
    Mass = 3,
    Volume = 4,
    Package = 5,
    Pair = 6,

    /// <summary>Surface, such as square metres. Kept separate from Length: 1 m and 1 m² are not the same measure.</summary>
    Area = 7,

    Other = 99,
}
