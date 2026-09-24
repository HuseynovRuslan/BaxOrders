using BaxOrders.Api.Security;
using BaxOrders.Application.Abstractions;
using BaxOrders.Infrastructure.Identity;
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
        // The password rules live with the accounts, so the approval sandbox creates its test accounts under
        // exactly the rules the users page applies.
        services.AddBaxOrdersIdentity()
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
            // Built from the one definition of approval authority rather than from a list of roles here, so the
            // endpoint, the service and the screens cannot disagree about who may decide.
            .AddPolicy(BaxOrdersPolicies.CanDecideOrders, policy =>
                policy.RequireAssertion(context =>
                    BaxOrdersRoles.All.Any(role => ApprovalAuthority.IsHeldBy(role) && context.User.IsInRole(role))))
            // Looking at the queue is not deciding on it: an administrator keeps the page, read-only.
            .AddPolicy(BaxOrdersPolicies.CanViewApprovals, policy =>
                policy.RequireAssertion(context =>
                    BaxOrdersRoles.All.Any(role => ApprovalAuthority.MayViewQueue(role) && context.User.IsInRole(role))))
            // Correcting a returned order is putting an order together again, so it belongs with submitting —
            // not with deciding, which is why this is its own policy rather than a reuse of CanDecideOrders.
            .AddPolicy(BaxOrdersPolicies.CanReviseOrders, policy =>
                policy.RequireRole(BaxOrdersRoles.Coordinator, BaxOrdersRoles.Admin))
            .AddPolicy(BaxOrdersPolicies.CanManageUsers, policy =>
                policy.RequireRole(BaxOrdersRoles.Admin))
            // Curating the catalog is putting the source material together, so it belongs with importing and
            // revising rather than with deciding on orders. A manager reads the catalog; they do not shape it.
            .AddPolicy(BaxOrdersPolicies.CanManageCatalog, policy =>
                policy.RequireRole(BaxOrdersRoles.Coordinator, BaxOrdersRoles.Admin))
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
