using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Analytics;

/// <summary>
/// Every live approved product match an analytics path needs, read in one query: the spelling matches that fold two
/// variants into one (<see cref="SpellingFold"/>), and the variant links that make products one family
/// (<see cref="VariantFamilies"/>).
/// </summary>
/// <remarks>
/// <para>
/// The two paths with a "Niyə dəyişib?" — the order page and the dashboard — need both kinds, and read them here in
/// the one query they used to spend on the spelling matches alone, so neither runs a query more. The comparison
/// endpoint and the product history keep their spelling-only read: a variant link keeps its two products apart
/// (13.1), and neither of them has a "Niyə dəyişib?" to put a transition in.
/// </para>
/// <para>
/// <b>Only an approved, live decision is read.</b> A rejected pair and an undone approval are never read, so nothing
/// unapproved changes anything (13.2), and an undo is exact: the decision stops being live, and the next read is the
/// one before it.
/// </para>
/// </remarks>
public sealed record ApprovedMatches(SpellingFold Spelling, VariantFamilies Families)
{
    /// <summary>No match of either kind: every path reads exactly what it would without this class.</summary>
    public static ApprovedMatches None { get; } = new(SpellingFold.None, VariantFamilies.None);

    /// <summary>
    /// The live approved matches of both kinds, oldest first, in one query that reads nothing else — the base
    /// product's name included, for the line that names the family.
    /// </summary>
    public static async Task<ApprovedMatches> ReadAsync(IBaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);

        var rows = await db.ProductMatchDecisions.AsNoTracking()
            .Where(decision => decision.Outcome == ProductMatchOutcome.Approved && decision.UndoneAtUtc == null)
            .OrderBy(decision => decision.Id)
            .Select(decision => new
            {
                decision.Kind,
                decision.SourceVariantId,
                decision.TargetVariantId,
                decision.SourceProductId,
                decision.TargetProductId,
                decision.VariantLabel,
                // Inside the same statement: a variant link's target is its base, and the line is written with its name.
                TargetProductName = db.Products
                    .Where(product => product.Id == decision.TargetProductId)
                    .Select(product => product.Name)
                    .FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return None;
        }

        // Exactly the rows, in exactly the order, SpellingFold.ReadAsync reads, so the fold is the same fold.
        var spelling = rows
            .Where(row => row.Kind == ProductMatchKind.SameItem && row.SourceVariantId != null && row.TargetVariantId != null)
            .ToList();

        var families = VariantFamilies.Of(
            rows.Where(row => row.Kind == ProductMatchKind.Variant)
                .Select(row => new VariantLink(
                    row.SourceProductId, row.TargetProductId, row.VariantLabel, row.TargetProductName ?? string.Empty)),
            spelling.Select(row => (row.SourceVariantId!.Value, row.SourceProductId, row.TargetProductId)));

        return new ApprovedMatches(
            SpellingFold.Of(spelling.Select(row => (row.SourceVariantId!.Value, row.TargetVariantId!.Value))),
            families);
    }

    /// <summary>
    /// The family role of every variant given, keyed by variant — only the variants that have one. Empty when no
    /// variant link is live.
    /// </summary>
    /// <param name="productOf">Each (already spelling-folded) variant and its own product.</param>
    public IReadOnlyDictionary<long, VariantFamilyRole> RolesOf(IEnumerable<KeyValuePair<long, long>> productOf)
    {
        ArgumentNullException.ThrowIfNull(productOf);

        if (Families.IsEmpty)
        {
            return EmptyRoles;
        }

        var roles = new Dictionary<long, VariantFamilyRole>();
        foreach (var (variantId, productId) in productOf)
        {
            if (Families.RoleOf(variantId, productId, Spelling) is { } role)
            {
                roles[variantId] = role;
            }
        }

        return roles;
    }

    private static readonly IReadOnlyDictionary<long, VariantFamilyRole> EmptyRoles = new Dictionary<long, VariantFamilyRole>();
}

/// <summary>A live approved variant link: <paramref name="VariantProductId"/> is a variant of <paramref name="BaseProductId"/>.</summary>
/// <param name="Label">The variant's short name under its base ("lavanda ətirli").</param>
/// <param name="BaseProductName">The base's own name ("Sabun elano"), read with the link.</param>
public sealed record VariantLink(long VariantProductId, long BaseProductId, string? Label, string BaseProductName);

/// <summary>Where a variant stands in a family.</summary>
/// <param name="BaseProductId">The family: its base product.</param>
/// <param name="ProductId">The product of the family this variant is — the base itself, or one of its variants.</param>
/// <param name="Label">The variant's short name; null for the base itself, which the screen calls "adi".</param>
public sealed record VariantFamilyRole(long BaseProductId, long ProductId, string? Label);

