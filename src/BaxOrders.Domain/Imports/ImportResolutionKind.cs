namespace BaxOrders.Domain.Imports;

/// <summary>The kind of distinct source value an import resolution decides.</summary>
public enum ImportResolutionKind
{
    Location = 1,
    Supplier = 2,
    ResponsiblePerson = 3,
    OrderUnit = 4,
    SpecificationUnit = 5,
    CategoryPath = 6,

    /// <summary>Reserved for product review (Task 3B).</summary>
    Product = 7,

    /// <summary>Reserved for product review (Task 3B).</summary>
    ProductVariant = 8,
}

public enum ResolutionScope
{
    /// <summary>The decision applies to this import batch only.</summary>
    BatchOnly = 1,

    /// <summary>The decision applies to this batch and is saved as an alias for future imports.</summary>
    GlobalAlias = 2,
}

public enum ResolutionAction
{
    MapExisting = 1,
    CreateNew = 2,

    /// <summary>
    /// The operator confirmed the value is not a unit of measure at all. In the "Vahid" column it is a
    /// specification descriptor ("diş", "qat", "lik"); in the "Ö/v" column it means the line has no order unit.
    /// No <see cref="UnitOfMeasure"/> is created and no alias is written.
    /// </summary>
    MarkNotAUnit = 3,
}

/// <summary>Which processing step produced an import issue, so a step can be re-run without touching the others.</summary>
public enum ImportIssueOrigin
{
    /// <summary>Reading cells: quantities, prices, dates, totals, cell types and lengths.</summary>
    Parsing = 1,

    /// <summary>Resolving identities: locations, suppliers, people, units, categories, products, variants.</summary>
    Matching = 2,

    /// <summary>Business rules on parsed values, such as a missing product name or a total mismatch.</summary>
    Validation = 3,

    DuplicateDetection = 4,

    /// <summary>
    /// Reading the workbook itself, before any value was interpreted: a cell too long for its staging column.
    /// Such an issue cannot be produced again from staged text, so re-evaluating a row keeps it.
    /// </summary>
    Staging = 5,
}
