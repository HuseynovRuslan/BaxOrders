using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Infrastructure.Identity;

/// <summary>
/// User administration on top of ASP.NET Core Identity.
/// </summary>
/// <remarks>
/// Every password goes through <see cref="UserManager{TUser}"/>, so the framework's hashing and its password
/// rules apply; nothing here touches a hash. A user always holds exactly one business role — Identity would
/// allow several, but "what may this person do" should have one answer.
/// </remarks>
public sealed class IdentityUserDirectory(UserManager<ApplicationUser> users) : IUserDirectory
{
    /// <summary>Said when the change would leave nobody who can approve an order.</summary>
    public const string LastApproverMessage =
        "Bu, təsdiq səlahiyyəti olan yeganə aktiv istifadəçidir. Əvvəlcə başqa bir Rəhbər təyin edin.";

    public async Task<IReadOnlyList<UserDto>> ListAsync(CancellationToken cancellationToken)
    {
        var all = await users.Users.AsNoTracking().OrderBy(user => user.UserName).ToListAsync(cancellationToken);

        var described = new List<UserDto>(all.Count);
        foreach (var user in all)
        {
            described.Add(await DescribeAsync(user));
        }

        return described;
    }

    public async Task<UserDto?> FindAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        return user is null ? null : await DescribeAsync(user);
    }

    public async Task<(UserDto? User, IdentityFailure? Failure)> CreateAsync(
        CreateUserCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        if (!BaxOrdersRoles.IsKnown(command.Role))
        {
            return (null, Failed($"'{command.Role}' is not a role this system has."));
        }

        var displayName = command.DisplayName?.Trim();
        if (string.IsNullOrEmpty(displayName))
        {
            return (null, Failed("A display name is required."));
        }

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = command.UserName?.Trim(),
            DisplayName = displayName,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
        };

        var created = await users.CreateAsync(user, command.Password);
        if (!created.Succeeded)
        {
            return (null, Failure(created));
        }

        var assigned = await users.AddToRoleAsync(user, command.Role);
        if (!assigned.Succeeded)
        {
            // The account is useless without its role; leaving it behind would be worse than not creating it.
            await users.DeleteAsync(user);
            return (null, Failure(assigned));
        }

        return (await DescribeAsync(user), null);
    }

    public async Task<(UserDto? User, IdentityFailure? Failure)> UpdateAsync(
        Guid userId, UpdateUserCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return (null, null);
        }

        // Checked before anything is changed, so a refusal leaves the account exactly as it was.
        if (await WouldLeaveNobodyToApproveAsync(user, command))
        {
            return (null, Failed(LastApproverMessage));
        }

        if (command.DisplayName is { } displayName)
        {
            var trimmed = displayName.Trim();
            if (trimmed.Length == 0)
            {
                return (null, Failed("A display name is required."));
            }

            // Only what is shown from now on. Past audit entries keep the name they were written with.
            user.DisplayName = trimmed;
        }

        if (command.IsActive is { } isActive)
        {
            user.IsActive = isActive;
        }

        var updated = await users.UpdateAsync(user);
        if (!updated.Succeeded)
        {
            return (null, Failure(updated));
        }

        if (command.Role is { } role)
        {
            if (!BaxOrdersRoles.IsKnown(role))
            {
                return (null, Failed($"'{role}' is not a role this system has."));
            }

            var current = await users.GetRolesAsync(user);
            var removed = await users.RemoveFromRolesAsync(user, current);
            if (!removed.Succeeded)
            {
                return (null, Failure(removed));
            }

            var assigned = await users.AddToRoleAsync(user, role);
            if (!assigned.Succeeded)
            {
                return (null, Failure(assigned));
            }
        }

        // A disabled account, or one whose role changed, must stop working on its existing session too.
        if (command.IsActive is false || command.Role is not null)
        {
            await users.UpdateSecurityStampAsync(user);
        }

        return (await DescribeAsync(user), null);
    }

    public Task<int> CountActiveApproversAsync(CancellationToken cancellationToken) =>
        ActiveApprovers.CountAsync(users);

    /// <summary>
    /// True when this change would take the last active approver away: disabling them, or giving them a role
    /// without approval authority.
    /// </summary>
    private async Task<bool> WouldLeaveNobodyToApproveAsync(ApplicationUser user, UpdateUserCommand command)
    {
        if (!user.IsActive)
        {
            return false;
        }

        var currentRoles = await users.GetRolesAsync(user);
        if (!currentRoles.Any(ApprovalAuthority.IsHeldBy))
        {
            return false;
        }

        var disabling = command.IsActive is false;
        var losingAuthority = command.Role is { } role && !ApprovalAuthority.IsHeldBy(role);
        if (!disabling && !losingAuthority)
        {
            return false;
        }

        return await ActiveApprovers.CountAsync(users) <= 1;
    }

    public async Task<IdentityFailure?> ResetPasswordAsync(
        Guid userId, string newPassword, CancellationToken cancellationToken)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return Failed("No such user.");
        }

        // Through the framework's own reset, so its password rules are applied and the hash is its business.
        var token = await users.GeneratePasswordResetTokenAsync(user);
        var result = await users.ResetPasswordAsync(user, token, newPassword);
        return result.Succeeded ? null : Failure(result);
    }

    public async Task<IdentityFailure?> ChangeOwnPasswordAsync(
        Guid userId, ChangeOwnPasswordCommand command, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return Failed("No such user.");
        }

        var result = await users.ChangePasswordAsync(user, command.CurrentPassword, command.NewPassword);
        return result.Succeeded ? null : Failure(result);
    }

    private async Task<UserDto> DescribeAsync(ApplicationUser user)
    {
        var roles = await users.GetRolesAsync(user);
        return new UserDto(
            user.Id,
            user.UserName ?? string.Empty,
            user.DisplayName,
            roles.FirstOrDefault() ?? string.Empty,
            user.IsActive,
            user.CreatedAtUtc,
            user.LockoutEnd);
    }

    private static IdentityFailure Failure(IdentityResult result) =>
        new([.. result.Errors.Select(error => error.Description)]);

    private static IdentityFailure Failed(string message) => new([message]);
}
