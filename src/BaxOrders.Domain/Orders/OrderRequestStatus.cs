namespace BaxOrders.Domain.Orders;

/// <summary>
/// Where a request stands in the approval workflow.
/// </summary>
/// <remarks>
/// <see cref="ReturnedForCorrection"/> is not a refusal: it is a request handed back so that it can be put
/// right and submitted again, which is what the business actually does with an order it disagrees with.
/// <see cref="Approved"/> is the end of the road — an approved month is corrected by a new version of the
/// request, never by reopening the one that was approved.
/// </remarks>
public enum OrderRequestStatus
{
    Draft = 1,
    PendingApproval = 2,
    Approved = 3,
    ReturnedForCorrection = 4,
}
