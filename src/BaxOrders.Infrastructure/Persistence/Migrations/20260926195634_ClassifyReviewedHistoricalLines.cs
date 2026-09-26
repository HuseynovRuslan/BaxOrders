using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ClassifyReviewedHistoricalLines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ================================================================================================
            // 38 of the 51 lines left unclassified by the first backfill, reviewed one by one against the
            // authoritative "Aylıq" sheet and accepted by the business. Nothing but OrderLineType moves: no
            // price, product, variant, quantity, unit, supplier, location, responsible person or Original*
            // value is touched, and no row is created or removed.
            //
            // Why these lines were left out the first time: the workbook renamed the product, so the
            // alignment could not tie the line to its source row on the product name. The review put each one
            // back beside its candidate and graded it on the evidence in order — provenance, period, canonical
            // location, product, quantity, unit, price:
            //
            //   34 HIGH    the source row number matches exactly, and period, object, quantity, unit and price
            //              all agree. The only difference is the name, and the rename is systematic: eleven
            //              distinct wordings collapse into "Laqonda nasadkası üçün şkurka", thirteen into
            //              "Laqonda daşı metal üçün", and so on.
            //   4 MEDIUM   the same, except the source row sits one behind — the shift this workbook is known
            //              to have from row 3035 on, and which no other row of these four can be confused
            //              with, because a neighbouring row would have had to carry the same product, the same
            //              quantity and the same period, and none does.
            //
            // The 13 that stay unclassified are named in the Down below and are deliberately not listed here.
            //
            // Idempotent: every statement requires the line to be Unclassified now, so running it again moves
            // nothing and it can never overwrite a classification somebody has since made by hand. Auditable:
            // the pairs are the review, line by line, in version control, and the migration history row records
            // when they were applied.
            //
            // A line is named by the pair (item id, source row number). The two are never equal in this data,
            // so the pair is a two-key check; on any other database it matches nothing and this does nothing.
            // ================================================================================================

            // ---- 1. The month's planned material ---------------------------------------------------------
            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems" AS i
                SET "OrderLineType" = 'Monthly'
                FROM "ImportRowMaterializations" m
                JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
                WHERE m."OrderRequestItemId" = i."Id"
                  AND i."OrderLineType" = 'Unclassified'
                  AND (i."Id", r."RowNumber") IN (
                      (97, 247), (117, 172), (236, 142), (275, 448), (373, 504), (422, 368),
                      (425, 371), (533, 302), (594, 584), (821, 760), (1007, 1060), (1091, 999),
                      (1122, 1539), (1136, 1300), (1249, 1194), (1256, 1201), (1257, 1202), (1288, 1233),
                      (1378, 1141), (1463, 1503), (1464, 1504), (1465, 1505), (1658, 1907), (1737, 1850),
                      (1792, 1730), (1896, 1653), (1988, 2035), (2344, 2250), (2345, 2251), (2346, 2252),
                      (2509, 2201), (2862, 3111), (2863, 3112), (2885, 3045), (3042, 2920), (3070, 3137)
                  );
                """);

            // ---- 2. Ordered on top of the plan -----------------------------------------------------------
            //
            // Two lines, and the workbook says so itself: rows 2313 and 2314 of "Aylıq" carry "Aylıqdan
            // kənar" in the Növ column. Both are grinder abrasives bought for Fəvvarələr meydanı in July.
            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems" AS i
                SET "OrderLineType" = 'OutsideMonthly'
                FROM "ImportRowMaterializations" m
                JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
                WHERE m."OrderRequestItemId" = i."Id"
                  AND i."OrderLineType" = 'Unclassified'
                  AND (i."Id", r."RowNumber") IN (
                      (2407, 2313), (2408, 2314)
                  );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Exactly the 38 lines this migration classified, and only while they still say what it left
            // them saying. The 13 it deliberately did not touch — items 142, 1286, 1547, 1557, 1558, 2855,
            // 2875, 2907, 2908, 2926, 2988, 3018 and 3132 — are unclassified either way and are not named
            // here, because a Down that touched them would be undoing something this migration never did.
            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems" AS i
                SET "OrderLineType" = 'Unclassified'
                FROM "ImportRowMaterializations" m
                JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
                WHERE m."OrderRequestItemId" = i."Id"
                  AND i."OrderLineType" = 'Monthly'
                  AND (i."Id", r."RowNumber") IN (
                      (97, 247), (117, 172), (236, 142), (275, 448), (373, 504), (422, 368),
                      (425, 371), (533, 302), (594, 584), (821, 760), (1007, 1060), (1091, 999),
                      (1122, 1539), (1136, 1300), (1249, 1194), (1256, 1201), (1257, 1202), (1288, 1233),
                      (1378, 1141), (1463, 1503), (1464, 1504), (1465, 1505), (1658, 1907), (1737, 1850),
                      (1792, 1730), (1896, 1653), (1988, 2035), (2344, 2250), (2345, 2251), (2346, 2252),
                      (2509, 2201), (2862, 3111), (2863, 3112), (2885, 3045), (3042, 2920), (3070, 3137)
                  );
                """);

            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems" AS i
                SET "OrderLineType" = 'Unclassified'
                FROM "ImportRowMaterializations" m
                JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
                WHERE m."OrderRequestItemId" = i."Id"
                  AND i."OrderLineType" = 'OutsideMonthly'
                  AND (i."Id", r."RowNumber") IN (
                      (2407, 2313), (2408, 2314)
                  );
                """);
        }
    }
}
