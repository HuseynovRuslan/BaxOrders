namespace BaxOrders.Domain.Imports;

public enum ImportStatus
{
    Uploaded = 1,
    Parsing = 2,
    Validating = 3,
    NeedsReview = 4,
    ReadyToImport = 5,
    Imported = 6,
    Failed = 7,
}
