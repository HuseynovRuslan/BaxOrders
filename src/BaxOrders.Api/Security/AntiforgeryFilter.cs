using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BaxOrders.Api.Security;

/// <summary>
/// Requires the antiforgery token on every request that changes something.
/// </summary>
/// <remarks>
/// Authentication is a cookie, which the browser attaches to any request to this origin — including one that
/// another site provoked. The token proves the request came from this application's own pages, because a
/// different origin cannot read the cookie it is derived from.
/// <para>
/// Applied globally rather than endpoint by endpoint, so a new write is protected by default and has to be
/// opted out of deliberately with <see cref="IgnoreAntiforgeryTokenAttribute"/>. MVC's own global filter
/// lives in the view infrastructure this application does not use, so the check is written out here instead.
/// </para>
/// </remarks>
internal sealed class AntiforgeryFilter(IAntiforgery antiforgery) : IAsyncAuthorizationFilter
{
    private static readonly HashSet<string> SafeMethods =
        new(StringComparer.OrdinalIgnoreCase) { "GET", "HEAD", "OPTIONS", "TRACE" };

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (SafeMethods.Contains(context.HttpContext.Request.Method))
        {
            return;
        }

        if (context.ActionDescriptor.EndpointMetadata.OfType<IgnoreAntiforgeryTokenAttribute>().Any())
        {
            // The endpoint opted out deliberately; that decision wins.
            return;
        }

        try
        {
            await antiforgery.ValidateRequestAsync(context.HttpContext);
        }
        catch (AntiforgeryValidationException)
        {
            context.Result = new BadRequestObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Antiforgery token required",
                Detail = "Sorğu təsdiq nişanı olmadan göndərilib. Səhifəni yeniləyib yenidən cəhd edin.",
            });
        }
    }
}
