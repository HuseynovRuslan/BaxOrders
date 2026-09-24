using BaxOrders.Application.Common;
using BaxOrders.Domain.Normalization;

namespace BaxOrders.CatalogueMigration;

public enum StepKind
{
    DeleteLocation = 1,
    RenameLocation = 2,
    InsertLocation = 3,
    AddAlias = 4,
}

/// <summary>One change the migration would make, named by code.</summary>
/// <param name="LocationId">The row the change touches; null for an object that does not exist yet.</param>
/// <param name="From">The current name, for a rename or a deletion.</param>
/// <param name="To">The new name, the inserted name or the alias.</param>
public sealed record PlanStep(StepKind Kind, string Code, int? LocationId, string? From, string To, string Reason)
{
    public override string ToString() => Kind switch
    {
        StepKind.DeleteLocation => $"DELETE  {Code,-11} '{From}' (id {LocationId}) — {Reason}",
        StepKind.RenameLocation => $"RENAME  {Code,-11} '{From}' → '{To}'",
        StepKind.InsertLocation => $"INSERT  {Code,-11} '{To}' — {Reason}",
        _ => $"ALIAS   {Code,-11} '{To}' — {Reason}",
    };
}

/// <param name="Steps">What would change, in the order it would be applied. Empty once the migration has run.</param>
/// <param name="Stops">Why it must not run. Any entry here and <c>--apply</c> refuses.</param>
/// <param name="Notes">Decisions that need no change, said out loud so none of them looks forgotten.</param>
/// <param name="Locations">The catalogue as the steps would leave it. An inserted object has a negative id.</param>
/// <param name="Aliases">The aliases as the steps would leave them.</param>
public sealed record CataloguePlan(
    IReadOnlyList<PlanStep> Steps,
    IReadOnlyList<string> Stops,
    IReadOnlyList<string> Notes,
    IReadOnlyList<CatalogueLocation> Locations,
    IReadOnlyList<CatalogueAlias> Aliases)
{
    public bool CanApply => Stops.Count == 0;

    public bool IsEmpty => Steps.Count == 0;
}

