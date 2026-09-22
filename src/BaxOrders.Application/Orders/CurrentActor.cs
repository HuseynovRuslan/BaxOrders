using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Common;
using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Orders;

/// <summary>The person acting on an order, taken from the session and from nowhere else.</summary>
internal static class CurrentActor
{
    /// <remarks>
    /// Endpoints require authentication, so an anonymous caller never reaches a service; if one somehow did,
    /// refusing is the only safe answer. Nothing a browser sends in a command body is ever used as the actor.
    /// </remarks>
    public static WorkflowActor Of(ICurrentUserContext currentUser, string whenAnonymous) =>
        currentUser is { IsAuthenticated: true, UserId: { } userId }
            ? WorkflowActor.User(userId, currentUser.DisplayName ?? currentUser.UserName ?? userId.ToString())
            : throw new ForbiddenException(whenAnonymous);
}
