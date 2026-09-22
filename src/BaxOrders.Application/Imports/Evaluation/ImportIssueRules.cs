using BaxOrders.Domain.Imports;

namespace BaxOrders.Application.Imports.Evaluation;

public sealed record ImportIssueDraft(
    ImportIssueType IssueType,
    IssueSeverity Severity,
    ImportIssueOrigin Origin,
    string? FieldName,
    string Message,
    long? SuggestedEntityId = null);

public static class ImportIssueRules
{
    /// <summary>Largest accepted difference between the Excel total (Cəmi) and quantity × unit price, in AZN.</summary>
    public const decimal LineTotalTolerance = 0.01m;

    /// <summary>Warnings that still block import: an order request item needs a resolved product variant.</summary>
    public static readonly IReadOnlyList<ImportIssueType> BlockingWarningTypes =
        [ImportIssueType.UnknownProduct, ImportIssueType.UnknownProductVariant];

    /// <summary>
    /// A blocking issue keeps a row from becoming an order request item: every Error, and an unresolved product
    /// or product variant. A batch with any blocking issue needs review.
    /// Severity alone decides the row status (Valid / NeedsReview / Invalid).
    /// </summary>
    public static bool IsBlocking(ImportIssueType issueType, IssueSeverity severity) =>
        severity == IssueSeverity.Error || BlockingWarningTypes.Contains(issueType);
}
