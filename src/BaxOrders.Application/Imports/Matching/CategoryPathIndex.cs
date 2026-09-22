using BaxOrders.Domain.Normalization;

namespace BaxOrders.Application.Imports.Matching;

/// <summary>
/// Matches category columns as a path from the root ("Təmizlik" → "Təmizlik ləvazimatı" → "Əlcək"),
/// never by the last name alone. Only paths whose every node is active are matchable.
/// </summary>
public sealed class CategoryPathIndex
{
    private const char Separator = '';

    private readonly Dictionary<string, int> _idByPath = new(StringComparer.Ordinal);

    public void Build(IEnumerable<(int Id, int? ParentId, string NormalizedName, bool IsActive)> categories)
    {
        var byId = categories.ToDictionary(category => category.Id);
        _idByPath.Clear();

        foreach (var category in byId.Values)
        {
            var names = new List<string>();
            var current = category;
            var usable = true;

            // The depth guard protects against corrupt data; the domain never creates cycles.
            for (var depth = 0; depth <= byId.Count; depth++)
            {
                if (!current.IsActive)
                {
                    usable = false;
                    break;
                }

                names.Add(current.NormalizedName);
                if (current.ParentId is not { } parentId)
                {
                    break;
                }

                if (!byId.TryGetValue(parentId, out current))
                {
                    usable = false;
                    break;
                }
            }

            if (usable)
            {
                names.Reverse();
                _idByPath[string.Join(Separator, names)] = category.Id;
            }
        }
    }

    /// <summary>
    /// Resolves the path formed by the non-blank levels. A blank level between filled levels makes the path
    /// unknown, because the hierarchy cannot be determined.
    /// </summary>
    public MatchResult<int> Resolve(params string?[] levels)
    {
        var normalized = levels.Select(TextNormalizer.Normalize).ToList();
        var lastFilled = normalized.FindLastIndex(level => level.Length > 0);
        if (lastFilled < 0)
        {
            return MatchResult<int>.Blank;
        }

        var path = normalized.Take(lastFilled + 1).ToList();
        if (path.Any(level => level.Length == 0))
        {
            return MatchResult<int>.Unknown;
        }

        return _idByPath.TryGetValue(string.Join(Separator, path), out var id)
            ? MatchResult<int>.Matched(id)
            : MatchResult<int>.Unknown;
    }
}
