namespace BaxOrders.Application.Abstractions;

/// <summary>
/// Who is signed in, as the application layer sees it.
/// </summary>
/// <remarks>
/// Application services ask this instead of reading the HTTP request: the actor of a workflow action comes
/// from the authenticated session and from nowhere else, and in particular never from something the browser
/// sent in a command body.
/// </remarks>
public interface ICurrentUserContext
{
    bool IsAuthenticated { get; }

    /// <summary>The signed-in user, or null when nobody is.</summary>
    Guid? UserId { get; }

    string? UserName { get; }

    /// <summary>The name to write into an audit trail as it reads right now.</summary>
    string? DisplayName { get; }

    /// <summary>The single business role this user holds, or null when nobody is signed in.</summary>
    string? Role { get; }
}

/// <summary>
/// The business roles. One per user — Identity could hold several, but the administration service allows one,
/// because "what may this person do" should have a single answer.
/// </summary>
public static class BaxOrdersRoles
{
    /// <summary>Runs the imports and sends orders for approval. Cannot decide on them.</summary>
    public const string Coordinator = "Coordinator";

    /// <summary>Decides on orders: approves or hands them back. Does not submit them.</summary>
    public const string Manager = "Manager";

    /// <summary>Everything the other two do, plus managing users — but still not deciding on their own submissions.</summary>
    public const string Admin = "Admin";

    public static readonly IReadOnlyList<string> All = [Coordinator, Manager, Admin];

    public static bool IsKnown(string? role) => role is not null && All.Contains(role);
}

/// <summary>
/// What each policy is called. Named for the capability rather than the role, so the roles behind one can
/// change without every endpoint changing with them.
/// </summary>
public static class BaxOrdersPolicies
{
    /// <summary>Uploading and reviewing imports, and confirming them into orders. Coordinator or Admin.</summary>
    public const string CanManageImports = nameof(CanManageImports);

    /// <summary>Sending an order for approval. Coordinator or Admin.</summary>
    public const string CanSubmitOrders = nameof(CanSubmitOrders);

    /// <summary>Approving an order or handing it back. Manager or Admin.</summary>
    public const string CanDecideOrders = nameof(CanDecideOrders);

    /// <summary>Creating users, changing their role and disabling them. Admin only.</summary>
    public const string CanManageUsers = nameof(CanManageUsers);
}
