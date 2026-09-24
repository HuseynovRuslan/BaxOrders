using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Users;

namespace BaxOrders.ApprovalSandbox;

/// <summary>
/// Who the seed is acting as. Nobody at first; one of the test accounts for the workflow step it takes on
/// their behalf, so the history records that account exactly as it would record the person signing in.
/// </summary>
/// <remarks>
/// It stands where the signed-in session stands in the API. The services behind it are not relaxed for it:
/// they check the role and the identity they are given, as they always do.
/// </remarks>
internal sealed class SeedActor : ICurrentUserContext
{
    private UserDto? user;

    public bool IsAuthenticated => user is not null;

    public Guid? UserId => user?.Id;

    public string? UserName => user?.UserName;

    public string? DisplayName => user?.DisplayName;

    public string? Role => user?.Role;

    public void ActAs(UserDto? account) => user = account;
}
