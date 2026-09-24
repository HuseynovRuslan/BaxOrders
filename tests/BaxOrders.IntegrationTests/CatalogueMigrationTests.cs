using BaxOrders.CatalogueMigration;
using BaxOrders.Domain.Locations;
using BaxOrders.Infrastructure.Persistence;
using BaxOrders.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// The Task 3 catalogue migration against a real PostgreSQL: it does what the plan says, a second run changes
/// nothing, and a STOP condition leaves the catalogue exactly as it was.
/// </summary>
/// <remarks>
/// Each test builds a database of its own from the migrations and drops it afterwards. The shared test database
/// is not used: the migration deletes the seeded Ramana, Maştağa and Əmircan, which other tests rely on.
/// <para>
/// The catalogue is the one <c>--inspect</c> found, created in a different order, so every object has a
/// different id here than on the development database. The migration is keyed by code; if it were keyed by id
/// it would rename the wrong objects here and the assertions would say so.
/// </para>
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class CatalogueMigrationTests : IAsyncLifetime
{
    private static readonly CancellationToken None = CancellationToken.None;

    private IsolatedDatabase? _database;

    [PostgresFact]
    public async Task Applying_twice_changes_the_catalogue_once_and_then_nothing()
    {
        await using var db = await CatalogueAsFoundAsync();

        var first = await Apply.ExecuteAsync(db, None);
        var second = await Apply.ExecuteAsync(db, None);

        Assert.Equal(ApplyOutcome.Applied, first.Outcome);
        Assert.Equal(20, first.Before.Steps.Count);
        Assert.Empty(first.After!.Steps);

        Assert.Equal(ApplyOutcome.NothingToDo, second.Outcome);
        Assert.Empty(second.Before.Steps);

        var names = await db.Locations.AsNoTracking().Select(location => location.Name).ToListAsync(None);
        Assert.Equal(CatalogueDecisions.ExpectedCatalogue.Order(StringComparer.Ordinal), names.Order(StringComparer.Ordinal));
    }

    [PostgresFact]
    public async Task Renames_follow_the_code_and_the_previous_names_still_resolve()
    {
        await using var db = await CatalogueAsFoundAsync();
        var expoId = await db.Locations.Where(location => location.Code == "LOC-000042").Select(location => location.Id).SingleAsync(None);

        await Apply.ExecuteAsync(db, None);

        var expo = await db.Locations.AsNoTracking().SingleAsync(location => location.Id == expoId, None);
        Assert.Equal(("LOC-000042", "EXPO Center"), (expo.Code, expo.Name));

        var aliases = await db.LocationAliases.AsNoTracking()
            .Select(alias => new { alias.Alias, alias.Location.Code })
            .ToListAsync(None);
        Assert.Contains(aliases, alias => alias.Alias == "EXPO" && alias.Code == "LOC-000042");
        Assert.Contains(aliases, alias => alias.Alias == "H.Ə.M Təmizlik" && alias.Code == "HEM");
        Assert.Equal(CatalogueAsFound.Aliases.Count + 10, aliases.Count);

        // Every alias that existed before is still there, on the same object.
        foreach (var (alias, code) in CatalogueAsFound.Aliases)
        {
            Assert.Contains(aliases, kept => kept.Alias == alias && kept.Code == code);
        }
    }

    /// <summary>Çadır's code came from the application's own sequence, so the application will never issue it again.</summary>
    [PostgresFact]
    public async Task The_next_code_the_application_issues_is_after_Çadır()
    {
        await using var db = await CatalogueAsFoundAsync();

        await Apply.ExecuteAsync(db, None);
        var next = await new PostgresLocationCodeGenerator(db).NextAsync(None);

        Assert.Equal("Çadır", await db.Locations.Where(location => location.Code == "LOC-000047").Select(location => location.Name).SingleAsync(None));
        Assert.Equal("LOC-000048", next);
    }

    /// <summary>Anything referring to an object the owner asked to delete stops the whole migration, not just that step.</summary>
    [PostgresFact]
    public async Task A_referenced_object_stops_the_migration_and_nothing_is_written()
    {
        await using var db = await CatalogueAsFoundAsync();
        var ramana = await db.Locations.SingleAsync(location => location.Code == "RAMANA", None);
        db.LocationAliases.Add(new LocationAlias(ramana, "Ramana qəsəbəsi"));
        await db.SaveChangesAsync(None);
        db.ChangeTracker.Clear();

        var result = await Apply.ExecuteAsync(db, None);

        Assert.Equal(ApplyOutcome.Refused, result.Outcome);
        Assert.Contains(result.Before.Stops, stop => stop.Contains("RAMANA", StringComparison.Ordinal));
        Assert.Equal(CatalogueAsFound.Locations.Count, await db.Locations.CountAsync(None));
        Assert.Equal("EXPO", await db.Locations.Where(location => location.Code == "LOC-000042").Select(location => location.Name).SingleAsync(None));
    }

    public async Task InitializeAsync()
    {
        if (PostgresDatabaseFixture.IsConfigured)
        {
            _database = await IsolatedDatabase.CreateAsync("baxorders_catalogue");
        }
    }

    public async Task DisposeAsync()
    {
        if (_database is not null)
        {
            await _database.DisposeAsync();
        }
    }

    /// <summary>
    /// The migrations seed Ramana, Maştağa, Əmircan and Heydər Əliyev Mərkəzi with its "H.Ə.M" alias; the other
    /// 25 objects and 14 aliases are added here, newest code first, and the code sequence is set where it stood.
    /// </summary>
    private async Task<BaxOrdersDbContext> CatalogueAsFoundAsync()
    {
        var db = _database!.CreateContext();
        var seeded = await db.Locations.Select(location => location.Code).ToListAsync(None);

        var added = CatalogueAsFound.Locations
            .Where(location => !seeded.Contains(location.Code))
            .OrderByDescending(location => location.Code, StringComparer.Ordinal)
            .Select(location => new Location(location.Code, location.Name))
            .ToList();
        db.Locations.AddRange(added);
        await db.SaveChangesAsync(None);

        var byCode = await db.Locations.ToDictionaryAsync(location => location.Code, None);
        var existing = await db.LocationAliases.Select(alias => alias.Alias).ToListAsync(None);
        db.LocationAliases.AddRange(CatalogueAsFound.Aliases
            .Where(alias => !existing.Contains(alias.Alias))
            .Select(alias => new LocationAlias(byCode[alias.Code], alias.Alias)));
        await db.SaveChangesAsync(None);

        await db.Database.ExecuteSqlRawAsync(
            $"""SELECT setval('"LocationCodeNumbers"', {CatalogueAsFound.SequenceLastValue}, true)""", None);
        db.ChangeTracker.Clear();
        return db;
    }
}
