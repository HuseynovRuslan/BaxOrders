using BaxOrders.Application.Common;
using BaxOrders.Domain.Imports;

namespace BaxOrders.Application.Imports.Review;

/// <summary>
/// What a bulk request must look like before the database is touched at all. These rules decide what an operator
/// may do in bulk — and, just as importantly, what only a person can decide one value at a time.
/// </summary>
public static class BulkResolutionRules
{
    /// <summary>
    /// Kinds whose value is the name of the record itself, so "create it as the sheet spells it" is a decision an
    /// operator can take for a whole selection. Units and category paths are deliberately missing: a unit needs a
    /// code, a symbol and a type, and a category path is a hierarchy — neither can be read off the cell text.
    /// </summary>
    public static readonly IReadOnlySet<ImportResolutionKind> CreatableInBulk = new HashSet<ImportResolutionKind>
    {
        ImportResolutionKind.Location,
        ImportResolutionKind.Supplier,
        ImportResolutionKind.ResponsiblePerson,
        ImportResolutionKind.Product,
        ImportResolutionKind.ProductVariant,
    };

    public static void Validate(BulkResolutionRequest request, int maxItems)
    {
        var items = request.Items ?? [];
        if (items.Count == 0)
        {
            throw new ValidationException("Select at least one value.");
        }

        if (items.Count > maxItems)
        {
            throw new ValidationException(
                $"A bulk operation carries at most {maxItems} values, but {items.Count} were sent. Apply them in smaller sets so each one stays reviewable.");
        }

        var seen = new HashSet<(ImportResolutionKind Kind, string SourceKey)>();
        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.SourceKey))
            {
                throw new ValidationException("Every item needs a source value.");
            }

            if (!seen.Add((item.Kind, item.SourceKey)))
            {
                throw new ValidationException($"'{item.SourceKey}' appears twice in the request; one value can hold only one decision.");
            }

            switch (item.Action)
            {
                case BulkResolutionAction.MapExisting when item.TargetId is not > 0:
                    throw new ValidationException($"'{item.SourceKey}' is mapped to an existing record, so it needs a target.");

                case BulkResolutionAction.CreateFromValue when item.TargetId is not null:
                    throw new ValidationException($"'{item.SourceKey}' creates a new record, so it must not carry a target.");

                case BulkResolutionAction.CreateFromValue when !CreatableInBulk.Contains(item.Kind):
                    throw new ValidationException(CannotCreateInBulk(item.Kind));
            }

            if (item.Scope == ResolutionScope.GlobalAlias
                && item.Kind is ImportResolutionKind.CategoryPath or ImportResolutionKind.ProductVariant)
            {
                throw new ValidationException($"A {item.Kind} decision cannot be saved as a global alias; it applies to this import only.");
            }
        }
    }

    private static string CannotCreateInBulk(ImportResolutionKind kind) => kind switch
    {
        ImportResolutionKind.OrderUnit or ImportResolutionKind.SpecificationUnit =>
            "A unit needs a code, a name, a symbol and a type, and only a person knows what 'kv.m' or 'top' means. "
            + "Map these values to existing units, or create the unit in the single-value dialog.",
        ImportResolutionKind.CategoryPath =>
            "A category path is a hierarchy, so it is created one path at a time. Map these values to existing categories instead.",
        _ => $"{kind} values cannot be created in bulk.",
    };
}
