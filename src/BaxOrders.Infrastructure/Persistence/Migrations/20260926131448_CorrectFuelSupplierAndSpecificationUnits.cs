using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CorrectFuelSupplierAndSpecificationUnits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ================================================================================================
            // Five corrections the business reviewed line by line and accepted. Nothing here is a pattern
            // applied broadly: every statement names the exact rows it touches and refuses to fire unless the
            // data still looks the way it looked when the decision was taken. No Original* value is rewritten
            // — the imported file keeps saying what it said, and this is the correction recorded beside it.
            // ================================================================================================

            // ---- 1. Fuel supplier: three lines where an object name sat in the supplier column ------------
            //
            // "Yanacaqlarda SOCAR yazılır." Three Benzin/Dizel lines carry an object name where the supplier
            // belongs — "H.Ə.M" on two, "Bülbül parkı" on the third — so none of them ever matched a supplier
            // and all three still have no SupplierId at all. Nothing is being replaced: a blank is being
            // filled with the supplier the business names.
            //
            // The object names stay exactly where they are in the import row. A supplier decision says
            // nothing about which object ordered the fuel, and those location questions are still open.
            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems" AS i
                SET "SupplierId" = s."Id"
                FROM "ImportRowMaterializations" m
                JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
                CROSS JOIN "Suppliers" s
                WHERE m."OrderRequestItemId" = i."Id"
                  AND i."SupplierId" IS NULL
                  AND s."NormalizedName" = 'socar'
                  AND s."IsActive"
                  AND (i."Id", r."RowNumber") IN ((1939, 2102), (1940, 2103), (1711, 2114));
                """);

            // ---- 2. Specification unit: "lik" was never a unit --------------------------------------------
            //
            // "lik" is an Azerbaijani suffix ("115-lik"), not a measurement. It reaches 209 import rows and
            // resolves to a unit in none of them, which is why ProductVariantKey carries it as a descriptor
            // rather than a unit. For these two variants the business confirmed the real unit is millimetre:
            // both are 115, both are grinder consumables, and the same product already holds a sibling
            // variant recorded as 115 MM.
            //
            // A variant has either a unit or a descriptor, never both, and its key is built from whichever it
            // has — so correcting the unit changes the variant's identity and the key must move with it. The
            // statement pins the exact key it expects to find, so it is a no-op anywhere the data differs,
            // and the unique index on (ProductId, NormalizedVariantKey) remains the authoritative guard.
            //
            // Only these two are touched. The third "lik" variant the workbook also rewrites (id 21702, where
            // the specification itself changes from 2 to 115) is not confirmed and is left alone.
            migrationBuilder.Sql("""
                UPDATE "ProductVariants"
                SET "SpecificationUnitId" = (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'),
                    "SpecificationDescriptor" = NULL,
                    "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=|orderUnit=PCS'
                WHERE "Id" IN (21685, 21692)
                  AND "SpecificationUnitId" IS NULL
                  AND "SpecificationDescriptor" = 'lik'
                  AND "SpecificationValue" = '115'
                  AND "NormalizedVariantKey" = 'specification=115|specUnit=|model=|orderUnit=PCS|descriptor=lik';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Both corrections are reversed exactly, and each is guarded by the state this migration left
            // behind, so a Down on a database that never had them does nothing.
            migrationBuilder.Sql("""
                UPDATE "ProductVariants"
                SET "SpecificationUnitId" = NULL,
                    "SpecificationDescriptor" = 'lik',
                    "NormalizedVariantKey" = 'specification=115|specUnit=|model=|orderUnit=PCS|descriptor=lik'
                WHERE "Id" IN (21685, 21692)
                  AND "SpecificationDescriptor" IS NULL
                  AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=|orderUnit=PCS';
                """);

            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems" AS i
                SET "SupplierId" = NULL
                FROM "ImportRowMaterializations" m
                JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
                WHERE m."OrderRequestItemId" = i."Id"
                  AND i."SupplierId" = (SELECT "Id" FROM "Suppliers" WHERE "NormalizedName" = 'socar')
                  AND (i."Id", r."RowNumber") IN ((1939, 2102), (1940, 2103), (1711, 2114));
                """);
        }
    }
}
