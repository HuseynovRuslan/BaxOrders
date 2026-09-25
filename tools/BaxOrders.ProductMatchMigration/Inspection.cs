using System.Globalization;
using BaxOrders.Application.Analytics;
using BaxOrders.Application.Catalog.ProductMatches;
using BaxOrders.Application.Decisions;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Normalization;
using BaxOrders.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.ProductMatchMigration;

/// <summary>
/// Read-only: where the migrations stand, what the catalogue holds, every product-match suggestion the rules make
/// against the real data, and the brief's own example behind them. Changes nothing.
/// </summary>
internal static class Inspection
{
    /// <summary>The brief's pair: the base and the variant it names.</summary>
    public const string SabunElano = "Sabun elano";

    public const string SabunElanoLavanda = "Sabun elano lavanda ətirli";

    private static readonly DateOnly August2026 = new(2026, 8, 1);

    public static async Task<int> RunAsync(IServiceProvider provider, CancellationToken cancellationToken)
    {
        var db = Program.Db(provider);
        var state = await MigrationState.ReadAsync(db, cancellationToken);
        var plan = MigrationPlan.Of(state);

        Report.Heading("Migrations");
        Console.WriteLine($"  In the code: {state.Known.Count}, latest {state.Known.LastOrDefault() ?? "—"}");
        Console.WriteLine($"  Applied: {state.Applied.Count}, latest {state.Applied.LastOrDefault() ?? "—"}");
        Console.WriteLine($"  Pending: {(plan.Pending.Count == 0 ? "none" : string.Join(", ", plan.Pending))}");
        foreach (var stop in plan.Stops)
        {
            Console.WriteLine($"  STOP: {stop}");
        }

        Console.WriteLine($"  {MigrationState.TableName}: {(state.TableExists ? $"exists, {state.DecisionCount} row(s)" : "does not exist")}");
        Console.WriteLine();

        // The decisions are read only where they can be: before the migration there are none, and no table to read.
        var catalog = await ProductMatchCatalog.ReadAsync(db, readDecisions: state.TableExists, cancellationToken);
        var suggestions = ProductMatchQueries.Describe(catalog, catalog.Suggestions());
        var sameItem = suggestions.Where(suggestion => suggestion.Kind == ProductMatchKind.SameItem).ToList();
        var variant = suggestions.Where(suggestion => suggestion.Kind == ProductMatchKind.Variant).ToList();

        Report.Heading("Catalogue");
        Console.WriteLine($"  Products: {await db.Products.CountAsync(cancellationToken)}");
        Console.WriteLine($"  Variants: {await db.ProductVariants.CountAsync(cancellationToken)}, of which with order lines (latest versions): {catalog.Variants.Count}");
        Console.WriteLine($"  Products with order lines (latest versions): {catalog.ProductUsage.Count}");
        Console.WriteLine($"  Product aliases: {await db.ProductAliases.CountAsync(cancellationToken)}");
        Console.WriteLine($"  Live decisions read: {catalog.Live.Count}");
        Console.WriteLine();

        var nameDiffers = sameItem.Count(suggestion =>
            TextNormalizer.Normalize(suggestion.Source.ProductName) != TextNormalizer.Normalize(suggestion.Target.ProductName));
        Report.Heading($"Yazılış fərqi (SameItem) — {sameItem.Count} suggestion(s)");
        Console.WriteLine($"  The product name differs: {nameDiffers}; only the specification or model differs: {sameItem.Count - nameDiffers}.");
        Console.WriteLine("  (The brief's \"69 halda\" counted Excel rows of the source files, not catalogue pairs; the numbers need not match.)");
        foreach (var suggestion in sameItem)
        {
            Console.WriteLine($"  [{suggestion.Difference}] {Side(suggestion.Source)}");
            Console.WriteLine($"      → {Side(suggestion.Target)}");
        }

        Console.WriteLine();

        Report.Heading($"Variant fərqi (Variant) — {variant.Count} suggestion(s)");
        foreach (var suggestion in variant)
        {
            Console.WriteLine($"  «{suggestion.Source.ProductName}» ({Usage(suggestion.Source)})");
            Console.WriteLine($"      variant of «{suggestion.Target.ProductName}» ({Usage(suggestion.Target)}) — label «{suggestion.ProposedLabel}»");
        }

        Console.WriteLine();

        await SabunElanoAsync(db, catalog, suggestions, cancellationToken);
        await HeydarAliyevSeptemberAsync(provider, db, cancellationToken);

        Console.WriteLine("Inspection only. Nothing was changed.");
        return 0;
    }