/// <summary>
/// The live approved variant links: which base product each product belongs to, under which label.
/// </summary>
/// <remarks>
/// <para>
/// "Sabun elano lavanda ətirli" is a variant of "Sabun elano". The two stay two products everywhere (13.1); this only
/// says they are one family, so a month that switched from one to the other can be told as one transition in "Niyə
/// dəyişib?" (13.1a) instead of one new product and one no longer ordered.
/// </para>
/// <para>
/// <b>Spellings first, then the family.</b> Analytics sees the kept spelling of a variant, so a family is looked up
/// through every product folded into it: a link approved on a spelling that was later folded away still counts. When
/// the products behind one variant point at two different bases, the approvals disagree and the variant is left in no
/// family — an unresolved pair costs nothing, a wrong one would tell a false story.
/// </para>
/// <para>Pure: no database, no clock. Nothing here writes.</para>
/// </remarks>
public sealed class VariantFamilies
{
    private readonly Dictionary<long, VariantFamilyRole> _roleOfProduct;
    private readonly Dictionary<long, string> _baseNames;
    private readonly IReadOnlyList<(long SourceVariantId, long SourceProductId, long TargetProductId)> _spellingMatches;

    private VariantFamilies(
        Dictionary<long, VariantFamilyRole> roleOfProduct,
        Dictionary<long, string> baseNames,
        IReadOnlyList<(long SourceVariantId, long SourceProductId, long TargetProductId)> spellingMatches)
    {
        _roleOfProduct = roleOfProduct;
        _baseNames = baseNames;
        _spellingMatches = spellingMatches;
    }

    /// <summary>No link: no variant belongs to any family.</summary>
    public static VariantFamilies None { get; } = new([], [], []);

    /// <summary>No family at all: every role is null, and no transition can be made.</summary>
    public bool IsEmpty => _roleOfProduct.Count == 0;

    /// <param name="links">The live approved variant links, oldest first.</param>
    /// <param name="spellingMatches">
    /// The live approved spelling matches, each with its source variant and both variants' products — the same rows the
    /// <see cref="SpellingFold"/> the roles are asked with was built from.
    /// </param>
    /// <remarks>
    /// A product linked twice keeps its first link: the database cannot hold two live links for one variant product (a
    /// partial unique index), and <see cref="ApprovedMatches.ReadAsync"/> hands them over oldest first.
    /// </remarks>
    public static VariantFamilies Of(
        IEnumerable<VariantLink> links,
        IEnumerable<(long SourceVariantId, long SourceProductId, long TargetProductId)> spellingMatches)
    {
        ArgumentNullException.ThrowIfNull(links);
        ArgumentNullException.ThrowIfNull(spellingMatches);

        var variantRoles = new Dictionary<long, VariantFamilyRole>();
        var baseNames = new Dictionary<long, string>();
        foreach (var link in links)
        {
            if (link.VariantProductId == link.BaseProductId)
            {
                continue;
            }

            if (variantRoles.TryAdd(link.VariantProductId, new VariantFamilyRole(link.BaseProductId, link.VariantProductId, link.Label)))
            {
                baseNames.TryAdd(link.BaseProductId, link.BaseProductName);
            }
        }

        if (variantRoles.Count == 0)
        {
            return None;
        }

        // A product is a variant or a base, never both: the approval service allows one level only. Were the records
        // ever to say both, its own link is the more specific claim, so the variant role is kept.
        var roleOfProduct = new Dictionary<long, VariantFamilyRole>(variantRoles);
        foreach (var baseProductId in baseNames.Keys)
        {
            roleOfProduct.TryAdd(baseProductId, new VariantFamilyRole(baseProductId, baseProductId, null));
        }

        return new VariantFamilies(roleOfProduct, baseNames, [.. spellingMatches]);
    }

    /// <summary>The name of a family's base product, or null when no live link names it as a base.</summary>
    public string? BaseNameOf(long baseProductId) => _baseNames.GetValueOrDefault(baseProductId);

    /// <summary>
    /// The family role of a canonical (already spelling-folded) variant, or null when it belongs to no family.
    /// </summary>
    /// <param name="canonicalVariantId">The variant as analytics sees it: the kept spelling.</param>
    /// <param name="ownProductId">That variant's own product.</param>
    /// <param name="spelling">The fold the variant was folded by.</param>
    public VariantFamilyRole? RoleOf(long canonicalVariantId, long ownProductId, SpellingFold spelling)
    {
        ArgumentNullException.ThrowIfNull(spelling);

        if (IsEmpty)
        {
            return null;
        }

        // Every product behind the variant: its own, and those of every spelling folded into it.
        var products = new SortedSet<long> { ownProductId };
        foreach (var (sourceVariantId, sourceProductId, targetProductId) in _spellingMatches)
        {
            if (spelling.CanonicalOf(sourceVariantId) == canonicalVariantId)
            {
                products.Add(sourceProductId);
                products.Add(targetProductId);
            }
        }

        var roles = products
            .Select(productId => _roleOfProduct.GetValueOrDefault(productId))
            .OfType<VariantFamilyRole>()
            .ToList();

        if (roles.Count == 0 || roles.Select(role => role.BaseProductId).Distinct().Skip(1).Any())
        {
            return null;
        }

        // The variant's own product speaks for it when it can; otherwise the lowest product behind it that has a role.
        return _roleOfProduct.GetValueOrDefault(ownProductId) ?? roles[0];
    }
}
