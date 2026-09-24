using BaxOrders.Application.Imports;

namespace BaxOrders.Application.Approvals;

/// <summary>
/// Whether a request can be decided by the person reading the inbox, or is only shown to them.
/// </summary>
/// <remarks>
/// A Manager or Admin sees every waiting request, including one they may not decide on — they hold no approval
/// authority, they submitted it, or they worked on its correction. <see cref="CanDecide"/> and
/// <see cref="BlockedForMe"/> read off exactly the same <c>CanApprove</c> flag the workflow endpoint computes;
/// nothing here is a second opinion about who may act.
/// </remarks>
public enum ApprovalActionability
{
    All = 1,
    CanDecide = 2,
    BlockedForMe = 3,
}

/// <summary>Whether every line of the request has a known price.</summary>
public enum ApprovalPriceCoverage
{
    Complete = 1,
    Incomplete = 2,
}

/// <summary>Whether the request is an ordinary submission or the correction of a returned one.</summary>
public enum ApprovalRevisionFilter
{
    All = 1,
    Original = 2,
    Revision = 3,
}

/// <summary>
/// What the inbox may be ordered by. Every option is a plain fact about the row; the default is the oldest
/// submission, because this is a work queue, not a ranking of what is most urgent or most valuable.
/// </summary>
public enum ApprovalInboxSort
{
    SubmittedAtUtc = 1,
    LocationName = 2,
    RequestPeriod = 3,
    KnownAmount = 4,
    MissingPriceItemCount = 5,
}

/// <param name="Period">A month in the form <c>yyyy-MM</c>, or null for every month.</param>
/// <param name="Sort">Default is the oldest submission first: a work queue, not a ranking.</param>
public sealed record ApprovalInboxQuery(
    string? Search = null,
    string? Period = null,
    ApprovalActionability Actionability = ApprovalActionability.All,
    ApprovalPriceCoverage? PriceCoverage = null,
    ApprovalRevisionFilter Revision = ApprovalRevisionFilter.All,
    ApprovalInboxSort Sort = ApprovalInboxSort.SubmittedAtUtc,
    bool Descending = false,
    int Page = 1,
    int PageSize = 25);

/// <summary>
/// One request waiting for a decision.
/// </summary>
/// <param name="SubmittedByDisplayName">
/// The name of whoever put this request into its current approval cycle, as it read at the time they did —
/// the same snapshot the workflow history keeps, never a live lookup that would change under a renamed user.
/// </param>
/// <param name="KnownAmount">Money over the priced lines only, and null when nothing is priced. Never a total padded with zeros.</param>
/// <param name="AmountIsComplete">False as soon as one line has no price; the amount above is then partial, not the whole request.</param>
/// <param name="IsRevision">True when this request is the correction of a request that was returned.</param>
/// <param name="SourceVersion">The version this one corrects, when <paramref name="IsRevision"/> is true.</param>
/// <param name="SourceOrderRequestId">The corrected request's id, when <paramref name="IsRevision"/> is true.</param>
/// <param name="CanApprove">
/// Whether the person reading the inbox may approve this request right now. Computed by the exact same rule
/// the workflow endpoint uses — not a second, independent opinion.
/// </param>
/// <param name="BlockedBySelfApproval">True when the only thing stopping a decision is that they submitted it themselves.</param>
/// <param name="BlockedByOwnContribution">True when the only thing stopping a decision is that they worked on this correction.</param>
/// <param name="BlockedByMissingAuthority">True when they hold no approval authority. Reported before the other two reasons.</param>
public sealed record ApprovalInboxRowDto(
    long OrderRequestId,
    int LocationId,
    string LocationCode,
    string LocationName,
    DateOnly RequestPeriod,
    int Version,
    DateTime SubmittedAtUtc,
    Guid? SubmittedByUserId,
    string SubmittedByDisplayName,
    int ItemCount,
    decimal? KnownAmount,
    int MissingPriceItemCount,
    bool AmountIsComplete,
    bool IsRevision,
    int? SourceVersion,
    long? SourceOrderRequestId,
    bool CanApprove,
    bool CanReturn,
    bool BlockedBySelfApproval,
    bool BlockedByOwnContribution,
    bool BlockedByMissingAuthority);

/// <summary>
/// The whole inbox, whatever search or filter the caller applied.
/// </summary>
/// <remarks>
/// Every count here is over the <b>complete</b> set of requests waiting for a decision, not the page and not
/// the filtered view — the same convention the management dashboard's summary follows, for the same reason: a
/// manager glancing at the header should see the true size of the queue, not a number that shrinks because
/// they typed into the search box.
/// </remarks>
public sealed record ApprovalInboxSummaryDto(
    int PendingCount,
    int ActionableByCurrentUserCount,
    int BlockedForCurrentUserCount,
    int MissingPriceRequestCount,
    int MissingPriceItemCount,
    int RevisionCount);

/// <param name="FilteredCount">How many requests the search and filters left, before paging.</param>
public sealed record ApprovalInboxDto(
    ApprovalInboxSummaryDto Summary,
    int FilteredCount,
    PagedResult<ApprovalInboxRowDto> Rows);
