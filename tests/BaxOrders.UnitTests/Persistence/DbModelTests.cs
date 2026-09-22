using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;
using BaxOrders.Infrastructure.Persistence;
using BaxOrders.UnitTests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;

namespace BaxOrders.UnitTests.Persistence;

/// <summary>
/// Verifies the EF Core model without a database. The connection string is never opened.
/// </summary>
public sealed class DbModelTests : IDisposable
{
    private readonly BaxOrdersDbContext _context = new(
        new DbContextOptionsBuilder<BaxOrdersDbContext>()
            .UseSqlServer("Server=model-only;Database=model-only;Integrated Security=true")
            .AddInterceptors(new AuditingSaveChangesInterceptor(TimeProvider.System))
            .Options);

    public void Dispose() => _context.Dispose();

    [Fact]
    public void Model_matches_the_latest_migration()
    {
        Assert.False(_context.Database.HasPendingModelChanges(), "Run 'dotnet ef migrations add' for model changes.");
    }

    [Theory]
    [InlineData(typeof(OrderRequestItem), typeof(ProductVariant))]
    [InlineData(typeof(OrderRequestItem), typeof(Supplier))]
    [InlineData(typeof(OrderRequest), typeof(Location))]
    [InlineData(typeof(ProductVariant), typeof(Product))]
    [InlineData(typeof(ProductVariant), typeof(UnitOfMeasure))]
    [InlineData(typeof(Product), typeof(Category))]
    [InlineData(typeof(Category), typeof(Category))]
    [InlineData(typeof(ImportRow), typeof(Product))]
    [InlineData(typeof(LocationAlias), typeof(Location))]
    [InlineData(typeof(SupplierAlias), typeof(Supplier))]
    [InlineData(typeof(ResponsiblePersonAlias), typeof(ResponsiblePerson))]
    [InlineData(typeof(OrderRequestEditEvent), typeof(ProductVariant))]
    // A reviewed version is never deleted while a correction descends from it.
    [InlineData(typeof(OrderRequestItem), typeof(OrderRequestItem))]
    [InlineData(typeof(OrderRequestRevision), typeof(OrderRequest))]
    public void Deleting_reference_data_never_cascades_into_history(Type dependent, Type principal)
    {
        var foreignKeys = Entity(dependent).GetForeignKeys()
            .Where(foreignKey => foreignKey.PrincipalEntityType.ClrType == principal)
            .ToList();

        Assert.NotEmpty(foreignKeys);
        Assert.All(foreignKeys, foreignKey => Assert.Equal(DeleteBehavior.Restrict, foreignKey.DeleteBehavior));
    }

    [Theory]
    [InlineData(typeof(Location), nameof(Location.Code))]
    [InlineData(typeof(Location), nameof(Location.NormalizedName))]
    [InlineData(typeof(Supplier), nameof(Supplier.NormalizedName))]
    [InlineData(typeof(ResponsiblePerson), nameof(ResponsiblePerson.NormalizedName))]
    [InlineData(typeof(Product), nameof(Product.Code))]
    [InlineData(typeof(ProductAlias), nameof(ProductAlias.NormalizedAlias))]
    [InlineData(typeof(UnitOfMeasure), nameof(UnitOfMeasure.Code))]
    [InlineData(typeof(UnitOfMeasureAlias), nameof(UnitOfMeasureAlias.NormalizedAlias))]
    [InlineData(typeof(LocationAlias), nameof(LocationAlias.NormalizedAlias))]
    [InlineData(typeof(SupplierAlias), nameof(SupplierAlias.NormalizedAlias))]
    [InlineData(typeof(ResponsiblePersonAlias), nameof(ResponsiblePersonAlias.NormalizedAlias))]
    public void Identity_columns_are_unique(Type entity, string propertyName)
    {
        Assert.True(Index(entity, propertyName).IsUnique);
    }

    [Fact]
    public void Product_names_are_indexed_but_not_unique()
    {
        Assert.False(Index(typeof(Product), nameof(Product.NormalizedName)).IsUnique);
    }

    [Fact]
    public void Variant_key_is_unique_per_product()
    {
        Assert.True(Index(typeof(ProductVariant), nameof(ProductVariant.ProductId), nameof(ProductVariant.NormalizedVariantKey)).IsUnique);
    }

    [Fact]
    public void Request_version_identity_is_unique()
    {
        var index = Index(
            typeof(OrderRequest),
            nameof(OrderRequest.LocationId),
            nameof(OrderRequest.RequestPeriod),
            nameof(OrderRequest.Version));

        Assert.True(index.IsUnique);
    }

    [Fact]
    public void A_returned_version_is_corrected_at_most_once_and_a_correction_has_one_source()
    {
        Assert.True(Index(typeof(OrderRequestRevision), nameof(OrderRequestRevision.SourceOrderRequestId)).IsUnique);
        Assert.True(Index(typeof(OrderRequestRevision), nameof(OrderRequestRevision.RevisionOrderRequestId)).IsUnique);
    }

    [Fact]
    public void The_edit_history_outlives_the_lines_it_describes()
    {
        // A line removed from a draft is deleted; a foreign key from its history would either block that or
        // take the history with it.
        var toItems = Entity(typeof(OrderRequestEditEvent)).GetForeignKeys()
            .Where(foreignKey => foreignKey.PrincipalEntityType.ClrType == typeof(OrderRequestItem));

        Assert.Empty(toItems);
    }

