namespace BaxOrders.Domain.Imports;

/// <summary>
/// One problem found on a staged row. Severity decides whether the row can proceed; origin records which
/// processing step produced it, so that step can be re-run without touching other issues.
/// </summary>
public sealed class ImportRowIssue
{
    public const int FieldNameMaxLength = 100;
    public const int MessageMaxLength = 1000;

    private ImportRowIssue()
    {
    }

    internal ImportRowIssue(
        ImportRow importRow,
        ImportIssueType issueType,
        IssueSeverity severity,
        ImportIssueOrigin origin,
        string message,
        string? fieldName,
        long? suggestedEntityId)
    {
        if (suggestedEntityId is <= 0)
        {
            throw new DomainException("Suggested entity id must be positive.");
        }

        ImportRow = importRow;
        ImportRowId = importRow.Id;
        IssueType = Guard.DefinedEnum(issueType, nameof(IssueType));
        Severity = Guard.DefinedEnum(severity, nameof(Severity));
        Origin = Guard.DefinedEnum(origin, nameof(Origin));
        Message = Guard.RequiredText(message, MessageMaxLength, nameof(Message));
        FieldName = Guard.OptionalText(fieldName, FieldNameMaxLength, nameof(FieldName));
        SuggestedEntityId = suggestedEntityId;
    }

    public long Id { get; private set; }

    public long ImportRowId { get; private set; }

    public ImportRow ImportRow { get; private set; } = null!;

    public ImportIssueType IssueType { get; private set; }

    public IssueSeverity Severity { get; private set; }

    public ImportIssueOrigin Origin { get; private set; }

    public string? FieldName { get; private set; }

    public string Message { get; private set; } = null!;

    /// <summary>
    /// Id of a candidate entity for manual confirmation. The entity type follows from <see cref="IssueType"/>
    /// (for example a product for <see cref="ImportIssueType.UnknownProduct"/>). Never applied automatically.
    /// </summary>
    public long? SuggestedEntityId { get; private set; }

    public DateTime CreatedAtUtc { get; private set; }
}
