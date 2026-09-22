using Microsoft.AspNetCore.Identity;

namespace BaxOrders.Infrastructure.Identity;

/// <summary>
/// Somebody who uses the system.
/// </summary>
/// <remarks>
/// Everything about credentials — the password hash, the security stamp, lockout — belongs to ASP.NET Core
/// Identity and is not reimplemented here. This type adds only what the business needs: the name shown on
/// screen and in audit trails, and whether the account is still in use.
/// <para>
/// A user is never deleted. A workflow event can name one forever, and deleting the user would either
/// destroy that history or leave it pointing at nothing, so an account that should stop working is
/// deactivated instead.
/// </para>
/// </remarks>
public sealed class ApplicationUser : IdentityUser<Guid>
{
    public const int DisplayNameMaxLength = 200;

    /// <summary>
    /// The name written into audit trails and shown in the header. Changing it does not rewrite the history:
    /// each event keeps the name as it read when the action happened.
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// False disables the account. Signing in is refused, and an existing session stops working once its
    /// security stamp is next validated.
    /// </summary>
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; }
}
