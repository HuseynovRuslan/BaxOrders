using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Infrastructure.Persistence;

public sealed class BaxOrdersDbContext(DbContextOptions<BaxOrdersDbContext> options)
    : DbContext(options), IBaxOrdersDbContext
{
    private const int EnumMaxLength = 32;

    public DbSet<Location> Locations => Set<Location>();

    public DbSet<LocationAlias> LocationAliases => Set<LocationAlias>();

    public DbSet<Category> Categories => Set<Category>();

    public DbSet<UnitOfMeasure> UnitsOfMeasure => Set<UnitOfMeasure>();

    public DbSet<UnitOfMeasureAlias> UnitOfMeasureAliases => Set<UnitOfMeasureAlias>();

    public DbSet<Product> Products => Set<Product>();

    public DbSet<ProductAlias> ProductAliases => Set<ProductAlias>();

    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();

    public DbSet<Supplier> Suppliers => Set<Supplier>();

    public DbSet<SupplierAlias> SupplierAliases => Set<SupplierAlias>();

    public DbSet<ResponsiblePerson> ResponsiblePeople => Set<ResponsiblePerson>();

    public DbSet<ResponsiblePersonAlias> ResponsiblePersonAliases => Set<ResponsiblePersonAlias>();

    public DbSet<OrderRequest> OrderRequests => Set<OrderRequest>();

    public DbSet<OrderRequestItem> OrderRequestItems => Set<OrderRequestItem>();

    public DbSet<ImportBatch> ImportBatches => Set<ImportBatch>();

    public DbSet<ImportRow> ImportRows => Set<ImportRow>();

    public DbSet<ImportRowIssue> ImportRowIssues => Set<ImportRowIssue>();

    public DbSet<ImportRowCorrection> ImportRowCorrections => Set<ImportRowCorrection>();

    public DbSet<ImportResolution> ImportResolutions => Set<ImportResolution>();

    public DbSet<ImportMaterialization> ImportMaterializations => Set<ImportMaterialization>();

    public DbSet<ImportMaterializationGroup> ImportMaterializationGroups => Set<ImportMaterializationGroup>();

    public DbSet<ImportRowMaterialization> ImportRowMaterializations => Set<ImportRowMaterialization>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasSequence<long>(SqlServerProductCodeGenerator.SequenceName).StartsAt(1).IncrementsBy(1);
        modelBuilder.HasSequence<long>(SqlServerLocationCodeGenerator.SequenceName).StartsAt(1).IncrementsBy(1);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BaxOrdersDbContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Technical timestamps are UTC; make values read back from SQL Server carry DateTimeKind.Utc.
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<UtcDateTimeConverter>();

        // Enums are stored by name so the database stays readable for reporting and support.
        StoreAsString<UnitType>(configurationBuilder);
        StoreAsString<OrderRequestStatus>(configurationBuilder);
        StoreAsString<ImportStatus>(configurationBuilder);
        StoreAsString<ImportRowValidationStatus>(configurationBuilder);
        StoreAsString<ImportIssueType>(configurationBuilder);
        StoreAsString<IssueSeverity>(configurationBuilder);
        StoreAsString<ImportIssueOrigin>(configurationBuilder);
        StoreAsString<ImportResolutionKind>(configurationBuilder);
        StoreAsString<ResolutionScope>(configurationBuilder);
        StoreAsString<ResolutionAction>(configurationBuilder);
        StoreAsString<MaterializationAction>(configurationBuilder);
        StoreAsString<ImportCorrectionField>(configurationBuilder);
    }

    private static void StoreAsString<TEnum>(ModelConfigurationBuilder configurationBuilder)
        where TEnum : struct, Enum =>
        configurationBuilder.Properties<TEnum>().HaveConversion<string>().HaveMaxLength(EnumMaxLength);
}
