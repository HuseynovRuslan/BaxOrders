using System.Diagnostics;
using System.Globalization;
using Npgsql;

namespace BaxOrders.CatalogueMigration;

/// <summary>
/// A2: pg_dump in custom format, taken by the tool because the connection string lives only in user-secrets,
/// where no shell can see it. Alongside it, while the migration is still pending, the figures that must not move.
/// </summary>
internal static class Backup
{
    /// <summary>Points at a PostgreSQL bin folder when pg_dump is neither installed in the usual place nor on PATH.</summary>
    public const string PgBinVariable = "BAXORDERS_PG_BIN";

    public static async Task<int> RunAsync(IServiceProvider provider, ToolSettings settings, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(settings.BackupDirectory);
        var stamp = DateTime.Now.ToString("yyyyMMdd-HHmmss", CultureInfo.InvariantCulture);
        var path = Path.Combine(settings.BackupDirectory, $"{settings.DatabaseName}-task3-{stamp}.dump");

        var pgDump = FindPgDump();
        var connection = new NpgsqlConnectionStringBuilder(settings.ConnectionString);
        var start = new ProcessStartInfo(pgDump)
        {
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
        };

        foreach (var argument in new[]
                 {
                     "--format=custom", "--no-password",
                     "--host", connection.Host ?? "localhost",
                     "--port", connection.Port.ToString(CultureInfo.InvariantCulture),
                     "--username", connection.Username ?? string.Empty,
                     "--dbname", connection.Database ?? string.Empty,
                     "--file", path,
                 })
        {
            start.ArgumentList.Add(argument);
        }

        // Handed to pg_dump alone, for this one process, and never printed.
        start.Environment["PGPASSWORD"] = connection.Password ?? string.Empty;

        Console.WriteLine($"pg_dump: {pgDump}");
        using (var process = Process.Start(start) ?? throw new InvalidOperationException("pg_dump could not be started."))
        {
            var errors = process.StandardError.ReadToEndAsync(cancellationToken);
            await process.StandardOutput.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);
            if (process.ExitCode != 0)
            {
                Console.Error.WriteLine($"pg_dump failed ({process.ExitCode}): {await errors}");
                return 1;
            }
        }

        var size = new FileInfo(path).Length;
        if (size == 0)
        {
            Console.Error.WriteLine($"pg_dump wrote an empty file: {path}");
            return 1;
        }

        Console.WriteLine($"Backup written: {path} ({size:N0} bytes, custom format)");
        Console.WriteLine();

        // The "before" of MUST NOT CHANGE is the database this backup holds, so it is recorded now — but only
        // while there is still something to apply. Once the migration has run, a later backup is an "after",
        // and writing it over the baseline would compare the result with itself.
        var planning = await Planning.ReadAsync(Program.Db(provider), cancellationToken);
        var baseline = Invariants.BaselinePath(settings);
        if (planning.Plan.IsEmpty)
        {
            Console.WriteLine(File.Exists(baseline)
                ? $"The migration has already been applied; the baseline is kept as it was: {baseline}"
                : "The migration has already been applied and no baseline exists; --verify cannot compare figures.");
            return 0;
        }

        var figures = await Invariants.CaptureAsync(provider, cancellationToken);
        await Invariants.WriteAsync(baseline, figures,
        [
            $"Task 3 baseline ({CatalogueDecisions.Version}) — the figures that must not change.",
            $"Recorded {DateTime.Now:yyyy-MM-dd HH:mm:ss zzz} with the backup {Path.GetFileName(path)}.",
            $"Catalogue then: {planning.State.Locations.Count} objects, {planning.State.Aliases.Count} aliases.",
            .. planning.State.Aliases.Select(alias =>
                $"alias\t{alias.NormalizedAlias}\t{planning.State.ById(alias.LocationId)?.Code}\t{alias.Alias}"),
        ]);
        Console.WriteLine($"Baseline recorded: {baseline} ({figures.Count:N0} figures)");
        return 0;
    }

    /// <summary>A backup of this database taken today, if there is one — what <c>--apply</c> insists on.</summary>
    public static FileInfo? TodaysBackup(ToolSettings settings)
    {
        var directory = new DirectoryInfo(settings.BackupDirectory);
        if (!directory.Exists)
        {
            return null;
        }

        var today = DateTime.Now.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
        return directory.GetFiles($"{settings.DatabaseName}-task3-{today}-*.dump")
            .Where(file => file.Length > 0)
            .OrderByDescending(file => file.LastWriteTimeUtc)
            .FirstOrDefault();
    }

    /// <summary>The same search scripts/dev-postgres.ps1 makes for its binaries, then PATH.</summary>
    private static string FindPgDump()
    {
        var executable = OperatingSystem.IsWindows() ? "pg_dump.exe" : "pg_dump";

        var configured = Environment.GetEnvironmentVariable(PgBinVariable);
        if (!string.IsNullOrWhiteSpace(configured) && File.Exists(Path.Combine(configured, executable)))
        {
            return Path.Combine(configured, executable);
        }

        var installed = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "PostgreSQL");
        if (Directory.Exists(installed))
        {
            // By version number, so 18 is newer than 9.
            var newest = Directory.GetDirectories(installed)
                .Select(version => (Version: int.TryParse(Path.GetFileName(version), out var number) ? number : 0,
                    Path: Path.Combine(version, "bin", executable)))
                .Where(candidate => File.Exists(candidate.Path))
                .OrderByDescending(candidate => candidate.Version)
                .Select(candidate => candidate.Path)
                .FirstOrDefault();
            if (newest is not null)
            {
                return newest;
            }
        }

        return executable;
    }
}
