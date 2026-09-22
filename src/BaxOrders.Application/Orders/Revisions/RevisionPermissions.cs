using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Orders.Revisions;

/// <summary>
/// Whether this person may correct this request now, worked out once so every screen gets the same answer.
/// </summary>
/// <remarks>
/// Like the workflow's allowed actions, this is what the screen is told to offer — not the protection. The
/// endpoints are closed to anybody without <see cref="BaxOrdersPolicies.CanReviseOrders"/>, and the domain
/// refuses a correction of anything but a returned request, or an edit of anything but a correction draft,
/// whatever this said.
/// </remarks>
public static class RevisionPermissions
{
    /// <summary>Coordinators and administrators put orders together; managers decide on them.</summary>
    public static bool MayRevise(ICurrentUserContext currentUser)
    {
        ArgumentNullException.ThrowIfNull(currentUser);
        return currentUser.IsAuthenticated
               && currentUser.Role is BaxOrdersRoles.Coordinator or BaxOrdersRoles.Admin;
    }

    /// <param name="hasRevision">A returned version is corrected once; the next correction is of the correction.</param>
    /// <param name="isLatestVersion">
    /// A version something newer has overtaken is not the one to correct: the newer one is what counts now.
    /// </param>
    public static bool CanCreate(
        OrderRequestStatus status, bool hasRevision, bool isLatestVersion, ICurrentUserContext currentUser) =>
        MayRevise(currentUser)
        && status == OrderRequestStatus.ReturnedForCorrection
        && !hasRevision
        && isLatestVersion;

    /// <summary>Only a correction draft is edited. Once it is submitted, it is a reviewed version like any other.</summary>
    public static bool CanEdit(OrderRequestStatus status, bool isRevision, ICurrentUserContext currentUser) =>
        MayRevise(currentUser) && isRevision && status == OrderRequestStatus.Draft;
}
