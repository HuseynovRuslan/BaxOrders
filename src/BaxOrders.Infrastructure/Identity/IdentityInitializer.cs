using BaxOrders.Application.Abstractions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BaxOrders.Infrastructure.Identity;

/// <summary>Where the first administrator's credentials come from. Never from a committed file.</summary>
public sealed class BootstrapAdminOptions
{
    public const string SectionName = "Auth:BootstrapAdmin";

    public string? UserName { get; set; }

    public string? DisplayName { get; set; }

    /// <summary>Supplied through user-secrets or an environment variable, and never logged.</summary>
    public string? Password { get; set; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(UserName) && !string.IsNullOrWhiteSpace(Password);
}

/// <summary>
/// Brings the roles into existence, and the first administrator if there is nobody at all.
/// </summary>
/// <remarks>
/// Roles are created at startup rather than seeded through a migration, so they carry no hard-coded
/// identifiers and creating them twice is harmless.
/// <para>
/// The first administrator is created <b>only when no user exists</b>, and only from configuration the
/// deployment supplies. No real person is written into source control, and once anybody exists this does
/// nothing at all — so it cannot quietly re-create an account somebody disabled on purpose.
/// </para>
/// </remarks>
public sealed class IdentityInitializer(
    RoleManager<IdentityRole<Guid>> roles,
    UserManager<ApplicationUser> users,
    ILogger<IdentityInitializer> logger)
{
    public async Task InitializeAsync(BootstrapAdminOptions bootstrap, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(bootstrap);

        foreach (var role in BaxOrdersRoles.All)
        {
            if (!await roles.RoleExistsAsync(role))
            {
                await roles.CreateAsync(new IdentityRole<Guid> { Id = Guid.NewGuid(), Name = role });
                logger.LogInformation("Created role {Role}.", role);
            }
        }

        if (await users.Users.AnyAsync(cancellationToken))
        {
            return;
        }

        if (!bootstrap.IsConfigured)
        {
            logger.LogWarning(
                "No users exist and {Section} is not configured, so nobody can sign in. "
                + "Set {Section}:UserName and {Section}:Password through user-secrets or the environment.",
                BootstrapAdminOptions.SectionName, BootstrapAdminOptions.SectionName, BootstrapAdminOptions.SectionName);
            return;
        }

        var admin = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = bootstrap.UserName!.Trim(),
            DisplayName = string.IsNullOrWhiteSpace(bootstrap.DisplayName)
                ? bootstrap.UserName!.Trim()
                : bootstrap.DisplayName!.Trim(),
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
        };

        var created = await users.CreateAsync(admin, bootstrap.Password!);
        if (!created.Succeeded)
        {
            // The reasons are safe to log; the password is not, and is not in them.
            logger.LogError(
                "Could not create the first administrator: {Errors}",
                string.Join("; ", created.Errors.Select(error => error.Description)));
            return;
        }

        await users.AddToRoleAsync(admin, BaxOrdersRoles.Admin);
        logger.LogInformation("Created the first administrator {UserName}.", admin.UserName);
    }
}
