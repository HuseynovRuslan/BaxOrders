using BaxOrders.Application.Users;

namespace BaxOrders.Application.Abstractions;

/// <summary>
/// Managing the people who use the system.
/// </summary>
/// <remarks>
/// The application layer states what it needs; the identity framework's own types stay behind the
/// implementation. There is deliberately no delete: a workflow event can name a user forever, so an account
/// that should stop working is deactivated.
/// </remarks>
public interface IUserDirectory
{
    Task<IReadOnlyList<UserDto>> ListAsync(CancellationToken cancellationToken);

    /// <returns>Null when there is no such user.</returns>
    Task<UserDto?> FindAsync(Guid userId, CancellationToken cancellationToken);

    /// <returns>The new user, or the reasons it could not be created.</returns>
    Task<(UserDto? User, IdentityFailure? Failure)> CreateAsync(
        CreateUserCommand command, CancellationToken cancellationToken);

    /// <returns>The updated user, or the reasons it could not be updated. Null user with null failure means it does not exist.</returns>
    Task<(UserDto? User, IdentityFailure? Failure)> UpdateAsync(
        Guid userId, UpdateUserCommand command, CancellationToken cancellationToken);

    /// <summary>Sets a new password through the framework's own rules; the hash is never written directly.</summary>
    Task<IdentityFailure?> ResetPasswordAsync(Guid userId, string newPassword, CancellationToken cancellationToken);

    Task<IdentityFailure?> ChangeOwnPasswordAsync(
        Guid userId, ChangeOwnPasswordCommand command, CancellationToken cancellationToken);
}
