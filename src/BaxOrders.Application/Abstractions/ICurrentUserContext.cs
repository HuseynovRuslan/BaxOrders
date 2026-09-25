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

    /// <summary>
    /// Rəhbər on screen. Decides on orders: approves them or asks for a correction. Does not submit them. The
    /// one role that holds approval authority — see <see cref="ApprovalAuthority"/>.
    /// </summary>
    public const string Manager = "Manager";

    /// <summary>
    /// Runs the imports, sends orders for approval, corrects them and manages users. Sees the approval queue,
    /// but holds no approval authority: being an administrator does not make somebody an approver.
    /// </summary>
    public const string Admin = "Admin";

    public static readonly IReadOnlyList<string> All = [Coordinator, Manager, Admin];

    public static bool IsKnown(string? role) => role is not null && All.Contains(role);
}

/// <summary>
/// Who may approve an order or ask for its correction. The one answer to that question: the endpoint policy,
/// the service, the actions a screen is offered and <c>/auth/me</c> all ask this and nothing else.
/// </summary>
/// <remarks>
/// Authority belongs to a role, not to a person, and only the Rəhbər role (stored as <see cref="BaxOrdersRoles.Manager"/>)
/// holds it. An administrator does not get it by being an administrator. Giving it to another role later is a
/// change to this one line.
/// </remarks>
public static class ApprovalAuthority
{
    public static bool IsHeldBy(string? role) => role is BaxOrdersRoles.Manager;

    /// <summary>
    /// Who may look at the queue of orders waiting for a decision: whoever holds the authority, and an
    /// administrator, who sees it without the authority to act on it.
    /// </summary>
    public static bool MayViewQueue(string? role) => IsHeldBy(role) || role is BaxOrdersRoles.Admin;
}

/// <summary>
/// Who may approve or reject a product match and undo one, and save an alternative product name (13.2). The one
/// answer to that question: the endpoint policy, the services, the import review and <c>/auth/me</c> all ask this.
/// </summary>
/// <remarks>
/// The owner's rule is "admin or data manager". There is no data-manager role, and deciding that some other role
/// is one would be a business fact nobody stated, so today it is the administrator alone. Naming a data-manager
/// role later is a change to this one line.
/// </remarks>
public static class ProductMatchAuthority
{
    public static bool IsHeldBy(string? role) => role is BaxOrdersRoles.Admin;
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

    /// <summary>Approving an order or asking for its correction. Only a role holding <see cref="ApprovalAuthority"/>.</summary>
    public const string CanDecideOrders = nameof(CanDecideOrders);

    /// <summary>
    /// Reading the queue of orders waiting for a decision. Manager or Admin: an administrator keeps seeing the
    /// queue, without the authority to decide on anything in it.
    /// </summary>
    public const string CanViewApprovals = nameof(CanViewApprovals);

    /// <summary>
    /// Making the correction version of a returned order, and editing it while it is a draft. Coordinator or
    /// Admin — the people who put orders together, not the ones who decide on them.
    /// </summary>
    public const string CanReviseOrders = nameof(CanReviseOrders);

    /// <summary>Creating users, changing their role and disabling them. Admin only.</summary>
    public const string CanManageUsers = nameof(CanManageUsers);

    /// <summary>
    /// Deciding what the catalog itself says — which category a product belongs to. Coordinator or Admin: the
    /// people who put the catalog together, not the ones who decide on the orders made from it. Reading the
    /// catalog needs no policy; only changing what it claims does.
    /// </summary>
    public const string CanManageCatalog = nameof(CanManageCatalog);

    /// <summary>
    /// Approving or rejecting a product match, and undoing one. Only a role holding
    /// <see cref="ProductMatchAuthority"/>.
    /// </summary>
    public const string CanDecideProductMatches = nameof(CanDecideProductMatches);
}
