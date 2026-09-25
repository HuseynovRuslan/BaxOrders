using System.Net;
using System.Net.Http.Json;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Catalog.ProductMatches;
using BaxOrders.Application.Users;
using BaxOrders.Domain.Catalog;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// Brief (Task 13), acceptance 6 and decision 13.2 over real HTTP, with real cookies and real antiforgery tokens:
/// "Rəhbər hesabı ilə təklifi təsdiqləyə bilmirəm" — nor can the Koordinator; only an administrator decides. Reading
/// the suggestions stays open to everybody signed in.
/// </summary>
/// <remarks>
/// The application runs against a database of its own, built from the migrations and dropped afterwards, holding the
/// brief's example. Every refusal comes from the production pipeline — nothing is relaxed for a test.
/// </remarks>
[Collection(PostgresCollection.Name)]
public sealed class ProductMatchAuthorityEndToEndTests : IAsyncLifetime
{
    private const string Base = "/api/v1/catalog/product-matches";

    private IsolatedDatabase? _database;
    private WebApplicationFactory<Program> _factory = null!;
    private ProductMatchFixture _fixture = null!;

    [PostgresFact]
    public async Task Only_an_administrator_approves_rejects_or_undoes_and_everybody_signed_in_reads()
    {
        using var rehber = await SignedInAsync(BaxOrdersRoles.Manager, "Sınaq rəhbəri");
        using var coordinator = await SignedInAsync(BaxOrdersRoles.Coordinator, "Sınaq koordinatoru");
        using var admin = await SignedInAsync(BaxOrdersRoles.Admin, "Sınaq administratoru");
        using var anonymous = AuthenticatedApi.Anonymous(_factory);

        var approve = new
        {
            kind = "Variant",
            sourceId = _fixture.Product("Sabun elano lavanda ətirli"),
            targetId = _fixture.Product("Sabun elano"),
        };
        var reject = new
        {
            kind = "SameItem",
            sourceId = _fixture.Variant("Kaplin 3\\4"),
            targetId = _fixture.Variant("Kaplin 3/4"),
        };

        // Everybody signed in reads the suggestions; nobody who is not signed in does.
        foreach (var reader in new[] { rehber, coordinator, admin })
        {
            var suggestions = await ReadAsync<ProductMatchSuggestionListDto>(reader, $"{Base}/suggestions?kind=Variant");
            Assert.Contains(suggestions.Suggestions.Items, item => item.Source.ProductName == "Sabun elano lavanda ətirli" && item.ProposedLabel == "lavanda ətirli");
            Assert.Equal(HttpStatusCode.OK, (await reader.GetAsync($"{Base}/decisions")).StatusCode);
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"{Base}/suggestions")).StatusCode);

        // The Rəhbər and the Koordinator are refused every decision; somebody not signed in is not even asked.
        foreach (var refused in new[] { rehber, coordinator })
        {
            await ExpectAsync(HttpStatusCode.Forbidden, AuthenticatedApi.PostAsync(refused, $"{Base}/approve", approve));
            await ExpectAsync(HttpStatusCode.Forbidden, AuthenticatedApi.PostAsync(refused, $"{Base}/reject", reject));
        }

        await ExpectAsync(HttpStatusCode.Unauthorized, AuthenticatedApi.PostAsync(anonymous, $"{Base}/approve", approve));
        await ExpectAsync(HttpStatusCode.Unauthorized, AuthenticatedApi.PostAsync(anonymous, $"{Base}/reject", reject));

        // The administrator decides.
        var approved = await SendAsync(admin, $"{Base}/approve", approve);
        Assert.Equal((ProductMatchKind.Variant, ProductMatchOutcome.Approved, "lavanda ətirli", "Sınaq administratoru"),
            (approved.Kind, approved.Outcome, approved.VariantLabel, approved.DecidedByDisplayName));
        var rejected = await SendAsync(admin, $"{Base}/reject", reject);
        Assert.Equal(ProductMatchOutcome.Rejected, rejected.Outcome);

        // Undoing is deciding too.
        foreach (var refused in new[] { rehber, coordinator })
        {
            await ExpectAsync(HttpStatusCode.Forbidden, AuthenticatedApi.PostAsync(refused, $"{Base}/decisions/{approved.Id}/undo", new { }));
        }

        await ExpectAsync(HttpStatusCode.Unauthorized, AuthenticatedApi.PostAsync(anonymous, $"{Base}/decisions/{approved.Id}/undo", new { }));

        var undone = await SendAsync(admin, $"{Base}/decisions/{approved.Id}/undo", new { reason = "səhv" });
        Assert.False(undone.IsLive);

        // The server's own refusals, with their statuses.
        await ExpectAsync(HttpStatusCode.Conflict, AuthenticatedApi.PostAsync(admin, $"{Base}/decisions/{approved.Id}/undo", new { }));
        await ExpectAsync(HttpStatusCode.UnprocessableEntity, AuthenticatedApi.PostAsync(admin, $"{Base}/approve", new
        {
            kind = "SameItem",
            sourceId = _fixture.Variant("Lampa 15 W"),
            targetId = _fixture.Variant("Kaplin 3/4"),
        }));
        await ExpectAsync(HttpStatusCode.NotFound, AuthenticatedApi.PostAsync(admin, $"{Base}/decisions/999999/undo", new { }));
        await ExpectAsync(HttpStatusCode.BadRequest, admin.GetAsync($"{Base}/suggestions?kind=Everything"));
    }

    [PostgresFact]
    public async Task Auth_me_says_only_an_administrator_decides_product_matches()
    {
        foreach (var (role, expected) in new[]
                 {
                     (BaxOrdersRoles.Admin, true), (BaxOrdersRoles.Manager, false), (BaxOrdersRoles.Coordinator, false),
                 })
        {
            var account = await AuthenticatedApi.CreateUserAsync(_factory, role, $"Sınaq {role}");
            using var client = AuthenticatedApi.Anonymous(_factory);

            var signedIn = await AuthenticatedApi.SignInAsync(client, account.UserName, account.Password);
            var me = await client.GetFromJsonAsync<CurrentUserDto>("/api/v1/auth/me");

            Assert.Equal(expected, signedIn.CanDecideProductMatches);
            Assert.Equal(expected, me!.CanDecideProductMatches);
        }

        using var anonymous = AuthenticatedApi.Anonymous(_factory);
        Assert.False((await anonymous.GetFromJsonAsync<CurrentUserDto>("/api/v1/auth/me"))!.CanDecideProductMatches);
    }

    public async Task InitializeAsync()
    {
        if (!PostgresDatabaseFixture.IsConfigured)
        {
            return;
        }

        _database = await IsolatedDatabase.CreateAsync("baxorders_match_http");
        await using (var db = _database.CreateContext())
        {
            _fixture = await ProductMatchFixture.CreateAsync(db);
        }

        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:BaxOrders", _database.ConnectionString);
        });
    }

    public async Task DisposeAsync()
    {
        if (_database is null)
        {
            return;
        }

        await _factory.DisposeAsync();
        await _database.DisposeAsync();
    }

    private async Task<HttpClient> SignedInAsync(string role, string displayName)
    {
        var account = await AuthenticatedApi.CreateUserAsync(_factory, role, displayName);
        var client = AuthenticatedApi.Anonymous(_factory);
        await AuthenticatedApi.SignInAsync(client, account.UserName, account.Password);
        return client;
    }

    private static async Task<T> ReadAsync<T>(HttpClient client, string url)
    {
        var response = await client.GetAsync(url);
        Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<T>(AuthenticatedApi.Json))!;
    }

    private static async Task<ProductMatchDecisionDto> SendAsync(HttpClient client, string url, object body)
    {
        var response = await AuthenticatedApi.PostAsync(client, url, body);
        Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<ProductMatchDecisionDto>(AuthenticatedApi.Json))!;
    }

    private static async Task ExpectAsync(HttpStatusCode expected, Task<HttpResponseMessage> call)
    {
        var response = await call;
        Assert.True(response.StatusCode == expected,
            $"Expected {(int)expected}, got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
    }
}
