namespace BaxOrders.Domain.Orders;

public enum OrderRequestStatus
{
    Draft = 1,
    PendingApproval = 2,
    Approved = 3,
    Rejected = 4,
}
