namespace BaxOrders.Domain.Orders;

/// <summary>
/// Who performed a workflow action.
/// </summary>
/// <remarks>
/// Two things, because they answer two different questions. <see cref="UserId"/> is the stable identity used
/// to decide whether somebody may approve their own submission; <see cref="DisplayName"/> is the name as it
/// read <b>at that moment</b>, written into the audit trail and never touched again. If someone is renamed
/// later, what the history says about what they did does not change.
/// <para>
/// <see cref="UserId"/> is optional because not every action has a signed-in person behind it: the events
/// recorded before authentication existed have none, and a future system-generated action would have none
/// either. A missing id is a fact about the action, not a gap to be filled in with a guess.
/// </para>
/// </remarks>
public sealed record WorkflowActor(Guid? UserId, string DisplayName)
{
    /// <summary>An action taken by a signed-in person.</summary>
    public static WorkflowActor User(Guid userId, string displayName) => new(userId, displayName);

    /// <summary>An action with no person behind it. Shown as "Sistem" rather than attributed to anybody.</summary>
    public static WorkflowActor System(string displayName = "Sistem") => new(null, displayName);
}

/// <summary>
/// Raised when somebody tries to decide on a request they themselves submitted.
/// </summary>
/// <remarks>
/// It is not about trust: an approval is a second pair of eyes, and a request that its own submitter approved
/// has not had any. The rule holds whatever role the person has, including an administrator's. A later
/// resubmission makes whoever resubmitted it the one who may not decide — the rule follows the current
/// approval cycle, not the first one there ever was.
/// </remarks>
public sealed class SelfApprovalNotAllowedException(string action)
    : DomainException($"You cannot {action} a request you submitted yourself; somebody else has to look at it.");