    /// <summary>The brief's example: the Heydər Əliyev lines behind it, and whether the rule proposes the pair.</summary>
    private static async Task SabunElanoAsync(
        BaxOrdersDbContext db,
        ProductMatchCatalog catalog,
        IReadOnlyList<ProductMatchSuggestionDto> suggestions,
        CancellationToken cancellationToken)
    {
        var prefix = TextNormalizer.Normalize(SabunElano);

        Report.Heading($"Heydər Əliyev Mərkəzi, 2026-08 and 2026-09: every line of a product whose name starts with «{SabunElano}»");
        var lines = await db.OrderRequestItems.AsNoTracking()
            .Where(item => item.OrderRequest.Location.Code == Invariants.HeydarAliyevCentre
                && (item.OrderRequest.RequestPeriod == August2026 || item.OrderRequest.RequestPeriod == Invariants.September2026)
                && item.ProductVariant.Product.NormalizedName.StartsWith(prefix)
                && !db.OrderRequests.Any(other =>
                    other.LocationId == item.OrderRequest.LocationId
                    && other.RequestPeriod == item.OrderRequest.RequestPeriod
                    && other.Version > item.OrderRequest.Version))
            .OrderBy(item => item.OrderRequest.RequestPeriod)
            .ThenBy(item => item.Id)
            .Select(item => new
            {
                item.Id,
                item.OrderRequest.RequestPeriod,
                item.OrderRequest.Version,
                item.ProductVariant.ProductId,
                ProductName = item.ProductVariant.Product.Name,
                item.ProductVariant.Product.NormalizedName,
                item.ProductVariantId,
                item.Quantity,
                OrderUnit = item.ProductVariant.OrderUnit != null ? item.ProductVariant.OrderUnit.Code : null,
                item.UnitPrice,
                item.PricingMode,
            })
            .ToListAsync(cancellationToken);

        foreach (var line in lines)
        {
            var amount = line.UnitPrice is { } price ? (line.Quantity * price).ToString("0.00", CultureInfo.InvariantCulture) : "—";
            Console.WriteLine(
                $"  {Report.Month(line.RequestPeriod)} v{line.Version}  line #{line.Id}  «{line.ProductName}» (product #{line.ProductId}, variant #{line.ProductVariantId})  "
                + $"{line.Quantity.ToString("0.###", CultureInfo.InvariantCulture)} {line.OrderUnit ?? VariantDescription.Unitless} × "
                + $"{line.UnitPrice?.ToString("0.00##", CultureInfo.InvariantCulture) ?? "—"} = {amount}  [{line.PricingMode}]");
        }

        if (lines.Count == 0)
        {
            Console.WriteLine("  None.");
        }

        Console.WriteLine();

        Report.Heading($"Is «{SabunElanoLavanda}» → «{SabunElano}» among the Variant suggestions?");
        var bases = await ProductsNamedAsync(db, SabunElano, cancellationToken);
        var variants = await ProductsNamedAsync(db, SabunElanoLavanda, cancellationToken);
        foreach (var product in bases.Concat(variants))
        {
            var usage = catalog.ProductUsage.GetValueOrDefault(product.Id);
            Console.WriteLine(
                $"  product #{product.Id} {product.Code}: stored name «{product.Name}», normalized «{product.NormalizedName}», "
                + (usage is null ? "no order line in the latest versions" : $"{usage.LineCount} line(s) at {usage.LocationCount} location(s)"));
        }

        var found = suggestions.FirstOrDefault(suggestion =>
            suggestion.Kind == ProductMatchKind.Variant
            && variants.Any(product => product.Id == suggestion.Source.ProductId)
            && bases.Any(product => product.Id == suggestion.Target.ProductId));

        if (found is not null)
        {
            Console.WriteLine($"  YES — suggested with the label «{found.ProposedLabel}».");
        }
        else
        {
            Console.WriteLine("  NO.");
            foreach (var product in variants)
            {
                var proposed = suggestions.FirstOrDefault(suggestion =>
                    suggestion.Kind == ProductMatchKind.Variant && suggestion.Source.ProductId == product.Id);
                Console.WriteLine(proposed is null
                    ? $"  «{product.Name}» is suggested under no base."
                    : $"  «{product.Name}» is suggested under «{proposed.Target.ProductName}» instead (the shortest open base).");

                foreach (var candidate in bases)
                {
                    Console.WriteLine(
                        $"  whole-word prefix «{candidate.NormalizedName}» of «{product.NormalizedName}»: "
                        + $"{ProductMatchSuggestions.IsWholeWordPrefix(candidate.NormalizedName, product.NormalizedName)}");
                }
            }
        }

        Console.WriteLine();
    }

    /// <summary>The brief's total: Heydər Əliyev, Sentyabr 2026, "Keçən ay" — +23,852.70.</summary>
    private static async Task HeydarAliyevSeptemberAsync(
        IServiceProvider provider, BaxOrdersDbContext db, CancellationToken cancellationToken)
    {
        Report.Heading("Heydər Əliyev Mərkəzi, 2026-09, «Keçən ay» (OrderDecisionContextQueries)");
        var orderId = await Invariants.HeydarAliyevSeptemberAsync(db, cancellationToken);
        if (orderId is not { } id)
        {
            Console.WriteLine("  No September 2026 order.");
            Console.WriteLine();
            return;
        }

        var context = await provider.GetRequiredService<OrderDecisionContextQueries>()
            .GetAsync(id, new DecisionContextQuery(AnalyticsComparisonBasis.PreviousMonth), cancellationToken);
        if (context is null)
        {
            Console.WriteLine($"  Order #{id} has no decision context.");
        }
        else
        {
            Console.WriteLine($"  Order #{context.OrderRequestId}, version {context.Version}, {context.Status}");
            Console.WriteLine($"  Current {Money(context.Current.KnownAmount)}, baseline {Money(context.Primary.BaselineKnownAmount)}, "
                + $"difference {Money(context.Primary.DeltaAmount)} (the brief: +23,852.70)");
        }

        Console.WriteLine();
    }

    private static Task<List<Product>> ProductsNamedAsync(BaxOrdersDbContext db, string name, CancellationToken cancellationToken)
    {
        var normalized = TextNormalizer.Normalize(name);
        return db.Products.AsNoTracking()
            .Where(product => product.NormalizedName == normalized)
            .OrderBy(product => product.Id)
            .ToListAsync(cancellationToken);
    }

    private static string Side(ProductMatchSideDto side)
    {
        var variant = VariantDescription.Of(
            side.SpecificationValue,
            side.SpecificationUnitCode ?? side.SpecificationDescriptor,
            side.ModelCode,
            side.OrderUnitCode ?? VariantDescription.Unitless);
        return $"«{side.ProductName}» [{variant}] (variant #{side.VariantId}, {Usage(side)})";
    }

    private static string Usage(ProductMatchSideDto side) =>
        $"{side.LineCount} line(s), {side.LocationCount} location(s), {Report.Month(side.FirstMonth)}…{Report.Month(side.LastMonth)}";

    private static string Money(decimal? amount) =>
        amount?.ToString("+#,##0.00;-#,##0.00;0.00", CultureInfo.InvariantCulture) ?? "—";
}
