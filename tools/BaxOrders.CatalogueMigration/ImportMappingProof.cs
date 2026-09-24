using BaxOrders.Application.Common;
using BaxOrders.Application.Imports;
using BaxOrders.Application.Imports.Evaluation;
using BaxOrders.Application.Imports.Matching;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Application.Imports.Reading;
using BaxOrders.Domain.Imports;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.CatalogueMigration;

/// <summary>One location name as the workbook spells it, and where the importer sends it.</summary>
/// <param name="RecordedLocationIds">
/// Where the batch that produced the live orders actually sent the rows with this spelling — the "before".
/// More than one id would mean the same spelling went to two objects, which is itself worth seeing.
/// </param>
/// <param name="Resolved">Where the importer's lookup sends it now, with no batch decision to lean on.</param>
public sealed record BlockMapping(
    string BlockName,
    string? NormalizedKey,
    int WorkbookRows,
    IReadOnlyList<int> RecordedLocationIds,
    MatchResult<int> Resolved)
{
    /// <remarks>
    /// A row with an empty location cell was not matched then and is not matched now; that is the same outcome,
    /// not a change, and the importer reports it the same way both times.
    /// </remarks>
    public bool IsUnchanged =>
        (Resolved.Kind == MatchKind.Matched
            && RecordedLocationIds.Count == 1
            && RecordedLocationIds[0] == Resolved.Id)
        || (Resolved.Kind == MatchKind.Blank && RecordedLocationIds.Count == 0);
}

/// <param name="BatchId">The batch whose recorded matches are the "before"; null when none was found.</param>
public sealed record ImportMappingResult(string WorkbookPath, long? BatchId, IReadOnlyList<BlockMapping> Blocks)
{
    public bool AllUnchanged => BatchId is not null && Blocks.Count > 0 && Blocks.All(block => block.IsUnchanged);
}

/// <summary>
/// A5: the Sentyabr 2026 workbook, read and matched by the importer's own code, with nothing staged.
/// </summary>
/// <remarks>
/// Nothing is written: the workbook is read with the application's reader, every row's location cell goes
/// through the application's own header detection and staging text, and the lookup is the application's
/// <see cref="NameIndex{TId}"/> — built by <see cref="ImportCatalogLoader"/> from the live catalogue, or, for a
/// dry run, from the catalogue as the plan would leave it. No batch is created and no row is saved.
/// <para>
/// A batch's own review decisions are deliberately <b>not</b> consulted. They belonged to that batch; the next
/// upload of the same file will not have them, so a spelling that only resolved through one of them is a
/// spelling the next import would fail on.
/// </para>
/// </remarks>
internal static class ImportMappingProof
{
    public const string WorkbookFileName = "Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx";

    public static string WorkbookPath(string repositoryRoot) =>
        Path.Combine(repositoryRoot, "samples", "imports", "raw", WorkbookFileName);

    /// <summary>The location cell of every data row, exactly as staging would store it.</summary>
    public static IReadOnlyDictionary<string, int> ReadBlockNames(IExcelWorkbookReader reader, string workbookPath)
    {
        if (!ExcelFileFormats.TryFromFileName(workbookPath, out var format))
        {
            throw new InvalidOperationException($"'{workbookPath}' is not a workbook the importer reads.");
        }

        using var content = File.OpenRead(workbookPath);
        var workbook = reader.Read(content, format, CancellationToken.None);
        var limit = new ImportOptions().HeaderSearchRowLimit;
        var names = new Dictionary<string, int>(StringComparer.Ordinal);

        foreach (var sheet in workbook.Sheets.Where(sheet => !sheet.IsHidden))
        {
            if (ImportHeaders.Detect(sheet, limit).Layout is not { } layout)
            {
                continue;
            }

            foreach (var row in sheet.Rows.Where(row => row.RowNumber > layout.HeaderRowNumber))
            {
                var source = new SourceRow(sheet.Name, row, layout);
                if (source.IsBlank)
                {
                    continue;
                }

                var name = source.ToOriginalValues([]).LocationName ?? string.Empty;
                names[name] = names.GetValueOrDefault(name) + 1;
            }
        }

        return names;
    }

    /// <summary>The batch the live orders came from: the materialized one, newest first, of this workbook.</summary>
    public static async Task<long?> FindBatchAsync(BaxOrdersDbContext db, CancellationToken cancellationToken) =>
        await db.ImportBatches.AsNoTracking()
            .Where(batch => batch.OriginalFileName == WorkbookFileName
                && db.ImportMaterializations.Any(materialization => materialization.ImportBatchId == batch.Id))
            .OrderByDescending(batch => batch.Id)
            .Select(batch => (long?)batch.Id)
            .FirstOrDefaultAsync(cancellationToken);

    /// <summary>Where that batch sent each spelling, as recorded on its rows.</summary>
    public static async Task<Dictionary<string, List<int>>> RecordedAsync(
        BaxOrdersDbContext db, long batchId, CancellationToken cancellationToken)
    {
        var rows = await db.ImportRows.AsNoTracking()
            .Where(row => row.ImportBatchId == batchId && row.MatchedLocationId != null)
            .GroupBy(row => new { Name = row.OriginalLocationName ?? string.Empty, row.MatchedLocationId })
            .Select(group => new { group.Key.Name, LocationId = group.Key.MatchedLocationId!.Value })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.Name, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Select(row => row.LocationId).Order().ToList(), StringComparer.Ordinal);
    }

    public static IReadOnlyList<BlockMapping> Map(
        IReadOnlyDictionary<string, int> blockNames,
        IReadOnlyDictionary<string, List<int>> recorded,
        NameIndex<int> locations) =>
        [.. blockNames
            .OrderBy(entry => entry.Key, AzerbaijaniCollation.Comparer)
            .Select(entry =>
            {
                var key = ImportSourceKeys.Name(entry.Key);
                var resolved = key is null ? MatchResult<int>.Blank : locations.ResolveNormalized(key);
                return new BlockMapping(
                    entry.Key, key, entry.Value, recorded.GetValueOrDefault(entry.Key) ?? [], resolved);
            })];

    /// <summary>The live catalogue's lookup, built by the importer's own loader.</summary>
    public static async Task<NameIndex<int>> LiveIndexAsync(ImportCatalogLoader loader, CancellationToken cancellationToken) =>
        (await loader.LoadAsync([], [], cancellationToken)).Locations;

    /// <summary>
    /// The lookup the importer would build from a catalogue that does not exist yet — the one a plan leaves.
    /// </summary>
    /// <remarks>
    /// The same two rules <see cref="ImportCatalogLoader"/> follows: active locations by name, and the aliases
    /// of active locations. It is only used to show a dry run's "after"; <c>--verify</c> uses the loader itself.
    /// </remarks>
    public static NameIndex<int> ProjectedIndex(IEnumerable<CatalogueLocation> locations, IEnumerable<CatalogueAlias> aliases)
    {
        var index = new NameIndex<int>();
        var active = locations.Where(location => location.IsActive).ToDictionary(location => location.Id);

        foreach (var location in active.Values)
        {
            index.Add(location.NormalizedName, location.Id);
        }

        foreach (var alias in aliases.Where(alias => active.ContainsKey(alias.LocationId)))
        {
            index.Add(alias.NormalizedAlias, alias.LocationId);
        }

        return index;
    }
}