    [Fact]
    public void Product_codes_come_from_a_database_sequence()
    {
        var sequence = DesignTimeModel().FindSequence(SqlServerProductCodeGenerator.SequenceName);

        Assert.NotNull(sequence);
        Assert.Equal(typeof(long), sequence.Type);
        Assert.Equal(1, sequence.StartValue);
        Assert.Equal(1, sequence.IncrementBy);
        Assert.False(sequence.IsCyclic);
    }

    [Fact]
    public void Quantities_and_prices_have_explicit_precision()
    {
        var item = Entity(typeof(OrderRequestItem));
        var quantity = item.FindProperty(nameof(OrderRequestItem.Quantity))!;
        var unitPrice = item.FindProperty(nameof(OrderRequestItem.UnitPrice))!;

        Assert.Equal((18, 3), (quantity.GetPrecision(), quantity.GetScale()));
        Assert.Equal((18, 4), (unitPrice.GetPrecision(), unitPrice.GetScale()));
    }

    [Fact]
    public void Line_total_is_not_stored()
    {
        Assert.Null(Entity(typeof(OrderRequestItem)).FindProperty(nameof(OrderRequestItem.LineTotal)));
    }

    [Fact]
    public void Reference_data_is_seeded()
    {
        var model = DesignTimeModel();

        Assert.Equal(11, model.FindEntityType(typeof(UnitOfMeasure))!.GetSeedData().Count());
        Assert.Equal(25, model.FindEntityType(typeof(UnitOfMeasureAlias))!.GetSeedData().Count());
        Assert.Equal(4, model.FindEntityType(typeof(Location))!.GetSeedData().Count());
        Assert.Single(model.FindEntityType(typeof(LocationAlias))!.GetSeedData());
    }

    [Fact]
    public void Heyder_Aliyev_Center_is_seeded_with_its_abbreviation_as_an_alias()
    {
        var model = DesignTimeModel();
        var center = model.FindEntityType(typeof(Location))!.GetSeedData().Single(row => (string)row["Code"]! == "HEM");
        var alias = Assert.Single(model.FindEntityType(typeof(LocationAlias))!.GetSeedData());

        Assert.Equal("Heydər Əliyev Mərkəzi", center["Name"]);
        Assert.Equal(center["Id"], alias["LocationId"]);
        Assert.Equal("H.Ə.M", alias["Alias"]);
        Assert.Equal("h.ə.m", alias["NormalizedAlias"]);
    }

    [Fact]
    public void Request_date_is_optional_and_request_period_is_required()
    {
        var request = Entity(typeof(OrderRequest));

        Assert.True(request.FindProperty(nameof(OrderRequest.RequestDate))!.IsNullable);
        Assert.False(request.FindProperty(nameof(OrderRequest.RequestPeriod))!.IsNullable);
    }

    [Fact]
    public void Seeded_unit_aliases_are_unique_and_point_at_the_intended_units()
    {
        var model = DesignTimeModel();
        var unitIdByCode = model.FindEntityType(typeof(UnitOfMeasure))!.GetSeedData()
            .ToDictionary(row => (string)row["Code"]!, row => (int)row["Id"]!);
        var aliases = model.FindEntityType(typeof(UnitOfMeasureAlias))!.GetSeedData().ToList();
        var normalizedAliases = aliases.Select(row => (string)row["NormalizedAlias"]!).ToList();

        Assert.Equal(normalizedAliases.Count, normalizedAliases.Distinct().Count());

        var unitIdByAlias = aliases.ToDictionary(row => (string)row["NormalizedAlias"]!, row => (int)row["UnitOfMeasureId"]!);
        Assert.Equal(unitIdByCode["PCS"], unitIdByAlias["əd."]);
        Assert.Equal(unitIdByCode["PACK"], unitIdByAlias["paçqa"]);
        Assert.Equal(unitIdByCode["CM"], unitIdByAlias["cm"]);
        Assert.Equal(unitIdByCode["MM"], unitIdByAlias["mm"]);
        Assert.Equal(unitIdByCode["G"], unitIdByAlias["gr"]);
        Assert.Equal(unitIdByCode["L"], unitIdByAlias["l"]);
        Assert.Equal(unitIdByCode["BAG"], unitIdByAlias["kisə"]);

        Assert.DoesNotContain("lik", normalizedAliases);
        Assert.DoesNotContain("lük", normalizedAliases);
        Assert.DoesNotContain("qat", normalizedAliases);
        Assert.DoesNotContain("yarpaq", normalizedAliases);
    }

    [Fact]
    public void Hard_deleting_reference_data_is_refused()
    {
        var location = TestEntities.WithId(new Location("RAMANA", "Ramana"), 1);
        _context.Locations.Attach(location);
        _context.Locations.Remove(location);

        var exception = Assert.Throws<InvalidOperationException>(() => _context.SaveChanges());
        Assert.Contains("deactivated", exception.Message);
    }

    // Seed data and sequences are kept on the design-time model; the runtime model may strip them.
    private IModel DesignTimeModel() => _context.GetService<IDesignTimeModel>().Model;

    private IEntityType Entity(Type clrType) =>
        _context.Model.FindEntityType(clrType) ?? throw new InvalidOperationException($"{clrType.Name} is not mapped.");

    private IIndex Index(Type entity, params string[] propertyNames) =>
        Entity(entity).GetIndexes().Single(index => index.Properties.Select(property => property.Name).SequenceEqual(propertyNames));
}
