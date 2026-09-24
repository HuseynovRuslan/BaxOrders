namespace BaxOrders.Application.Users;

/// <summary>One user as the administration screen lists them. Nothing about credentials ever appears here.</summary>
public sealed record UserDto(
    Guid Id,
    string UserName,
    string DisplayName,
    string Role,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTimeOffset? LockoutEndUtc);

/// <summary>Who is signed in, as the browser is told.</summary>
/// <param name="IsAuthenticated">False for an anonymous caller; everything else is then null.</param>
/// <param name="CanDecideOrders">Whether they hold approval authority. Only the Rəhbər role does.</param>
/// <param name="CanViewApprovals">
/// Whether they may open the queue of orders waiting for a decision — wider than deciding: an administrator
/// sees the queue without the authority to act on it.
/// </param>
public sealed record CurrentUserDto(
    bool IsAuthenticated,
    Guid? UserId,
    string? UserName,
    string? DisplayName,
    string? Role,
    bool CanManageImports,
    bool CanSubmitOrders,
    bool CanDecideOrders,
    bool CanManageUsers,
    bool CanManageCatalog,
    bool CanViewApprovals);

/// <summary>Whether anybody can approve an order right now.</summary>
/// <param name="ActiveApproverCount">Active users whose role holds approval authority. Zero means nobody can approve.</param>
public sealed record ApprovalAuthorityStatusDto(int ActiveApproverCount);

public sealed record CreateUserCommand(string UserName, string DisplayName, string Role, string Password);

/// <param name="Role">Omitted leaves the role as it is; a user always holds exactly one.</param>
public sealed record UpdateUserCommand(string? DisplayName = null, string? Role = null, bool? IsActive = null);

public sealed record ResetPasswordCommand(string NewPassword);

public sealed record ChangeOwnPasswordCommand(string CurrentPassword, string NewPassword);

/// <summary>
/// Why an identity operation failed, in terms the caller can act on.
/// </summary>
/// <remarks>
/// Identity's own error codes are not surfaced: a password rejected for its length and one rejected for its
/// characters are the same problem to the person typing it, and the messages come back already worded.
/// </remarks>
public sealed record IdentityFailure(IReadOnlyList<string> Errors)
{
    public string Message => string.Join(" ", Errors);
}
