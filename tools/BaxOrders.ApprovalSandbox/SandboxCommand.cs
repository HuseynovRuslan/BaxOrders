namespace BaxOrders.ApprovalSandbox;

/// <summary>The three things the tool can be asked to do. There is no fourth, and none of them takes SQL or a database name.</summary>
public enum SandboxCommand
{
    Create,
    Reset,
    Drop,
}

public static class SandboxCommands
{
    /// <returns>The command, or null for anything else — including a known command followed by more words.</returns>
    public static SandboxCommand? Parse(string[] args)
    {
        ArgumentNullException.ThrowIfNull(args);

        return args switch
        {
            ["--create"] => SandboxCommand.Create,
            ["--reset"] => SandboxCommand.Reset,
            ["--drop"] => SandboxCommand.Drop,
            _ => null,
        };
    }
}
