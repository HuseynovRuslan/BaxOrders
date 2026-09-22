namespace BaxOrders.Domain.Imports;

public enum ImportIssueType
{
    UnknownProduct = 1,
    UnknownProductVariant = 2,
    UnknownSupplier = 3,
    UnknownLocation = 4,
    UnknownUnit = 5,
    UnknownCategory = 6,
    UnknownResponsiblePerson = 7,

    /// <summary>The value resolves to more than one record (for example a canonical name and another record's alias).</summary>
    AmbiguousMatch = 8,

    MissingRequiredValue = 10,
    InvalidQuantity = 20,
    InvalidPrice = 21,
    InvalidDate = 22,
    MissingPrice = 23,
    InvalidLineTotal = 24,
    LineTotalMismatch = 30,
    DuplicateRow = 40,
    Other = 99,
}
