using BaxOrders.Application.Abstractions;
using BaxOrders.Infrastructure.Identity;
using BaxOrders.Infrastructure.Persistence;

namespace BaxOrders.IntegrationTests;

/// <summary>
/// A signed-in person, for tests that are about business behaviour rather than about signing in.
/// </summary>
/// <remarks>
/// It stands in for the authenticated principal, and for nothing else: the policies, the cookie and the
/// antiforgery token are exercised for real in the authentication tests. Production code is not weakened to
/// make anything here pass — this only supplies what the HTTP layer would have supplied.
/// <para>
/// The user it names is a real row, because an audit event points at one: an invented identifier would be
/// refused by the database, which is the behaviour we want and not something to work around.
/// </para>
/// </remarks>
public sealed class TestCurrentUser(Guid? userId, string? displayName, string? role) : ICurrentUserContext
{
    public bool IsAuthenticated => userId is not null;

    public Guid? UserId => userId;

    public string? UserName => displayName;

    public string? DisplayName => displayName;

    public string? Role => role;

    /// <summary>Nobody signed in, which every write must refuse.</summary>
    public static TestCurrentUser Anonymous() => new(null, null, null);

    /// <summary>Somebody who does not exist in the directory, for asserting the database's own guard.</summary>
    public static TestCurrentUser Unknown(string role) => new(Guid.NewGuid(), "Naməlum", role);

    public static Task<TestCurrentUser> CoordinatorAsync(BaxOrdersDbContext db, string displayName = "Koordinator") =>
        CreateAsync(db, BaxOrdersRoles.Coordinator, displayName);

    public static Task<TestCurrentUser> ManagerAsync(BaxOrdersDbContext db, string displayName = "Rəhbər") =>
        CreateAsync(db, BaxOrdersRoles.Manager, displayName);

    public static Task<TestCurrentUser> AdminAsync(BaxOrdersDbContext db, string displayName = "Administrator") =>
        CreateAsync(db, BaxOrdersRoles.Admin, displayName);

    /// <summary>The same person under a different role, for testing what a role changes and what it does not.</summary>
    public TestCurrentUser As(string role) => new(userId, displayName, role);

    private static async Task<TestCurrentUser> CreateAsync(BaxOrdersDbContext db, string role, string displayName)
    {
        // Written straight to the table: these tests are not about how an account is created, and no password
        // is involved. The authentication tests go through the real manager.
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = $"{role.ToLowerInvariant()}-{Guid.NewGuid():N}"[..24],
            NormalizedUserName = null,
            DisplayName = displayName,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            SecurityStamp = Guid.NewGuid().ToString("N"),
        };

        db.Set<ApplicationUser>().Add(user);
        await db.SaveChangesAsync();
        db.Entry(user).State = Microsoft.EntityFrameworkCore.EntityState.Detached;

        return new TestCurrentUser(user.Id, displayName, role);
    }
}
