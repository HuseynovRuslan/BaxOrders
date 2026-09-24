using BaxOrders.CatalogueMigration;
using BaxOrders.Domain.Normalization;
using BaxOrders.TestSupport;

namespace BaxOrders.UnitTests.CatalogueMigration;

/// <summary>
/// The Task 3 catalogue migration, worked out without a database: what it would do to the catalogue the owner's
/// decisions were written for, that doing it twice changes nothing, and that every STOP condition stops it.
/// </summary>
public sealed class CataloguePlanTests
{
    private static readonly IReadOnlyDictionary<int, IReadOnlyList<string>> NothingRefers = new Dictionary<int, IReadOnlyList<string>>();

    [Fact]
    public void On_the_catalogue_as_found_it_deletes_three_renames_six_inserts_one_and_adds_ten_aliases()
    {
        var plan = CataloguePlanner.Plan(CatalogueAsFound.State(), NothingRefers);

        Assert.Empty(plan.Stops);
        Assert.Equal(["MASTAGA", "RAMANA", "EMIRCAN"], CodesOf(plan, StepKind.DeleteLocation));
        Assert.Equal(["LOC-000033", "LOC-000045", "LOC-000041", "LOC-000039", "LOC-000042", "LOC-000029"], CodesOf(plan, StepKind.RenameLocation));
        Assert.Equal("Çadır", Assert.Single(plan.Steps, step => step.Kind == StepKind.InsertLocation && step.Code == "LOC-000047").To);

        Assert.Equal(
            [
                ("Hökümət evi və ətrafı parklar", "LOC-000033"),
                ("Qara Qarayev", "LOC-000041"),
                ("Axundov", "LOC-000039"),
                ("EXPO", "LOC-000042"),
                ("Təmir-tikinti", "LOC-000029"),
                ("H.Ə.M Təmizlik", "HEM"),
                ("H.Ə.M Yaşıllıq", "HEM"),
                ("Spacde qarşısı", "LOC-000045"),
                ("Novxanı Təmizlik", "LOC-000037"),
                ("Qafur Məmmədov parkı", "LOC-000035"),
            ],
            plan.Steps.Where(step => step.Kind == StepKind.AddAlias).Select(step => (step.To, step.Code)));
    }

    [Fact]
    public void The_result_is_the_owners_27_objects_and_keeps_every_alias_that_existed()
    {
        var before = CatalogueAsFound.State();
        var plan = CataloguePlanner.Plan(before, NothingRefers);

        Assert.Equal(
            CatalogueDecisions.ExpectedCatalogue.Order(StringComparer.Ordinal),
            plan.Locations.Select(location => location.Name).Order(StringComparer.Ordinal));

        foreach (var alias in before.Aliases)
        {
            Assert.Contains(plan.Aliases, kept => kept.NormalizedAlias == alias.NormalizedAlias && kept.LocationId == alias.LocationId);
        }
    }

    /// <summary>The test the specification asks for: a second run changes nothing.</summary>
    [Fact]
    public void Planning_again_on_the_result_finds_nothing_to_do()
    {
        var first = CataloguePlanner.Plan(CatalogueAsFound.State(), NothingRefers);
        var second = CataloguePlanner.Plan(Applied(first, sequenceLastValue: 47), NothingRefers);

        Assert.Empty(second.Stops);
        Assert.Empty(second.Steps);
    }

    /// <summary>
    /// Keyed by code, never by id: the same catalogue under entirely different ids — as another environment would
    /// have it — produces the same changes to the same codes.
    /// </summary>
    [Fact]
    public void The_plan_follows_codes_not_ids()
    {
        var here = CataloguePlanner.Plan(CatalogueAsFound.State(), NothingRefers);
        var elsewhere = CataloguePlanner.Plan(CatalogueAsFound.State(idOffset: 1000), NothingRefers);

        Assert.Empty(elsewhere.Stops);
        Assert.Equal(
            here.Steps.Select(step => (step.Kind, step.Code, step.From, step.To)),
            elsewhere.Steps.Select(step => (step.Kind, step.Code, step.From, step.To)));
    }

