using System.Globalization;
using System.Text;

namespace BaxOrders.Application.Common;

/// <summary>
/// The Azerbaijani alphabetical order, for every list of object names the application shows.
/// </summary>
/// <remarks>
/// <para>
/// <b>The order.</b> a b c ç d e ə f g ğ h x ı i j k q l m n o ö p r s ş t u ü v y z — so "Çadır" comes after
/// "Bülbül parkı", "Xətai parkı" after "Hökumət evi", "İDEA" after it, and "Qala baza" before "Milli
/// Konservatoriya". Case is ignored for the order itself, and the Azerbaijani capitals are read as Azerbaijani:
/// "I" is the capital of "ı" and "İ" the capital of "i".
/// </para>
/// <para>
/// <b>Why it is written out rather than asked of the platform.</b> The same comparison used to be
/// <see cref="StringComparer.OrdinalIgnoreCase"/>, which orders by code point and so put every name beginning
/// with Ç, Ə or İ after Z. Asking the runtime for the "az" culture instead would give the right answer only on
/// a machine whose globalization data has it — a server running in invariant mode would quietly fall back to
/// the code-point order again. An alphabet of thirty-two letters is short enough to state, and a stated order
/// is the same on every machine and in every test.
/// </para>
/// <para>
/// Spaces come before punctuation, punctuation before digits and digits before letters, so "Qara Qarayev" sorts
/// before "Qarabağ". Two names the alphabet cannot tell apart are ordered by their exact text, so the order is
/// total and a list never reshuffles between two readings.
/// </para>
/// </remarks>
public static class AzerbaijaniCollation
{
    /// <summary>The alphabet, in order. "w" is not an Azerbaijani letter; it sits after "v", where it is met in borrowed names.</summary>
    private const string Alphabet = "abcçdeəfgğhxıijkqlmnoöprsştuüvwyz";

    public static IComparer<string> Comparer { get; } = new AzerbaijaniComparer();

    public static int Compare(string? left, string? right)
    {
        if (ReferenceEquals(left, right))
        {
            return 0;
        }

        if (left is null)
        {
            return -1;
        }

        if (right is null)
        {
            return 1;
        }

        var length = Math.Min(left.Length, right.Length);
        for (var index = 0; index < length; index++)
        {
            var order = Key(left[index]).CompareTo(Key(right[index]));
            if (order != 0)
            {
                return order;
            }
        }

        var byLength = left.Length.CompareTo(right.Length);
        return byLength != 0 ? byLength : string.CompareOrdinal(left, right);
    }

    /// <summary>Orders a sequence by a name, in the Azerbaijani order.</summary>
    public static IOrderedEnumerable<T> OrderByName<T>(this IEnumerable<T> source, Func<T, string> name) =>
        source.OrderBy(name, Comparer);

    /// <summary>The same, descending.</summary>
    public static IOrderedEnumerable<T> OrderByNameDescending<T>(this IEnumerable<T> source, Func<T, string> name) =>
        source.OrderByDescending(name, Comparer);

    /// <summary>A secondary order by name, for a sort whose first key can tie.</summary>
    public static IOrderedEnumerable<T> ThenByName<T>(this IOrderedEnumerable<T> source, Func<T, string> name) =>
        source.ThenBy(name, Comparer);

    /// <summary>Where one character falls: its kind first, then its place within the kind.</summary>
    private static (int Kind, int Place) Key(char character)
    {
        if (char.IsWhiteSpace(character))
        {
            return (0, 0);
        }

        var lower = Lower(character);
        var place = Alphabet.IndexOf(lower, StringComparison.Ordinal);
        if (place >= 0)
        {
            return (3, place);
        }

        if (char.IsDigit(character))
        {
            return (2, (int)char.GetNumericValue(character));
        }

        if (char.IsLetter(character))
        {
            // A letter from outside the alphabet ("é") files under the letter it is built on, and anything that
            // has no such letter goes after the alphabet rather than among it.
            var decomposed = lower.ToString().Normalize(NormalizationForm.FormD);
            var basePlace = Alphabet.IndexOf(decomposed[0], StringComparison.Ordinal);
            return basePlace >= 0 ? (3, basePlace) : (4, lower);
        }

        return (1, character);
    }

    /// <summary>Lower case the Azerbaijani way: "I" is the capital of "ı", "İ" the capital of "i".</summary>
    private static char Lower(char character) => character switch
    {
        'I' => 'ı',
        'İ' => 'i',
        _ => char.ToLower(character, CultureInfo.InvariantCulture),
    };

    private sealed class AzerbaijaniComparer : IComparer<string>
    {
        public int Compare(string? x, string? y) => AzerbaijaniCollation.Compare(x, y);
    }
}
