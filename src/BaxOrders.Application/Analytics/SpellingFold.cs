using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Analytics;

/// <summary>
/// The live approved spelling matches: each source variant counts as its target in every analytics read.
/// </summary>
/// <remarks>
/// <para>
/// "Lampa 15 W" and "Lampa 15W" are one lamp written two ways. Until an administrator says so they are two
/// products, and a month that switched spelling reads as one "new" product and one "no longer ordered". Once a
/// spelling match is approved, every analytics path reads the two as the kept spelling — the decision's target —
/// and the month reads as one product whose quantity or price moved.
/// </para>
/// <para>
/// <b>Only an approved, live spelling match folds.</b> A rejected pair, an undone approval and a variant link are
/// never read here: nothing unapproved changes a figure (13.2), and a variant link keeps its two products apart
/// (13.1). Nothing is folded by likeness either — only the exact pairs somebody approved.
/// </para>
/// <para>
/// <b>Money cannot move.</b> <see cref="Apply"/> only regroups: every field of the snapshots that land on one id is
/// added up, so for every request the sum of every field is the same before and after. Every total, known amount,
/// difference, percentage and missing-price count is a sum of snapshots, so none of them can change. What can
/// change is how a difference is split between products — which is the point.
/// </para>
/// <para>
/// A read, never a write: no line, variant, product or alias is touched, so an undo is exact — the decision stops
/// being live, and the next read is the one before it.
/// </para>
/// </remarks>
public sealed class SpellingFold
{
    private readonly Dictionary<long, long> _canonical;
    private readonly Dictionary<long, IReadOnlyList<long>> _members;

    private SpellingFold(Dictionary<long, long> canonical, Dictionary<long, IReadOnlyList<long>> members)
    {
        _canonical = canonical;
        _members = members;
    }

    /// <summary>No match: every id is its own.</summary>
    public static SpellingFold None { get; } = new([], []);

    /// <summary>Nothing folds: every read path reads exactly what it would without this class.</summary>
    public bool IsEmpty => _canonical.Count == 0;

    /// <summary>
    /// The fold of these matches, each <c>(Source, Target)</c> meaning "the source counts as the target".
    /// </summary>
    /// <remarks>
    /// A source given twice keeps the first target it was given: the database cannot hold two live spelling matches
    /// for one source (a partial unique index), and <see cref="ReadAsync"/> hands them over oldest first.
    /// </remarks>
    public static SpellingFold Of(IEnumerable<(long Source, long Target)> matches)
    {
        ArgumentNullException.ThrowIfNull(matches);

        var targetOf = new Dictionary<long, long>();
        foreach (var (source, target) in matches)
        {
            if (source != target)
            {
                targetOf.TryAdd(source, target);
            }
        }

        if (targetOf.Count == 0)
        {
            return None;
        }

        // Only the ids a match names are kept: a source, and whatever it ends up counting as. Every other id is its own.
        var canonical = targetOf.Keys.Concat(targetOf.Values)
            .Distinct()
            .ToDictionary(id => id, id => Resolve(id, targetOf));

        var members = canonical
            .GroupBy(entry => entry.Value)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<long>)[.. group.Select(entry => entry.Key).Order()]);

        return new SpellingFold(canonical, members);
    }

    /// <summary>
    /// The live approved spelling matches, in one query that reads nothing else. Rejected, undone and variant rows
    /// are never read.
    /// </summary>
    public static async Task<SpellingFold> ReadAsync(IBaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);

        var matches = await db.ProductMatchDecisions.AsNoTracking()
            .Where(decision => decision.Kind == ProductMatchKind.SameItem
                && decision.Outcome == ProductMatchOutcome.Approved
                && decision.UndoneAtUtc == null
                && decision.SourceVariantId != null
                && decision.TargetVariantId != null)
            .OrderBy(decision => decision.Id)
            .Select(decision => new { Source = decision.SourceVariantId!.Value, Target = decision.TargetVariantId!.Value })
            .ToListAsync(cancellationToken);

        return matches.Count == 0 ? None : Of(matches.Select(match => (match.Source, match.Target)));
    }

    /// <summary>The variant this one counts as: the kept spelling, or the id itself when it folds into nothing.</summary>
    public long CanonicalOf(long variantId) => _canonical.GetValueOrDefault(variantId, variantId);

    /// <summary>
    /// Every variant counting as <c>CanonicalOf(variantId)</c> — the kept spelling and every spelling folded into it —
    /// in id order. Just the id itself when it folds into nothing.
    /// </summary>
    public IReadOnlyList<long> MembersOf(long variantId) =>
        _members.TryGetValue(CanonicalOf(variantId), out var members) ? members : [variantId];

    /// <summary>
    /// Re-keys every request's snapshots by canonical id, adding up the snapshots that land on one id.
    /// </summary>
    /// <remarks>
    /// Per request, before any baseline month is averaged, so the average sees one variant per month exactly as it
    /// sees an ordinary one. A request with nothing to fold keeps its own dictionary; with no match at all the input
    /// is returned as it is.
    /// </remarks>
    public Dictionary<long, Dictionary<long, VariantPeriodSnapshot>> Apply(
        Dictionary<long, Dictionary<long, VariantPeriodSnapshot>> byRequest)
    {
        ArgumentNullException.ThrowIfNull(byRequest);

        if (IsEmpty)
        {
            return byRequest;
        }

        var result = new Dictionary<long, Dictionary<long, VariantPeriodSnapshot>>(byRequest.Count);
        foreach (var (requestId, byVariant) in byRequest)
        {
            if (!byVariant.Keys.Any(variantId => CanonicalOf(variantId) != variantId))
            {
                result[requestId] = byVariant;
                continue;
            }

            // Insertion order is kept: the folded snapshot sits where the first of its members was.
            var folded = new Dictionary<long, VariantPeriodSnapshot>(byVariant.Count);
            foreach (var (variantId, snapshot) in byVariant)
            {
                var canonical = CanonicalOf(variantId);
                folded[canonical] = folded.TryGetValue(canonical, out var existing)
                    ? Add(canonical, existing, snapshot)
                    : snapshot with { ProductVariantId = canonical };
            }

            result[requestId] = folded;
        }

        return result;
    }

    /// <summary>Field by field. Nothing dropped, recomputed, rounded or averaged.</summary>
    private static VariantPeriodSnapshot Add(long variantId, VariantPeriodSnapshot left, VariantPeriodSnapshot right) =>
        new(
            variantId,
            left.Quantity + right.Quantity,
            left.ItemCount + right.ItemCount,
            left.KnownPriceItemCount + right.KnownPriceItemCount,
            left.MissingRequiredPriceItemCount + right.MissingRequiredPriceItemCount,
            left.PriceNotRequiredItemCount + right.PriceNotRequiredItemCount,
            left.PricedQuantity + right.PricedQuantity,
            left.PricedAmount + right.PricedAmount);

    /// <summary>
    /// Follows the map to its end. It stops at the first id it has already visited, so a stored cycle — which the
    /// approval service makes impossible, and which this does not rely on — can never loop; every member of such a
    /// cycle lands on the cycle's lowest id, so they still agree on one.
    /// </summary>
    private static long Resolve(long variantId, IReadOnlyDictionary<long, long> targetOf)
    {
        var path = new List<long>();
        var seen = new HashSet<long>();
        var current = variantId;
        while (seen.Add(current))
        {
            path.Add(current);
            if (!targetOf.TryGetValue(current, out var next))
            {
                return current;
            }

            current = next;
        }

        return path.Skip(path.IndexOf(current)).Min();
    }
}
