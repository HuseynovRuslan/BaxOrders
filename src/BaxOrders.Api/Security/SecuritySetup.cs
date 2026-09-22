using BaxOrders.Api.Security;
using BaxOrders.Application.Abstractions;
using BaxOrders.Infrastructure.Identity;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace BaxOrders.Api;

/// <summary>Names the antiforgery pieces the SPA and the server agree on.</summary>
public static class AntiforgerySetup
{
    /// <summary>The header the browser puts the request token in.</summary>
    public const string HeaderName = "X-CSRF-TOKEN";

    /// <summary>The cookie the page's own script reads that token from. Not a credential on its own.</summary>
    public const string RequestTokenCookieName = "BAXORDERS-CSRF";
}

internal static class SecuritySetup
{
    /// <summary>
    /// Sign-in, roles and the rule that the business API is closed unless a page says otherwise.
    /// </summary>
    /// <remarks>
    /// Authentication is a cookie rather than a token in browser storage: an <c>HttpOnly</c> cookie cannot be
    /// read by a script, so a cross-site script injection cannot walk off with the session. The cost of that
    /// choice is that the browser attaches it to every request to this origin, including ones another site
    /// provoked — which is what the antiforgery token is for.
    /// </remarks>
    public static IServiceCollection AddBaxOrdersSecurity(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddIdentityCore<ApplicationUser>(options =>
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
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<BaxOrdersDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();

        services.AddAuthentication(IdentityConstants.ApplicationScheme)
            .AddCookie(IdentityConstants.ApplicationScheme, options =>
            {
                options.Cookie.Name = "BaxOrders.Auth";
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.Strict;
                // Always secure where the request is; development over plain HTTP still works.
                options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
                options.ExpireTimeSpan = TimeSpan.FromHours(10);
                options.SlidingExpiration = true;

                // An API answers with a status code. Redirecting a fetch() to an HTML sign-in page would give
                // the caller a 200 full of markup and no way to tell what happened.
                options.Events.OnRedirectToLogin = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return Task.CompletedTask;
                };
                options.Events.OnRedirectToAccessDenied = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                };
            });

        // How long a disabled account's existing session can outlive the decision to disable it.
        services.Configure<SecurityStampValidatorOptions>(options =>
            options.ValidationInterval = TimeSpan.FromMinutes(5));

        services.AddAuthorizationBuilder()
            .AddPolicy(BaxOrdersPolicies.CanManageImports, policy =>
                policy.RequireRole(BaxOrdersRoles.Coordinator, BaxOrdersRoles.Admin))
            .AddPolicy(BaxOrdersPolicies.CanSubmitOrders, policy =>
                policy.RequireRole(BaxOrdersRoles.Coordinator, BaxOrdersRoles.Admin))
            .AddPolicy(BaxOrdersPolicies.CanDecideOrders, policy =>
                policy.RequireRole(BaxOrdersRoles.Manager, BaxOrdersRoles.Admin))
            .AddPolicy(BaxOrdersPolicies.CanManageUsers, policy =>
                policy.RequireRole(BaxOrdersRoles.Admin))
            // Everything is closed unless it says otherwise. A new endpoint is private by forgetting to think
            // about it, which is the right way round.
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

        services.AddAntiforgery(options =>
        {
            options.HeaderName = AntiforgerySetup.HeaderName;
            options.Cookie.Name = "BaxOrders.Antiforgery";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        });

        // Applied to every controller, so no write can be reached without the token by being overlooked.
        services.Configure<MvcOptions>(options =>
            options.Filters.Add<AntiforgeryFilter>());

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserContext, HttpCurrentUserContext>();
        services.AddScoped<IUserDirectory, IdentityUserDirectory>();
        services.AddScoped<IdentityInitializer>();

        services.AddOptions<BootstrapAdminOptions>()
            .Bind(configuration.GetSection(BootstrapAdminOptions.SectionName));

        return services;
    }

    /// <summary>
    /// Adds the display name to the sign-in cookie, so an audit entry can be written without a database read.
    /// </summary>
    public static IServiceCollection AddDisplayNameClaim(this IServiceCollection services)
    {
        services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, DisplayNameClaimsPrincipalFactory>();
        return services;
    }
}

/// <summary>Puts the user's display name into their principal alongside the identity Identity provides.</summary>
internal sealed class DisplayNameClaimsPrincipalFactory(
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager,
    Microsoft.Extensions.Options.IOptions<IdentityOptions> options)
    : UserClaimsPrincipalFactory<ApplicationUser, IdentityRole<Guid>>(userManager, roleManager, options)
{
    protected override async Task<System.Security.Claims.ClaimsIdentity> GenerateClaimsAsync(ApplicationUser user)
    {
        var identity = await base.GenerateClaimsAsync(user);
        identity.AddClaim(new System.Security.Claims.Claim(
            HttpCurrentUserContext.DisplayNameClaim,
            string.IsNullOrWhiteSpace(user.DisplayName) ? user.UserName ?? string.Empty : user.DisplayName));

        return identity;
    }
}
