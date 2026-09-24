using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.Infrastructure.Identity;

/// <summary>
/// Accounts, roles and the password rules, as one registration.
/// </summary>
/// <remarks>
/// The API signs people in on top of this; the approval sandbox creates its test accounts through it. Both
/// therefore hash with the same hasher and accept exactly the same passwords — a rule changed here is changed
/// for both, rather than for one of them.
/// </remarks>
public static class IdentitySetup
{
    public static IdentityBuilder AddBaxOrdersIdentity(this IServiceCollection services) =>
        services.AddIdentityCore<ApplicationUser>(ConfigurePolicy)
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<BaxOrdersDbContext>();

    private static void ConfigurePolicy(IdentityOptions options)
    {
        // Long enough to be worth something, without pushing people towards writing it down.
        options.Password.RequiredLength = 10;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;

        // Five wrong attempts costs fifteen minutes, which makes guessing a password impractical
        // without locking people out of their own account for a typo.
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.AllowedForNewUsers = true;

        // Internal application: people sign in with a user name, and an address is not required.
        options.User.RequireUniqueEmail = false;
        options.SignIn.RequireConfirmedAccount = false;
    }
}
