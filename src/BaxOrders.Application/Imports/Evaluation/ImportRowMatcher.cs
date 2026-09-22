using BaxOrders.Application.Imports.Matching;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;

namespace BaxOrders.Application.Imports.Evaluation;

public sealed record MatchingResult(ImportRowMatches Matches, IReadOnlyList<ImportIssueDraft> Issues);

/// <summary>
/// Resolves the identities of one row: location, units, supplier, responsible person, category path, product and
/// variant. A review decision of the batch for a source key wins over catalog lookup; otherwise matching is exact
/// against canonical names and aliases. Every issue produced here has origin <see cref="ImportIssueOrigin.Matching"/>.
/// </summary>
public static class ImportRowMatcher
{
    public static MatchingResult Match(MatchingInput input, ImportCatalog catalog, ImportResolutionSet resolutions)
    {
        var issues = new List<ImportIssueDraft>();

        var location = Resolve(catalog.Locations, resolutions, ImportResolutionKind.Location, input.LocationName);
        ReportRequired(location, input.LocationName, ImportField.Location, ImportIssueType.UnknownLocation, "location", issues);

        var orderUnit = input.OrderUnitExplicitlyEmpty
            ? MatchResult<int>.NotApplicable
            : Resolve(catalog.Units, resolutions, ImportResolutionKind.OrderUnit, input.OrderUnit);
        ReportRequired(orderUnit, input.OrderUnit, ImportField.OrderUnit, ImportIssueType.UnknownUnit, "order unit", issues);

        var specificationUnit = Resolve(catalog.Units, resolutions, ImportResolutionKind.SpecificationUnit, input.SpecificationUnit);
        ReportOptional(specificationUnit, input.SpecificationUnit, ImportField.SpecificationUnit, ImportIssueType.UnknownUnit, "specification unit", issues);

        // A "Vahid" value the review marked as not a unit describes the specification instead of measuring it.
        var descriptor = specificationUnit.Kind == MatchKind.NotApplicable
            ? SpecificationDescriptorNormalizer.Normalize(input.SpecificationUnit)
            : null;

        var supplier = Resolve(catalog.Suppliers, resolutions, ImportResolutionKind.Supplier, input.SupplierName);
        ReportOptional(supplier, input.SupplierName, ImportField.Supplier, ImportIssueType.UnknownSupplier, "supplier", issues);

        var person = Resolve(catalog.ResponsiblePeople, resolutions, ImportResolutionKind.ResponsiblePerson, input.ResponsiblePersonName);
        ReportOptional(person, input.ResponsiblePersonName, ImportField.ResponsiblePerson, ImportIssueType.UnknownResponsiblePerson, "responsible person", issues);

        var categoryId = MatchCategory(catalog, resolutions, input, issues);
        var product = MatchProduct(catalog, resolutions, input, orderUnit, specificationUnit, descriptor, issues);

        return new MatchingResult(
            new ImportRowMatches(
                location.Id, supplier.Id, person.Id, categoryId, product.ProductId, product.VariantId,
                orderUnit.Id, specificationUnit.Id, product.VariantSourceKey, descriptor),
            issues);
    }

    private static MatchResult<int> Resolve(NameIndex<int> index, ImportResolutionSet resolutions, ImportResolutionKind kind, string? sourceText)
    {
        var key = ImportSourceKeys.Name(sourceText);
        if (key is null)
        {
            return MatchResult<int>.Blank;
        }

        if (resolutions.IsNotAUnit(kind, key))
        {
            return MatchResult<int>.NotApplicable;
        }

        return resolutions.TryGetTarget(kind, key, out var targetId)
            ? MatchResult<int>.Matched((int)targetId)
            : index.ResolveNormalized(key);
    }

    /// <summary>Location and order unit: missing, unknown and ambiguous values are all errors.</summary>
    private static void ReportRequired(
        MatchResult<int> match, string? text, ImportField field, ImportIssueType unknownType, string label, List<ImportIssueDraft> issues)
    {
        switch (match.Kind)
        {
            case MatchKind.NotApplicable:
                break;
            case MatchKind.Blank:
                issues.Add(Issue(ImportIssueType.MissingRequiredValue, IssueSeverity.Error, field, $"The {label} is missing."));
                break;
            case MatchKind.Unknown:
                issues.Add(Issue(unknownType, IssueSeverity.Error, field, $"Unknown {label} '{text!.Trim()}'."));
                break;
            case MatchKind.Ambiguous:
                issues.Add(Ambiguity(IssueSeverity.Error, field, label, text!, match.Candidates));
                break;
        }
    }

    /// <summary>Optional identities: blank is fine; unknown and ambiguous values are warnings.</summary>
    private static void ReportOptional(
        MatchResult<int> match, string? text, ImportField field, ImportIssueType unknownType, string label, List<ImportIssueDraft> issues)
    {
        if (match.Kind == MatchKind.Unknown)
        {
            issues.Add(Issue(unknownType, IssueSeverity.Warning, field, $"Unknown {label} '{text!.Trim()}'."));
        }
        else if (match.Kind == MatchKind.Ambiguous)
        {
            issues.Add(Ambiguity(IssueSeverity.Warning, field, label, text!, match.Candidates));
        }
    }

