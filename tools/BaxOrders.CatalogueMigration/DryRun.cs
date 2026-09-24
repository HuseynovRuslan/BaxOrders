using BaxOrders.Application.Imports.Reading;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.CatalogueMigration;

/// <summary>A3's plan, printed before anything is applied, and every STOP condition checked. Changes nothing.</summary>
internal static class DryRun
{
    public static async Task<int> RunAsync(IServiceProvider provider, CancellationToken cancellationToken)
    {
        var db = Program.Db(provider);
        var planning = await Planning.ReadAsync(db, cancellationToken);
        planning.Print();

        var plan = planning.Plan;
        var projected = ImportMappingProof.ProjectedIndex(plan.Locations, plan.Aliases);

        Report.Heading("Owner-list and previous spellings, against the catalogue the plan would leave");
        Planning.PrintSpellings(projected, plan.Locations, out var spellingsResolve);
        Console.WriteLine();

        var mappingHolds = true;
        var workbookPath = ImportMappingProof.WorkbookPath(Program.RepositoryRoot());
        var batchId = await ImportMappingProof.FindBatchAsync(db, cancellationToken);
        if (File.Exists(workbookPath) && batchId is { } batch)
        {
            Report.Heading($"A5 preview: {ImportMappingProof.WorkbookFileName}, batch #{batch} → the catalogue the plan would leave");
            var blocks = ImportMappingProof.ReadBlockNames(provider.GetRequiredService<IExcelWorkbookReader>(), workbookPath);
            var recorded = await ImportMappingProof.RecordedAsync(db, batch, cancellationToken);
            var mapping = new ImportMappingResult(workbookPath, batch, ImportMappingProof.Map(blocks, recorded, projected));
            Report.Blocks(mapping.Blocks, planning.State with { Locations = plan.Locations });
            mappingHolds = mapping.AllUnchanged;
            Console.WriteLine();
        }

        Console.WriteLine(plan.CanApply && spellingsResolve && mappingHolds
            ? "Dry run: the plan can be applied. Nothing was changed."
            : "Dry run: the plan must NOT be applied — see above. Nothing was changed.");
        return plan.CanApply && spellingsResolve && mappingHolds ? 0 : 1;
    }
}
