using BaxOrders.Application.Abstractions;
using BaxOrders.Domain.Orders;
using BaxOrders.Application.Imports;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Domain.Imports;
using BaxOrders.Domain.Normalization;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;

namespace BaxOrders.Application.Orders;

/// <summary>
/// One permanent request and its lines, and the audit trail behind a single line.
/// </summary>
/// <remarks>
/// The item list keeps the order of the source sheet wherever the line came from an import, because that is
/// the order the person who wrote the request used. Sorting imported lines alphabetically would destroy it.
/// A line copied into a correction keeps the place of the line it was copied from.
/// </remarks>
public sealed class OrderRequestQueries(IBaxOrdersDbContext db, ICurrentUserContext currentUser)
{
    /// <summary>
    /// How far back a line's copies are followed to find its workbook row. A correction of a correction of a
    /// correction is already unusual; the bound only guards against data that should not exist.
    /// </summary>
    private const int MaxLineageDepth = 100;

    /// <returns>Null when the request does not exist.</returns>
    public async Task<OrderRequestDetailDto?> GetAsync(long orderRequestId, OrderItemQuery query, CancellationToken cancellationToken)
    {
        var header = await db.OrderRequests.AsNoTracking()
            .Where(request => request.Id == orderRequestId)
            .Select(request => new
            {
                request.Id,
                request.LocationId,
                LocationCode = request.Location.Code,
                LocationName = request.Location.Name,
                request.RequestPeriod,
                request.RequestDate,
                request.Version,
                request.Status,
                request.CreatedAtUtc,
                request.SourceImportBatchId,
                ItemCount = request.Items.Count,
                KnownPrice = request.Items.Count(item => item.UnitPrice != null),
                // Only the prices somebody owes; the line itself says whether one was.
                MissingPrice = request.Items.Count(item => item.UnitPrice == null
                    && item.PricingMode != PricingMode.InternalFreeSupply),
                KnownAmount = request.Items.Sum(item => (decimal?)(item.Quantity * item.UnitPrice)),
                RevisedFrom = db.OrderRequestRevisions
                    .Where(revision => revision.RevisionOrderRequestId == request.Id)
                    .Select(revision => new { Id = revision.SourceOrderRequestId, revision.SourceOrderRequest.Version })
                    .FirstOrDefault(),
                RevisedInto = db.OrderRequestRevisions
                    .Where(revision => revision.SourceOrderRequestId == request.Id)
                    .Select(revision => new { Id = revision.RevisionOrderRequestId, revision.RevisionOrderRequest.Version })
                    .FirstOrDefault(),
                HasNewerVersion = db.OrderRequests.Any(other =>
                    other.LocationId == request.LocationId
                    && other.RequestPeriod == request.RequestPeriod
                    && other.Version > request.Version),
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (header is null)
        {
            return null;
        }

        var (page, pageSize) = Paging.Of(query.Page, query.PageSize, 50);
        var items = db.OrderRequestItems.AsNoTracking().Where(item => item.OrderRequestId == orderRequestId);

        if (Search.Of(query.Search) is { } search)
        {
            items = items.Where(item =>
                item.ProductVariant.Product.NormalizedName.Contains(search)
                // The needle is normalized, which lower-cases it; codes are stored upper-case. SQL Server's
                // case-insensitive collation hid that, PostgreSQL's does not, so the fold is explicit here.
                || item.ProductVariant.Product.Code.ToLower().Contains(search)
                || (item.ProductVariant.ModelCode != null && item.ProductVariant.ModelCode.ToLower().Contains(search)));
        }

        if (query.SupplierId is { } supplierId)
        {
            items = items.Where(item => item.SupplierId == supplierId);
        }

        if (query.HasPrice is { } hasPrice)
        {
            items = hasPrice ? items.Where(item => item.UnitPrice != null) : items.Where(item => item.UnitPrice == null);
        }

        var totalCount = await items.CountAsync(cancellationToken);

        // The provenance row number is the sheet's own order. A line copied into a correction takes the row of
        // the line it was copied from; one added by hand has none and follows, in the order it was added.
        var page1 = await items
            .Select(item => new
            {
                Item = item,
                SourceRowNumber = db.ImportRowMaterializations
                    .Where(link => link.OrderRequestItemId == item.Id
                                   || link.OrderRequestItemId == item.SourceOrderRequestItemId)
                    .Select(link => (int?)link.ImportRow.RowNumber)
                    .FirstOrDefault(),
            })
            .OrderBy(row => row.SourceRowNumber ?? int.MaxValue)
            .ThenBy(row => row.Item.SourceOrderRequestItemId ?? row.Item.Id)
            .ThenBy(row => row.Item.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(row => new
            {
                row.Item.Id,
                row.Item.ProductVariantId,
                ProductId = row.Item.ProductVariant.ProductId,
                ProductCode = row.Item.ProductVariant.Product.Code,
                ProductName = row.Item.ProductVariant.Product.Name,
                ProductCategoryId = row.Item.ProductVariant.Product.CategoryId,
                row.Item.ProductVariant.SpecificationValue,
                SpecificationUnitCode = row.Item.ProductVariant.SpecificationUnit != null ? row.Item.ProductVariant.SpecificationUnit.Code : null,
                SpecificationUnitName = row.Item.ProductVariant.SpecificationUnit != null ? row.Item.ProductVariant.SpecificationUnit.Name : null,
                row.Item.ProductVariant.SpecificationDescriptor,
                row.Item.ProductVariant.ModelCode,
                OrderUnitCode = row.Item.ProductVariant.OrderUnit != null ? row.Item.ProductVariant.OrderUnit.Code : null,
                OrderUnitName = row.Item.ProductVariant.OrderUnit != null ? row.Item.ProductVariant.OrderUnit.Name : null,
                row.Item.Quantity,
                row.Item.UnitPrice,
                row.Item.SupplierId,
                SupplierName = row.Item.Supplier != null ? row.Item.Supplier.Name : null,
                // Carried on the line so the screen can tell "nobody has priced this yet" from "this came out
                // of our own store and never had a purchase price" — and from "nobody has said which".
                PricingMode = row.Item.PricingMode,
                // The workbook's own supplier cell. For an internally supplied line it is often the only
                // record of which store it came out of — "Azpetrol baza" never matched a catalogue supplier —
                // so the screen can say "Daxili: Azpetrol baza" instead of "Məlum deyil", which reads like a
                // gap in the data rather than like our own warehouse.
                SourceSupplierName = db.ImportRowMaterializations
                    .Where(link => link.OrderRequestItemId == row.Item.Id
                                   || link.OrderRequestItemId == row.Item.SourceOrderRequestItemId)
                    .Select(link => link.ImportRow.OriginalSupplierName)
                    .FirstOrDefault(),
                row.Item.SourceOrderRequestItemId,
                Source = db.ImportRowMaterializations
                    .Where(link => link.OrderRequestItemId == row.Item.Id)
                    .Select(link => new
                    {
                        link.ImportRow.ImportBatchId,
                        ImportRowId = link.ImportRowId,
                        link.ImportRow.SheetName,
                        link.ImportRow.RowNumber,
                        link.ImportRow.MatchedCategoryId,
                    })
                    .FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        // Products imported in bulk carry no category of their own; the line's category is the one the review
        // resolved for its source row. Both are canonical records, so either answers "which category is this".
        var categoryIds = page1
            .Select(row => row.ProductCategoryId ?? row.Source?.MatchedCategoryId)
            .Where(id => id is not null)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var paths = await CategoryPathsAsync(categoryIds, cancellationToken);

        var dtos = page1.Select(row => new OrderRequestItemDto(
            row.Id,
            row.ProductId,
            row.ProductCode,
            row.ProductName,
            row.ProductVariantId,
            row.SpecificationValue,
            row.SpecificationUnitCode,
            row.SpecificationUnitName,
            row.SpecificationDescriptor,
            row.ModelCode,
            row.OrderUnitCode,
            row.OrderUnitName,
            row.Quantity,
            row.UnitPrice,
            row.UnitPrice is { } price ? row.Quantity * price : null,
            row.SupplierId,
            row.SupplierName,
            row.PricingMode,
            row.SourceSupplierName,
            paths.GetValueOrDefault(row.ProductCategoryId ?? row.Source?.MatchedCategoryId ?? 0) ?? [],
            row.Source is null
                ? null
                : new OrderItemSourceRefDto(row.Source.ImportBatchId, row.Source.ImportRowId, row.Source.SheetName, row.Source.RowNumber),
            row.SourceOrderRequestItemId))
            .ToList();

        var isRevision = header.RevisedFrom is not null;
        var hasRevision = header.RevisedInto is not null;

        return new OrderRequestDetailDto(
            header.Id,
            header.LocationId,
            header.LocationCode,
            header.LocationName,
            header.RequestPeriod,
            header.RequestDate,
            header.Version,
            header.Status,
            header.CreatedAtUtc,
            header.SourceImportBatchId,
            header.ItemCount,
            header.KnownPrice,
            header.MissingPrice,
            header.KnownPrice == 0 ? null : header.KnownAmount,
            isRevision,
            header.RevisedFrom?.Id,
            header.RevisedFrom?.Version,
            hasRevision,
            header.RevisedInto?.Id,
            header.RevisedInto?.Version,
            Revisions.RevisionPermissions.CanCreate(header.Status, hasRevision, !header.HasNewerVersion, currentUser),
            Revisions.RevisionPermissions.CanEdit(header.Status, isRevision, currentUser),
            new PagedResult<OrderRequestItemDto>(dtos, page, pageSize, totalCount));
    }

    /// <summary>
    /// The audit trail of one permanent item: what the sheet said, what an operator corrected, and which
    /// canonical record each value was resolved to. Read-only — nothing here edits staging data.
    /// </summary>
    /// <remarks>
    /// A line copied into a correction version was not materialized from a workbook row itself, and no second
    /// materialization is ever made for it: its trail is found by following the copies back, one version at a
    /// time, to the imported line that has one. A line somebody added by hand has none anywhere behind it,
    /// and none is made up for it — the answer says so rather than reporting the line as unknown.
    /// </remarks>
    /// <returns>Null only when the item does not exist at all.</returns>
    public async Task<OrderItemProvenanceDto?> GetItemProvenanceAsync(long orderRequestItemId, CancellationToken cancellationToken)
    {
        var steps = new List<OrderItemLineageStepDto>();
        var current = orderRequestItemId;

        while (true)
        {
            var line = await db.OrderRequestItems.AsNoTracking()
                .Where(item => item.Id == current)
                .Select(item => new
                {
                    item.Id,
                    item.OrderRequestId,
                    item.OrderRequest.Version,
                    item.OrderRequest.Status,
                    item.SourceOrderRequestItemId,
                    IsImported = db.ImportRowMaterializations.Any(link => link.OrderRequestItemId == item.Id),
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (line is null)
            {
                // The first step missing means the line itself does not exist; a later one would mean a
                // broken chain, which the foreign key does not allow.
                return steps.Count == 0 ? null : throw new InvalidOperationException(
                    $"Order item #{current} is named as a source but does not exist.");
            }

            steps.Add(new OrderItemLineageStepDto(line.Id, line.OrderRequestId, line.Version, line.Status, line.IsImported));

            if (line.IsImported || line.SourceOrderRequestItemId is not { } copiedFrom || steps.Count > MaxLineageDepth)
            {
                break;
            }

            current = copiedFrom;
        }

        var head = steps[0];
        var oldest = steps[^1];
        if (!oldest.IsImported)
        {
            // Nobody imported this line or anything it was copied from: somebody typed it into a correction.
            return new OrderItemProvenanceDto(
                head.OrderRequestItemId, head.OrderRequestId, head.Version, OrderItemOrigin.ManuallyAdded, steps, Source: null);
        }

        var source = await ImportSourceAsync(oldest.OrderRequestItemId, cancellationToken);
        return new OrderItemProvenanceDto(
            head.OrderRequestItemId, head.OrderRequestId, head.Version, OrderItemOrigin.Imported, steps, source);
    }

    private async Task<OrderItemSourceDto?> ImportSourceAsync(long orderRequestItemId, CancellationToken cancellationToken)
    {
        var link = await db.ImportRowMaterializations.AsNoTracking()
            .Where(item => item.OrderRequestItemId == orderRequestItemId)
            .Select(item => new
            {
                item.OrderRequestItemId,
                item.OrderRequestItem.OrderRequestId,
                item.CreatedAtUtc,
                item.ImportRowId,
                item.ImportRow.ImportBatchId,
                FileName = item.ImportRow.ImportBatch.OriginalFileName,
                ImportStatus = item.ImportRow.ImportBatch.Status,
                item.ImportRow.SheetName,
                item.ImportRow.RowNumber,
                item.ImportRow.IsExcluded,
                item.ImportRow.OriginalLineTotal,
                item.ImportRow.CalculatedLineTotal,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (link is null)
        {
            return null;
        }

        var row = await db.ImportRows.AsNoTracking()
            .Include(item => item.Corrections)
            .FirstAsync(item => item.Id == link.ImportRowId, cancellationToken);

        var canonical = await CanonicalValuesAsync(row, cancellationToken);

        var fields = Enum.GetValues<ImportCorrectionField>()
            .Select(field =>
            {
                var correction = row.CorrectionOf(field);
                return new OrderItemSourceFieldDto(
                    ImportHeaders.ExpectedHeaders[ColumnOf(field)],
                    row.Source(field),
                    row.Effective(field),
                    correction is not null,
                    correction is { IsIntentionallyEmpty: true },
                    canonical.GetValueOrDefault(field));
            })
            .ToList();

        return new OrderItemSourceDto(
            link.OrderRequestItemId,
            link.OrderRequestId,
            link.CreatedAtUtc,
            link.ImportBatchId,
            link.FileName,
            link.ImportStatus,
            link.ImportRowId,
            link.SheetName,
            link.RowNumber,
            link.IsExcluded,
            link.OriginalLineTotal,
            link.CalculatedLineTotal,
            fields);
    }

    /// <summary>The canonical record each resolved column points at, so source and catalog can be read side by side.</summary>
    private async Task<Dictionary<ImportCorrectionField, string?>> CanonicalValuesAsync(ImportRow row, CancellationToken cancellationToken)
    {
        var values = new Dictionary<ImportCorrectionField, string?>();

        if (row.MatchedLocationId is { } locationId)
        {
            values[ImportCorrectionField.Location] = await db.Locations.AsNoTracking()
                .Where(item => item.Id == locationId).Select(item => item.Name).FirstOrDefaultAsync(cancellationToken);
        }

        if (row.MatchedSupplierId is { } supplierId)
        {
            values[ImportCorrectionField.Supplier] = await db.Suppliers.AsNoTracking()
                .Where(item => item.Id == supplierId).Select(item => item.Name).FirstOrDefaultAsync(cancellationToken);
        }

        if (row.MatchedResponsiblePersonId is { } personId)
        {
            values[ImportCorrectionField.ResponsiblePerson] = await db.ResponsiblePeople.AsNoTracking()
                .Where(item => item.Id == personId).Select(item => item.Name).FirstOrDefaultAsync(cancellationToken);
        }

        if (row.MatchedProductId is { } productId)
        {
            values[ImportCorrectionField.ProductName] = await db.Products.AsNoTracking()
                .Where(item => item.Id == productId).Select(item => item.Name + " (" + item.Code + ")").FirstOrDefaultAsync(cancellationToken);
        }

        var unitIds = new[] { row.MatchedOrderUnitId, row.MatchedSpecificationUnitId }
            .Where(id => id is not null).Select(id => id!.Value).Distinct().ToList();
        var units = await db.UnitsOfMeasure.AsNoTracking()
            .Where(unit => unitIds.Contains(unit.Id))
            .ToDictionaryAsync(unit => unit.Id, unit => $"{unit.Name} ({unit.Code})", cancellationToken);

        if (row.MatchedOrderUnitId is { } orderUnitId)
        {
            values[ImportCorrectionField.OrderUnit] = units.GetValueOrDefault(orderUnitId);
        }

        // "Vahid" holds either a unit or a word that describes the specification; both are shown as resolved.
        values[ImportCorrectionField.SpecificationUnit] = row.MatchedSpecificationUnitId is { } specificationUnitId
            ? units.GetValueOrDefault(specificationUnitId)
            : row.SpecificationDescriptor is { } descriptor
                ? $"ölçü vahidi deyil — spesifikasiya təsviri «{descriptor}»"
                : null;

        if (row.MatchedCategoryId is { } categoryId)
        {
            var path = await CategoryPathsAsync([categoryId], cancellationToken);
            values[ImportCorrectionField.SubCategory] = string.Join(" › ", path.GetValueOrDefault(categoryId) ?? []);
        }

        return values;
    }

    /// <summary>Resolves whole category paths in one query: the tree is small and never walked row by row.</summary>
    private async Task<Dictionary<int, IReadOnlyList<string>>> CategoryPathsAsync(
        IReadOnlyCollection<int> categoryIds, CancellationToken cancellationToken)
    {
        if (categoryIds.Count == 0)
        {
            return [];
        }

        var all = await db.Categories.AsNoTracking()
            .Select(category => new { category.Id, category.Name, category.ParentId })
            .ToDictionaryAsync(category => category.Id, cancellationToken);

        var paths = new Dictionary<int, IReadOnlyList<string>>();
        foreach (var id in categoryIds)
        {
            var names = new List<string>();
            var current = all.GetValueOrDefault(id);
            while (current is not null)
            {
                names.Insert(0, current.Name);
                current = current.ParentId is { } parentId ? all.GetValueOrDefault(parentId) : null;
            }

            paths[id] = names;
        }

        return paths;
    }

    private static ImportField ColumnOf(ImportCorrectionField field) =>
        Imports.Evaluation.EffectiveRowValues.ColumnOf(field);
}
