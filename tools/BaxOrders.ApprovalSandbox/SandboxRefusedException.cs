namespace BaxOrders.ApprovalSandbox;

/// <summary>
/// The tool declined to do what it was asked, and changed nothing. The message says why and what to do; it
/// never carries a password.
/// </summary>
public sealed class SandboxRefusedException(string message) : Exception(message);