    [Fact]
    public void An_object_to_delete_that_anything_refers_to_stops_the_migration()
    {
        var state = CatalogueAsFound.State();
        var ramana = state.ByCode("RAMANA")!;

        var plan = CataloguePlanner.Plan(state, new Dictionary<int, IReadOnlyList<string>>
        {
            [ramana.Id] = ["OrderRequests.LocationId: 1 rows"],
        });

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains("RAMANA", StringComparison.Ordinal) && stop.Contains("OrderRequests", StringComparison.Ordinal));
        Assert.DoesNotContain(plan.Steps, step => step.Code == "RAMANA");
    }

    /// <summary>A code that carries some other name is some other object, and is neither renamed nor deleted.</summary>
    [Theory]
    [InlineData("LOC-000042", "EXPO Mərkəzi")]
    [InlineData("MASTAGA", "Maştağa qəsəbəsi")]
    public void A_code_carrying_an_unexpected_name_stops_the_migration(string code, string name)
    {
        var plan = CataloguePlanner.Plan(Renamed(CatalogueAsFound.State(), code, name), NothingRefers);

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains(code, StringComparison.Ordinal));
        Assert.DoesNotContain(plan.Steps, step => step.Code == code && step.Kind is StepKind.RenameLocation or StepKind.DeleteLocation);
    }

    /// <summary>A spelling that already belongs to another object is reported and never moved.</summary>
    [Fact]
    public void An_alias_that_would_collide_with_another_object_stops_the_migration()
    {
        var state = CatalogueAsFound.State();
        var bibiheybət = state.ByCode("LOC-000038")!;
        var colliding = state with
        {
            Aliases = [.. state.Aliases, new CatalogueAlias(99, bibiheybət.Id, "EXPO", TextNormalizer.Normalize("EXPO"))],
        };

        var plan = CataloguePlanner.Plan(colliding, NothingRefers);

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains("'EXPO'", StringComparison.Ordinal) && stop.Contains("LOC-000038", StringComparison.Ordinal));
    }

    /// <summary>Çadır takes the next number the application's own sequence would issue, and no other.</summary>
    [Fact]
    public void A_code_that_is_not_next_in_the_sequence_stops_the_migration()
    {
        var plan = CataloguePlanner.Plan(CatalogueAsFound.State(sequenceLastValue: 47), NothingRefers);

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains("LOC-000047", StringComparison.Ordinal) && stop.Contains("sequence", StringComparison.Ordinal));
    }

    /// <summary>Heydər Əliyev Mərkəzi stays one object: its categories are spellings of it, never objects of their own.</summary>
    [Fact]
    public void An_object_named_like_a_category_of_another_stops_the_migration()
    {
        var state = CatalogueAsFound.State();
        var split = state with
        {
            Locations = [.. state.Locations, new CatalogueLocation(90, "LOC-000090", "H.Ə.M Təmizlik", TextNormalizer.Normalize("H.Ə.M Təmizlik"), true)],
        };

        var plan = CataloguePlanner.Plan(split, NothingRefers);

        Assert.False(plan.CanApply);
        Assert.Contains(plan.Stops, stop => stop.Contains("H.Ə.M Təmizlik", StringComparison.Ordinal));
    }

    private static string[] CodesOf(CataloguePlan plan, StepKind kind) =>
        [.. plan.Steps.Where(step => step.Kind == kind).Select(step => step.Code)];

    private static CatalogueState Renamed(CatalogueState state, string code, string name) => state with
    {
        Locations = [.. state.Locations.Select(location => location.Code == code
            ? location with { Name = name, NormalizedName = TextNormalizer.Normalize(name) }
            : location)],
    };

    /// <summary>The catalogue a plan leaves, as the database would hold it: inserted objects get real ids.</summary>
    private static CatalogueState Applied(CataloguePlan plan, long sequenceLastValue)
    {
        var ids = plan.Locations.ToDictionary(location => location.Id, location => location.Id > 0 ? location.Id : 500 - location.Id);
        return new CatalogueState(
            [.. plan.Locations.Select(location => location with { Id = ids[location.Id] })],
            [.. plan.Aliases.Select((alias, index) => alias with { Id = index + 1, LocationId = ids[alias.LocationId] })],
            sequenceLastValue,
            SequenceIsCalled: true);
    }
}
