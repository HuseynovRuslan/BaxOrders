namespace BaxOrders.Application.Decisions;

/// <summary>
/// The product that did most of the primary cause, and how much of the movement in its direction it accounts for.
/// </summary>
/// <param name="Amount">
/// The variant's whole contribution — the figure its row in "Əsas dəyişikliklər" prints — never its quantity or
/// price part alone.
/// </param>
/// <param name="SameDirectionAmount">
/// Every variant's contribution that points the same way, whatever category it is filed under. Same sign as
/// <paramref name="Amount"/> and never smaller in size, so the share it is the denominator of never passes 100%.
/// </param>
public sealed record CauseLeaderResult(long ProductVariantId, decimal Amount, decimal SameDirectionAmount);

/// <summary>
/// Names the one product behind a cause, so a card can say "this rise is the tractor" rather than only "new
/// products" (owner decisions 7.1, 7.1a).
/// </summary>
/// <remarks>
/// <para>
/// <b>The product comes from inside the cause.</b> Only variants filed under the primary category and moving
/// its way are candidates: a larger variant filed elsewhere is somebody else's reason, and one in the same
/// category moving the other way is not a reason for this movement at all.
/// </para>
/// <para>
/// <b>The share is of every product moving that way.</b> The denominator is the sum over <i>all</i> variants
/// with the same sign — every category, "Qiymət yoxdur" and "Daxili təminat" included — never the primary
/// category's total. A category total is a net of rises and falls and can be smaller than the product inside
/// it, which is how a share would come to read 140%.
/// </para>
/// <para>
/// Pure arithmetic on a decomposition already in memory, and on the same cent figures the order page prints,
/// so a reader can check both numbers there.
/// </para>
/// </remarks>
public static class CauseLeader
{
    /// <returns>
    /// Null when there is no decomposition, no primary cause or a primary cause of zero, and when no variant filed
    /// under the primary cause points its way — the card then names no product rather than one from elsewhere.
    /// </returns>
    public static CauseLeaderResult? Of(
        CauseDecompositionResult? decomposition, CauseCategory? primary, decimal? primaryAmount)
    {
        if (decomposition is null || primary is not { } category || primaryAmount is not { } amount || amount == 0m)
        {
            return null;
        }

        var direction = Math.Sign(amount);

        VariantCauseResult? top = null;
        var sameDirection = 0m;
        foreach (var variant in decomposition.Variants)
        {
            if (Math.Sign(variant.AmountImpact) != direction)
            {
                continue;
            }

            sameDirection += variant.AmountImpact;

            // Largest effect first, then the lowest id: the order Decompose already sorts in, and so the first row
            // of this category and sign in the order page's list. Decided here rather than assumed from the input.
            if (variant.Category == category
                && (top is null
                    || Math.Abs(variant.AmountImpact) > Math.Abs(top.AmountImpact)
                    || (Math.Abs(variant.AmountImpact) == Math.Abs(top.AmountImpact)
                        && variant.ProductVariantId < top.ProductVariantId)))
            {
                top = variant;
            }
        }

        return top is null ? null : new CauseLeaderResult(top.ProductVariantId, top.AmountImpact, sameDirection);
    }
}
