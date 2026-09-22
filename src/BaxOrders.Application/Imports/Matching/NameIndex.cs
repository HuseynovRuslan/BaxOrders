using BaxOrders.Domain.Normalization;

namespace BaxOrders.Application.Imports.Matching;

public enum MatchKind
{
    /// <summary>The source value is empty.</summary>
    Blank,
    Matched,
    Unknown,

    /// <summary>The value resolves to more than one record; nothing is chosen automatically.</summary>
    Ambiguous,

    /// <summary>
    /// The review confirmed the value is not a record of this kind at all: a word in a unit column that is not
    /// a unit of measure. There is nothing to look up and nothing to report.
    /// </summary>
    NotApplicable,
}

public readonly record struct MatchResult<TId>(MatchKind Kind, TId? Id, IReadOnlyList<TId> Candidates)
    where TId : struct
{
    public static MatchResult<TId> Blank => new(MatchKind.Blank, null, []);

    public static MatchResult<TId> Unknown => new(MatchKind.Unknown, null, []);

    public static MatchResult<TId> Matched(TId id) => new(MatchKind.Matched, id, [id]);

    public static MatchResult<TId> Ambiguous(IReadOnlyList<TId> candidates) => new(MatchKind.Ambiguous, null, candidates);

    public static MatchResult<TId> NotApplicable => new(MatchKind.NotApplicable, null, []);
}

/// <summary>
/// Exact lookup from a normalized value to canonical record ids. Canonical names and approved aliases are
/// added to the same index.
/// </summary>
/// <remarks>
/// When a canonical name and an alias both point to the same record, the value matches that record.
/// When they point to different records (canonical "Cleanfix" and alias "Cleanfix" → "Cleanfix MMC"),
/// the result is <see cref="MatchKind.Ambiguous"/>. No fuzzy or partial matching happens here.
/// </remarks>
public sealed class NameIndex<TId>
    where TId : struct
{
    private readonly Dictionary<string, SortedSet<TId>> _idsByKey = new(StringComparer.Ordinal);

    /// <param name="normalizedKey">A value already produced by <see cref="TextNormalizer"/>.</param>
    public void Add(string? normalizedKey, TId id)
    {
        if (string.IsNullOrEmpty(normalizedKey))
        {
            return;
        }

        if (!_idsByKey.TryGetValue(normalizedKey, out var ids))
        {
            _idsByKey[normalizedKey] = ids = [];
        }

        ids.Add(id);
    }

    public MatchResult<TId> Resolve(string? sourceText) => ResolveNormalized(TextNormalizer.Normalize(sourceText));

    public MatchResult<TId> ResolveNormalized(string normalizedValue)
    {
        if (normalizedValue.Length == 0)
        {
            return MatchResult<TId>.Blank;
        }

        if (!_idsByKey.TryGetValue(normalizedValue, out var ids))
        {
            return MatchResult<TId>.Unknown;
        }

        return ids.Count == 1 ? MatchResult<TId>.Matched(ids.Min) : MatchResult<TId>.Ambiguous([.. ids]);
    }
}
