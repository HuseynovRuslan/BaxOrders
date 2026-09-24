using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLinePricingModeAndHistoricalApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PricingMode",
                table: "OrderRequestItems",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "PriceRequired");

            // ---- 1. Supply that the business confirmed is internal and free --------------------------
            //
            // One workbook supplier cell, "Azpetrol baza", names material the company supplies itself at no
            // charge. It never matched a catalogue supplier, so these lines carry no SupplierId at all and
            // the only record of where they came from is the import row they were made from — which is
            // exactly what is matched here.
            //
            // This is one confirmed source, matched on the value the workbook actually held. It is not a
            // pattern and not a guess.
            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems" AS i
                SET "PricingMode" = 'InternalFreeSupply'
                FROM "ImportRowMaterializations" m
                JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
                WHERE m."OrderRequestItemId" = i."Id"
                  AND i."UnitPrice" IS NULL
                  AND r."NormalizedSupplierName" = 'azpetrol baza';
                """);

            // ---- 2. Supply nobody has classified yet -------------------------------------------------
            //
            // Qala anbar is mixed: the business states that some of its material is bought through Cleanfix
            // MMC and some is issued free from the same store, and the data cannot tell the two apart — the
            // same supplier appears on 94 unpriced lines and 103 priced ones, and 19 of its product variants
            // are also supplied by Cleanfix.
            //
            // So these are not marked free. They are marked Unresolved, which keeps every existing warning
            // in place and puts the rows in front of a person to decide. Marking them free would silence 94
            // warnings on the strength of a guess.
            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems"
                SET "PricingMode" = 'Unresolved'
                WHERE "UnitPrice" IS NULL
                  AND "PricingMode" = 'PriceRequired';
                """);

            // ---- 3. The supplier-level default, corrected ---------------------------------------------
            //
            // The previous attempt recorded this against the supplier and marked Qala baza as never needing
            // a price. The business has since corrected that: it is mixed. The default goes back to expecting
            // a price, which is the safe reading for any line created from it in future.
            migrationBuilder.Sql("""
                UPDATE "Suppliers" SET "PriceRequirement" = 'Required' WHERE "NormalizedName" = 'qala baza';
                """);

            // ---- 4. History that was approved before this system existed ------------------------------
            //
            // Every request currently in the database came in from a workbook, and the business confirms all
            // of them were already approved in real life. Leaving them as "not approved" misstates the record.
            //
            // The event written beside each one says what actually happened: ImportedAsApproved, with no
            // actor id, because nobody in this system approved them. It is deliberately not an Approved
            // event, which would put a decision in the history that was never taken here. Requests created
            // in this application from now on go through the normal workflow untouched.
            //
            // SubmittedAtUtc and ApprovedAtUtc are left null on purpose. These requests were approved at some
            // real moment that this system does not know, and stamping them with the moment the migration ran
            // would be a date nobody can stand behind. The event beside them carries the only time that is
            // true: when they were carried in.
            migrationBuilder.Sql("""
                INSERT INTO "OrderRequestWorkflowEvents"
                    ("OrderRequestId", "Action", "FromStatus", "ToStatus", "ActorUserId", "ActorDisplayName",
                     "Comment", "MissingPriceItemCount", "MissingPricesAcknowledged", "OccurredAtUtc")
                SELECT r."Id", 'ImportedAsApproved', r."Status", 'Approved', NULL, 'Sistem',
                       'Tarixi sifariş sistemə artıq təsdiqlənmiş kimi köçürülüb.',
                       (SELECT COUNT(*) FROM "OrderRequestItems" i
                        WHERE i."OrderRequestId" = r."Id" AND i."UnitPrice" IS NULL
                          AND i."PricingMode" <> 'InternalFreeSupply'),
                       FALSE, NOW() AT TIME ZONE 'UTC'
                FROM "OrderRequests" r
                WHERE r."SourceImportBatchId" IS NOT NULL
                  AND r."Status" = 'Draft';
                """);

            migrationBuilder.Sql("""
                UPDATE "OrderRequests"
                SET "Status" = 'Approved'
                WHERE "SourceImportBatchId" IS NOT NULL AND "Status" = 'Draft';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PricingMode",
                table: "OrderRequestItems");
        }
    }
}
