using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using BaxOrders.Api;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Users;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.IntegrationTests;

/// <param name="Password">
/// Made up for one test run and never read from configuration, so nothing real is ever typed into a test.
/// </param>
public sealed record TestAccount(Guid Id, string UserName, string Password, string DisplayName);

/// <summary>
/// Drives the running application the way a browser does: sign in for a cookie, fetch an antiforgery token,
/// send it with every write.
/// </summary>
/// <remarks>
/// Nothing here goes around the security pipeline — that is the point of it. Accounts are created through
/// the real <see cref="IUserDirectory"/>, so passwords are hashed by Identity and the policy applies.
/// </remarks>
public static class AuthenticatedApi
{
    /// <summary>Long enough and mixed enough for the configured policy; synthetic, and thrown away after.</summary>
    public const string Password = "Sinaq-Sifre-2026";

    /// <summary>Reads an answer the way the browser does: camel case, and enums by name rather than number.</summary>
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public static HttpClient Anonymous(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

    public static async Task<TestAccount> CreateUserAsync(
        WebApplicationFactory<Program> factory, string role, string displayName, string? password = null)
    {
        var userName = $"{role.ToLowerInvariant()}-{Guid.NewGuid():N}"[..24];
        var chosen = password ?? Password;

        await using var scope = factory.Services.CreateAsyncScope();
        var directory = scope.ServiceProvider.GetRequiredService<IUserDirectory>();
        var (user, failure) = await directory.CreateAsync(
            new CreateUserCommand(userName, displayName, role, chosen), CancellationToken.None);

        Assert.Null(failure);
        return new TestAccount(user!.Id, userName, chosen, displayName);
    }

    /// <summary>Signs in and returns what the server says about the session it just issued.</summary>
    public static async Task<CurrentUserDto> SignInAsync(HttpClient client, string userName, string password)
    {
        var response = await PostAsync(client, "/api/v1/auth/login", new { userName, password });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CurrentUserDto>())!;
    }

    public static Task<HttpResponseMessage> TrySignInAsync(HttpClient client, string userName, string password) =>
        PostAsync(client, "/api/v1/auth/login", new { userName, password });

    /// <summary>A write the way the browser makes one: fetch the token first, then send it in the header.</summary>
    public static async Task<HttpResponseMessage> PostAsync(HttpClient client, string url, object body)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
        if (await AntiforgeryTokenAsync(client) is { } token)
        {
            request.Headers.Add(AntiforgerySetup.HeaderName, token);
        }

        return await client.SendAsync(request);
    }

    public static async Task<HttpResponseMessage> PatchAsync(HttpClient client, string url, object body)
    {
        var request = new HttpRequestMessage(HttpMethod.Patch, url) { Content = JsonContent.Create(body) };
        if (await AntiforgeryTokenAsync(client) is { } token)
        {
            request.Headers.Add(AntiforgerySetup.HeaderName, token);
        }

        return await client.SendAsync(request);
    }

    /// <summary>A write that uses the token the caller is already holding, the way a page does.</summary>
    public static async Task<HttpResponseMessage> PostWithTokenAsync(
        HttpClient client, string url, object body, string? token)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
        if (token is not null)
        {
            request.Headers.Add(AntiforgerySetup.HeaderName, token);
        }

        return await client.SendAsync(request);
    }

    /// <summary>The antiforgery token this response issued, or null if it issued none.</summary>
    public static string? TokenFrom(HttpResponseMessage response)
    {
        ArgumentNullException.ThrowIfNull(response);

        return response.Headers.TryGetValues("Set-Cookie", out var cookies)
            ? cookies.Select(cookie => cookie.Split(';')[0])
                .Where(cookie => cookie.StartsWith(AntiforgerySetup.RequestTokenCookieName, StringComparison.Ordinal))
                .Select(cookie => cookie[(cookie.IndexOf('=') + 1)..])
                .FirstOrDefault()
            : null;
    }

    private static async Task<string?> AntiforgeryTokenAsync(HttpClient client) =>
        TokenFrom(await client.GetAsync("/api/v1/auth/csrf"));
}
