using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace BaxOrders.Application.Abstractions;

/// <summary>
/// The application's view of the database. Use cases query and change entities through these sets
/// directly; there is deliberately no generic repository or unit-of-work layer on top of EF Core.
/// The interface exists only so Application does not depend on Infrastructure.
/// </summary>
public interface IBaxOrdersDbContext
{
    DbSet<Location> Locations { get; }

    DbSet<LocationAlias> LocationAliases { get; }

    DbSet<Category> Categories { get; }

    DbSet<UnitOfMeasure> UnitsOfMeasure { get; }

    DbSet<UnitOfMeasureAlias> UnitOfMeasureAliases { get; }

    DbSet<Product> Products { get; }

    DbSet<ProductAlias> ProductAliases { get; }

    DbSet<ProductVariant> ProductVariants { get; }

    /// <summary>Every decision about a product's canonical category. Append-only.</summary>
    DbSet<ProductCategoryDecision> ProductCategoryDecisions { get; }

    DbSet<Supplier> Suppliers { get; }

    DbSet<SupplierAlias> SupplierAliases { get; }

    /// <summary>Append-only record of who changed a supplier's price requirement, and when.</summary>
    DbSet<SupplierPricingDecision> SupplierPricingDecisions { get; }

    DbSet<ResponsiblePerson> ResponsiblePeople { get; }

    DbSet<ResponsiblePersonAlias> ResponsiblePersonAliases { get; }

    DbSet<OrderRequest> OrderRequests { get; }

    DbSet<OrderRequestItem> OrderRequestItems { get; }

    DbSet<OrderRequestWorkflowEvent> OrderRequestWorkflowEvents { get; }

    /// <summary>Which returned version each correction version was made from. One per source, one per correction.</summary>
    DbSet<OrderRequestRevision> OrderRequestRevisions { get; }

    /// <summary>Every change made to the lines of a correction version. Append-only.</summary>
    DbSet<OrderRequestEditEvent> OrderRequestEditEvents { get; }

    DbSet<ImportBatch> ImportBatches { get; }

    DbSet<ImportRow> ImportRows { get; }

    DbSet<ImportRowIssue> ImportRowIssues { get; }

    DbSet<ImportRowCorrection> ImportRowCorrections { get; }

    DbSet<ImportResolution> ImportResolutions { get; }

    /// <summary>One record per import batch that became permanent orders.</summary>
    DbSet<ImportMaterialization> ImportMaterializations { get; }

    DbSet<ImportMaterializationGroup> ImportMaterializationGroups { get; }

    /// <summary>The link from one staged row to the one permanent item it became.</summary>
    DbSet<ImportRowMaterialization> ImportRowMaterializations { get; }

    ChangeTracker ChangeTracker { get; }

    /// <summary>Transactions and row locks for multi-step use cases such as import review decisions.</summary>
    DatabaseFacade Database { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
