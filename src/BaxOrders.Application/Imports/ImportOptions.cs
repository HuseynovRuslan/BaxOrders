namespace BaxOrders.Application.Imports;

public sealed class ImportOptions
{
    public const string SectionName = "Imports";

    /// <summary>Largest accepted upload. Defaults to 20 MB.</summary>
    public long MaxUploadBytes { get; set; } = 20 * 1024 * 1024;

    /// <summary>How many rows at the top of each sheet are searched for the header row.</summary>
    public int HeaderSearchRowLimit { get; set; } = 30;

    /// <summary>
    /// How many distinct values one bulk review operation may carry. It keeps a single decision reviewable by a
    /// person, keeps the set-based queries inside SQL Server's parameter limits, and bounds one transaction.
    /// </summary>
    public int MaxBulkResolutionItems { get; set; } = 150;
}
