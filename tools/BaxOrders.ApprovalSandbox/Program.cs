namespace BaxOrders.ApprovalSandbox;

/// <summary>
/// Task 4b: the test environment of the approval flow — a separate database of synthetic orders, where an
/// order can be sent, returned, corrected and approved without any of it reaching the company's data.
/// </summary>
/// <remarks>
/// <code>
///   dotnet run --project tools/BaxOrders.ApprovalSandbox -- --create   create baxorders_sandbox, migrate, seed
///   dotnet run --project tools/BaxOrders.ApprovalSandbox -- --reset    drop it and create it again, as new
///   dotnet run --project tools/BaxOrders.ApprovalSandbox -- --drop     drop it
/// </code>
/// It takes no SQL and no database name: the database is always <c>baxorders_sandbox</c>. The test accounts'
/// password comes from <c>BAXORDERS_SANDBOX_PASSWORD</c>, and the server from <c>BAXORDERS_SANDBOX_SERVER</c>
/// or, failing that, from the API's development connection string with its database replaced.
/// <c>tools/BaxOrders.ApprovalSandbox/sandbox.ps1</c> wraps all three and starts the sandbox API.
/// </remarks>
internal static class Program
{
    public static async Task<int> Main(string[] args)
    {
        var command = SandboxCommands.Parse(args);
        if (command is null)
        {
            Console.Error.WriteLine($"""
                Usage: dotnet run --project tools/BaxOrders.ApprovalSandbox -- <command>

                  --create   Create {SandboxDatabaseName.Default} from the migrations and fill it with synthetic data. Refuses if it exists.
                  --reset    Drop {SandboxDatabaseName.Default} and create it again: the test order waiting for approval, the draft unsent.
                  --drop     Drop {SandboxDatabaseName.Default}.

                Environment:
                  {SandboxPassword.Variable}   the test accounts' password (--create and --reset). Never stored in a file.
                  {SandboxSettings.ServerVariable}     optional: a connection string to the server. Defaults to the server of
                                               the API's development connection string.
                """);
            return 2;
        }

        Console.OutputEncoding = System.Text.Encoding.UTF8;

        var settings = SandboxSettings.Load();
        var target = new SandboxTarget(settings.ServerConnectionString, SandboxDatabaseName.Default, settings.RealDatabaseName);

        try
        {
            var server = SandboxLifecycle.Server(target);
            Console.WriteLine($"BAX Sifarişlər — approval sandbox, --{command.Value.ToString().ToLowerInvariant()}");
            Console.WriteLine($"Database: {server.Describe()}");
            Console.WriteLine();

            switch (command.Value)
            {
                case SandboxCommand.Create:
                    Report(await SandboxLifecycle.CreateAsync(target, settings.AccountPassword, CancellationToken.None));
                    break;
                case SandboxCommand.Reset:
                    Report(await SandboxLifecycle.ResetAsync(target, settings.AccountPassword, CancellationToken.None));
                    break;
                case SandboxCommand.Drop:
                    await SandboxLifecycle.DropAsync(target, CancellationToken.None);
                    Console.WriteLine($"Dropped {server.DatabaseName}.");
                    break;
            }

            return 0;
        }
        catch (SandboxRefusedException refused)
        {
            Console.Error.WriteLine($"Refused: {refused.Message}");
            return 1;
        }
    }

    private static void Report(SandboxContents contents)
    {
        Console.WriteLine($"Created {contents.DatabaseName}, with synthetic data only.");
        Console.WriteLine();
        Console.WriteLine("Accounts (password: the value of " + SandboxPassword.Variable + "):");
        foreach (var account in SandboxScenario.Accounts)
        {
            Console.WriteLine($"  {account.UserName,-20} {account.DisplayName} ({account.Role})");
        }

        Console.WriteLine();
        Console.WriteLine($"Test order #{contents.TestOrderId}   {SandboxScenario.TestOrder.Location.Name}, "
                          + $"{SandboxScenario.TestOrder.Period:yyyy-MM} — sent by {SandboxScenario.Coordinator.DisplayName}, waiting in \"Təsdiq gözləyənlər\"");
        Console.WriteLine($"Draft #{contents.DraftOrderId}        {SandboxScenario.Draft.Location.Name}, "
                          + $"{SandboxScenario.Draft.Period:yyyy-MM} — not sent yet");
        Console.WriteLine($"Historical orders #{string.Join(", #", contents.HistoricalOrderIds)}   {SandboxScenario.Location1.Name}, "
                          + "carried in from Excel as already approved");
    }
}