    private static int? MatchCategory(ImportCatalog catalog, ImportResolutionSet resolutions, MatchingInput input, List<ImportIssueDraft> issues)
    {
        var key = ImportSourceKeys.CategoryPath(input.MainCategory, input.MiddleCategory, input.SubCategory);
        if (key is null)
        {
            return null;
        }

        if (resolutions.TryGetTarget(ImportResolutionKind.CategoryPath, key, out var categoryId))
        {
            return (int)categoryId;
        }

        var match = catalog.Categories.Resolve(input.MainCategory, input.MiddleCategory, input.SubCategory);
        if (match.Kind == MatchKind.Unknown)
        {
            var levels = new[] { input.MainCategory, input.MiddleCategory, input.SubCategory };
            var path = string.Join(" → ", levels.Select(level => string.IsNullOrWhiteSpace(level) ? "(blank)" : level.Trim()));
            issues.Add(new ImportIssueDraft(ImportIssueType.UnknownCategory, IssueSeverity.Warning, ImportIssueOrigin.Matching,
                "Kateqoriya", $"Category path '{path}' is not in the catalog."));
        }

        return match.Id;
    }

    /// <summary>
    /// Resolves the product, then the variant. A variant identity is built only from canonical values: the resolved
    /// product and the resolved unit codes. While a unit is unresolved the variant stays unknown on purpose, and the
    /// issue says which decision is missing — raw cell text never creates a variant.
    /// </summary>
    private static (long? ProductId, long? VariantId, string? VariantSourceKey) MatchProduct(
        ImportCatalog catalog,
        ImportResolutionSet resolutions,
        MatchingInput input,
        MatchResult<int> orderUnit,
        MatchResult<int> specificationUnit,
        string? specificationDescriptor,
        List<ImportIssueDraft> issues)
    {
        var productKey = ImportSourceKeys.Name(input.ProductName);
        if (productKey is null)
        {
            return (null, null, null);
        }

        long productId;
        if (resolutions.TryGetTarget(ImportResolutionKind.Product, productKey, out var decidedProductId))
        {
            productId = decidedProductId;
        }
        else
        {
            var product = catalog.Products.ResolveNormalized(productKey);
            switch (product.Kind)
            {
                case MatchKind.Unknown:
                    issues.Add(Issue(ImportIssueType.UnknownProduct, IssueSeverity.Warning, ImportField.ProductName,
                        $"Product '{input.ProductName!.Trim()}' is not in the catalog."));
                    return (null, null, null);
                case MatchKind.Ambiguous:
                    issues.Add(Ambiguity(IssueSeverity.Error, ImportField.ProductName, "product", input.ProductName!, product.Candidates));
                    return (null, null, null);
            }

            productId = product.Id!.Value;
        }

        string? orderUnitCode = null;
        if (orderUnit.Kind != MatchKind.NotApplicable
            && (orderUnit.Id is not { } orderUnitId || !catalog.TryGetUnitCode(orderUnitId, out orderUnitCode)))
        {
            issues.Add(Issue(ImportIssueType.UnknownProductVariant, IssueSeverity.Warning, ImportField.OrderUnit,
                "The product variant cannot be determined until the order unit (Ö/v) is resolved."));
            return (productId, null, null);
        }

        string? specificationUnitCode = null;
        if (specificationUnit.Kind is MatchKind.Unknown or MatchKind.Ambiguous
            || (specificationUnit.Id is { } specificationUnitId && !catalog.TryGetUnitCode(specificationUnitId, out specificationUnitCode)))
        {
            issues.Add(Issue(ImportIssueType.UnknownProductVariant, IssueSeverity.Warning, ImportField.SpecificationUnit,
                "The product variant cannot be determined until the specification unit (Vahid) is resolved."));
            return (productId, null, null);
        }

        string variantKey;
        try
        {
            variantKey = ProductVariantKey.Create(
                input.SpecificationValue, specificationUnitCode, input.ModelCode, orderUnitCode, specificationDescriptor);
        }
        catch (DomainException exception)
        {
            issues.Add(Issue(ImportIssueType.Other, IssueSeverity.Warning, ImportField.SpecificationValue, exception.Message));
            return (productId, null, null);
        }

        var variantSourceKey = ImportSourceKeys.ProductVariant(productId, variantKey);

        if (resolutions.TryGetTarget(ImportResolutionKind.ProductVariant, variantSourceKey, out var decidedVariantId))
        {
            return (productId, decidedVariantId, variantSourceKey);
        }

        if (catalog.FindVariant(productId, variantKey) is { } variantId)
        {
            return (productId, variantId, variantSourceKey);
        }

        issues.Add(Issue(ImportIssueType.UnknownProductVariant, IssueSeverity.Warning, ImportField.ProductName,
            $"The product has no variant matching {variantKey}."));
        return (productId, null, variantSourceKey);
    }

    private static ImportIssueDraft Ambiguity<TId>(IssueSeverity severity, ImportField field, string label, string text, IReadOnlyList<TId> candidates)
        where TId : struct =>
        Issue(ImportIssueType.AmbiguousMatch, severity, field,
            $"'{text.Trim()}' matches {candidates.Count} different {label} records (ids {string.Join(", ", candidates)}); choose one during review.");

    private static ImportIssueDraft Issue(ImportIssueType type, IssueSeverity severity, ImportField field, string message) =>
        new(type, severity, ImportIssueOrigin.Matching, ImportHeaders.ExpectedHeaders[field], message);
}
