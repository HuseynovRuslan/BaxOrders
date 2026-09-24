using BaxOrders.Application.Abstractions;
using Microsoft.AspNetCore.Identity;

namespace BaxOrders.Infrastructure.Identity;

/// <summary>Who can approve an order right now: active users whose role holds approval authority.</summary>
internal static class ActiveApprovers
{
    public static async Task<int> CountAsync(UserManager<ApplicationUser> users)
    {
        var count = 0;
        foreach (var role in BaxOrdersRoles.All.Where(ApprovalAuthority.IsHeldBy))
        {
            count += (await users.GetUsersInRoleAsync(role)).Count(user => user.IsActive);
        }

        return count;
    }
}
