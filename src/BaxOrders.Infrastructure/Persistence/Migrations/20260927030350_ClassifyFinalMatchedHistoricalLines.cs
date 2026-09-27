using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ClassifyFinalMatchedHistoricalLines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ================================================================================================
            // The last 12 lines that could be read from the authoritative "Aylıq" sheet. All 12 carry
            // "Aylıq sifariş" in its Növ column, so all 12 become Monthly.
            //
            // What had blocked them was never a business question but a key: the earlier alignment matched on
            // product, quantity and date, and August has fourteen consecutive objects each ordering "Benzin,
            // 20 litr" in the same month, so neighbouring rows looked equally good. With the object in the key
            // every row is distinct.
            //
            // The shift behind it turned out to have one cause. The corrected workbook dropped exactly one
            // line — import row 3035, Heydər Əliyev Mərkəzi's second "Yay ayaqqabısı" of August — and every
            // row after it moved up by one to close the gap. Under that single rule the sheet and the import
            // are a bijection: 3535 rows agree on every field, 55 differ only in a product name the business
            // renamed, 27 only in an object it renamed, and 1 has no counterpart at all.
            //
            // That one is item 2988, the dropped line itself, and it is deliberately NOT here. Its four
            // neighbours in the same clothing block are all "Aylıqdan kənar" and so, most likely, was it —
            // but that reads the neighbours, not the row, and the row is what the business has to explain.
            // It stays unclassified until they say why the newer workbook no longer carries it.
            //
            // Only OrderLineType moves. No quantity, price, pricing mode, product, variant, unit, supplier,
            // location, responsible person, order, import row, materialization, Original* value or workflow
            // status is touched, and no row is created or removed.
            //
            // Idempotent: each line must be Unclassified now, so a second run moves nothing and a
            // classification somebody has since made by hand is never overwritten. Reversible and auditable:
            // the same 12 pairs drive the Down, and a line is named by (item id, source row number) — the two
            // are never equal in this data, so the pair is both the record of the match and a two-key guard
            // that matches nothing on another database.
            // ================================================================================================
            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems" AS i
                SET "OrderLineType" = 'Monthly'
                FROM "ImportRowMaterializations" m
                JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
                WHERE m."OrderRequestItemId" = i."Id"
                  AND i."OrderLineType" = 'Unclassified'
                  AND (i."Id", r."RowNumber") IN (
                      (142, 197), (1286, 1231), (1547, 1442), (1557, 1452), (1558, 1453), (2855, 3136),
                      (2875, 3129), (2907, 3067), (2908, 3068), (2926, 3130), (3018, 3134), (3132, 3139)
                  );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Exactly the 12 this migration classified, and only while they still say what it left them
            // saying. Item 2988 is not named here because this migration never touched it, and neither are
            // the lines classified by the earlier backfills: undoing those is their own Down's business.
            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems" AS i
                SET "OrderLineType" = 'Unclassified'
                FROM "ImportRowMaterializations" m
                JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
                WHERE m."OrderRequestItemId" = i."Id"
                  AND i."OrderLineType" = 'Monthly'
                  AND (i."Id", r."RowNumber") IN (
                      (142, 197), (1286, 1231), (1547, 1442), (1557, 1452), (1558, 1453), (2855, 3136),
                      (2875, 3129), (2907, 3067), (2908, 3068), (2926, 3130), (3018, 3134), (3132, 3139)
                  );
                """);
        }
    }
}
