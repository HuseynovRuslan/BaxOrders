namespace BaxOrders.ApprovalSandbox;

/// <summary>
/// The password of the three test accounts: from the environment, and from nowhere that is committed.
/// </summary>
/// <remarks>
/// It is handed to Identity, which hashes it; it is never printed, logged or written anywhere else. Whoever
/// creates the sandbox chooses it and tells the testers.
/// </remarks>
public static class SandboxPassword
{
    public const string Variable = "BAXORDERS_SANDBOX_PASSWORD";

    /// <exception cref="SandboxRefusedException">No password was given. The message names the variable to set.</exception>
    public static string Require(string? password) =>
        string.IsNullOrWhiteSpace(password)
            ? throw new SandboxRefusedException(
                $"Set {Variable} to the password the test accounts should have (at least 10 characters, with a "
                + "digit and a lower-case letter). It is not stored in any file.")
            : password;
}