/// <summary>
/// Works out the migration from the decisions and the catalogue as it is. Pure: no database, so the same
/// function decides the dry run, the apply, the verification and the tests.
/// </summary>
/// <remarks>
/// Idempotence is a property of this function rather than of a flag somewhere: each decision is compared with
/// what the catalogue already says, and a decision the catalogue already reflects produces no step. Running the
/// plan on the catalogue it produced gives an empty plan.
/// </remarks>
public static class CataloguePlanner
{
    /// <param name="references">
    /// For each location id, what refers to it — by id or by name. An object with anything here is not deleted.
    /// </param>
    public static CataloguePlan Plan(
        CatalogueState state, IReadOnlyDictionary<int, IReadOnlyList<string>> references)
    {
        ArgumentNullException.ThrowIfNull(state);
        ArgumentNullException.ThrowIfNull(references);

        var locations = state.Locations.ToList();
        var aliases = state.Aliases.ToList();
        var steps = new List<PlanStep>();
        var stops = new List<string>();
        var notes = new List<string>();

        CatalogueLocation? ByCode(string code) =>
            locations.FirstOrDefault(location => string.Equals(location.Code, code, StringComparison.Ordinal));

        // ---- 1. delete -------------------------------------------------------------------------------------
        foreach (var deletion in CatalogueDecisions.Deletions)
        {
            var key = TextNormalizer.Normalize(deletion.Name);
            var location = ByCode(deletion.Code);
            if (location is null)
            {
                var elsewhere = locations.FirstOrDefault(other => other.NormalizedName == key);
                if (elsewhere is not null)
                {
                    stops.Add($"{deletion.Code} is gone, but an object named '{elsewhere.Name}' exists under {elsewhere.Code}. "
                        + "The decision names the code; the owner has to say whether that one is meant.");
                }
                else
                {
                    notes.Add($"{deletion.Code} '{deletion.Name}' is not in the catalogue — already deleted.");
                }

                continue;
            }

            if (location.NormalizedName != key)
            {
                stops.Add($"{deletion.Code} carries '{location.Name}', not '{deletion.Name}'. Not deleted: it is a different object.");
                continue;
            }

            var found = references.GetValueOrDefault(location.Id) ?? [];
            if (found.Count > 0)
            {
                stops.Add($"{deletion.Code} '{location.Name}' is referenced: {string.Join("; ", found)}. "
                    + "Nothing references it except harmless rows was the condition for deleting it.");
                continue;
            }

            var ownAliases = aliases.Where(alias => alias.LocationId == location.Id).ToList();
            if (ownAliases.Count > 0)
            {
                stops.Add($"{deletion.Code} '{location.Name}' has aliases ({string.Join(", ", ownAliases.Select(alias => alias.Alias))}). "
                    + "Every existing alias is preserved, so it cannot be deleted without the owner deciding what they mean.");
                continue;
            }

            steps.Add(new PlanStep(StepKind.DeleteLocation, location.Code, location.Id, location.Name, location.Name,
                "owner: does not exist in reality; nothing refers to it"));
            locations.Remove(location);
        }

        // ---- 2. rename -------------------------------------------------------------------------------------
        var previousNames = new List<SpellingDecision>();
        foreach (var rename in CatalogueDecisions.Renames)
        {
            var location = ByCode(rename.Code);
            if (location is null)
            {
                stops.Add($"{rename.Code} ('{rename.From}' → '{rename.To}') is not in the catalogue.");
                continue;
            }

            previousNames.Add(new SpellingDecision(rename.From, rename.Code, "its previous name, so imports that still spell it so resolve"));

            if (location.Name == rename.To)
            {
                notes.Add($"{rename.Code} is already '{rename.To}'.");
                continue;
            }

            if (location.Name != rename.From)
            {
                stops.Add($"{rename.Code} carries '{location.Name}'; the decision expects '{rename.From}' (or '{rename.To}' once renamed).");
                continue;
            }

            var key = TextNormalizer.Normalize(rename.To);
            if (locations.FirstOrDefault(other => other.Id != location.Id && other.NormalizedName == key) is { } named)
            {
                stops.Add($"Renaming {rename.Code} to '{rename.To}' would collide with the name of {named.Code} '{named.Name}'.");
                continue;
            }

            if (aliases.FirstOrDefault(alias => alias.NormalizedAlias == key) is { } alias)
            {
                var owner = locations.FirstOrDefault(other => other.Id == alias.LocationId);
                stops.Add($"Renaming {rename.Code} to '{rename.To}' would collide with the alias '{alias.Alias}' of "
                    + $"{owner?.Code} '{owner?.Name}'.");
                continue;
            }

            steps.Add(new PlanStep(StepKind.RenameLocation, location.Code, location.Id, location.Name, rename.To, "owner: full display name"));
            locations[locations.IndexOf(location)] = location with { Name = rename.To, NormalizedName = key };
        }

        // ---- 3. insert -------------------------------------------------------------------------------------
        var nextTemporaryId = -1;
        foreach (var insert in CatalogueDecisions.Inserts)
        {
            var key = TextNormalizer.Normalize(insert.Name);
            if (ByCode(insert.Code) is { } existing)
            {
                if (existing.NormalizedName == key)
                {
                    notes.Add($"{insert.Code} '{existing.Name}' already exists.");
                }
                else
                {
                    stops.Add($"{insert.Code} is already taken by '{existing.Name}'. '{insert.Name}' needs another code — the owner decides.");
                }

                continue;
            }

            if (locations.FirstOrDefault(other => other.NormalizedName == key) is { } named)
            {
                stops.Add($"'{insert.Name}' already exists as {named.Code} '{named.Name}'. Not inserted twice.");
                continue;
            }

            if (aliases.FirstOrDefault(alias => alias.NormalizedAlias == key) is { } alias)
            {
                var owner = locations.FirstOrDefault(other => other.Id == alias.LocationId);
                stops.Add($"'{insert.Name}' is already an alias of {owner?.Code} '{owner?.Name}'. The owner has to say which object it is.");
                continue;
            }

            var number = CatalogueState.CodeNumber(insert.Code);
            if (number is null || number != state.NextSequenceNumber || number <= state.HighestIssuedCodeNumber)
            {
                stops.Add($"{insert.Code} is not the next code in the LOC sequence: the sequence would issue "
                    + $"LOC-{state.NextSequenceNumber:D6} and the highest code in use is LOC-{state.HighestIssuedCodeNumber:D6}.");
                continue;
            }

            steps.Add(new PlanStep(StepKind.InsertLocation, insert.Code, null, null, insert.Name,
                "owner: a real object, no orders yet; next code in the LOC sequence"));
            locations.Add(new CatalogueLocation(nextTemporaryId--, insert.Code, insert.Name, key, true));
        }

        // ---- 4. spellings that must resolve ----------------------------------------------------------------
        foreach (var spelling in previousNames.Concat(CatalogueDecisions.Spellings))
        {
            var target = ByCode(spelling.Code);
            if (target is null)
            {
                stops.Add($"'{spelling.Spelling}' has to resolve to {spelling.Code}, which is not in the catalogue.");
                continue;
            }

            var key = TextNormalizer.Normalize(spelling.Spelling);
            if (key == target.NormalizedName)
            {
                notes.Add($"'{spelling.Spelling}' → {target.Code} '{target.Name}': resolves through the name itself "
                    + "(an alias equal to the name is refused by the domain and would add nothing).");
                continue;
            }

            if (aliases.FirstOrDefault(alias => alias.NormalizedAlias == key) is { } alias)
            {
                if (alias.LocationId == target.Id)
                {
                    notes.Add($"'{spelling.Spelling}' → {target.Code} '{target.Name}': already its alias '{alias.Alias}'.");
                }
                else
                {
                    var owner = locations.FirstOrDefault(other => other.Id == alias.LocationId);
                    stops.Add($"'{spelling.Spelling}' has to resolve to {target.Code} '{target.Name}', but it is already the alias "
                        + $"'{alias.Alias}' of {owner?.Code} '{owner?.Name}'. Collision — not moved, not overwritten.");
                }

                continue;
            }

            if (locations.FirstOrDefault(other => other.NormalizedName == key) is { } named)
            {
                stops.Add($"'{spelling.Spelling}' has to resolve to {target.Code} '{target.Name}', but it is the name of "
                    + $"{named.Code} '{named.Name}'. Collision.");
                continue;
            }

            if (!target.IsActive)
            {
                stops.Add($"'{spelling.Spelling}' would be an alias of the inactive {target.Code} '{target.Name}'; the importer ignores those.");
                continue;
            }

            steps.Add(new PlanStep(StepKind.AddAlias, target.Code, target.Id > 0 ? target.Id : null, null, spelling.Spelling, spelling.Source));
            aliases.Add(new CatalogueAlias(0, target.Id, spelling.Spelling, key));
        }

        // ---- 5. the result has to be the one the owner described --------------------------------------------
        var expected = CatalogueDecisions.ExpectedCatalogue.ToHashSet(StringComparer.Ordinal);
        var actual = locations.Select(location => location.Name).ToHashSet(StringComparer.Ordinal);
        var missing = expected.Except(actual).OrderByName(name => name).ToList();
        var unexpected = actual.Except(expected).OrderByName(name => name).ToList();
        if (missing.Count > 0 || unexpected.Count > 0)
        {
            stops.Add($"The result would not be the owner's 27 objects. Missing: {Listed(missing)}. Not expected: {Listed(unexpected)}.");
        }

        foreach (var inactive in locations.Where(location => !location.IsActive))
        {
            stops.Add($"{inactive.Code} '{inactive.Name}' is inactive; every object in the owner's list is a working object.");
        }

        return new CataloguePlan(steps, stops, notes, locations, aliases);
    }

    private static string Listed(IReadOnlyCollection<string> names) =>
        names.Count == 0 ? "none" : string.Join(", ", names.Select(name => $"'{name}'"));
}
