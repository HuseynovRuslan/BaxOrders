using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AcceptTheWorkbookPriceForKurekDuz : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ================================================================================================
            // One line the business decided, and nothing else. Item 500 — "Kürək düz", three pieces, Heydər
            // Əliyev Mərkəzi, March 2026 — was imported from a source row with no price and reviewed as
            // material the company supplies itself free of charge. The authoritative workbook now states a
            // price of 4 and a total of 12 on the same line, and the owner has ruled that the workbook is
            // right: it is a purchase, not free supply.
            //
            // No Original* value is rewritten. The historical import row keeps saying what it always said —
            // an empty price — and this is the correction recorded beside it, with the mode change written to
            // the pricing decision log the domain keeps for exactly this.
            //
            // Nothing goes into OrderRequestEditEvents: that log belongs to the content of a correction
            // version, and no revision is being made here.
            // ================================================================================================

            // The change fires only while the line still looks the way it looked when the decision was taken.
            migrationBuilder.Sql("""
                INSERT INTO "OrderItemPricingDecisions"
                    ("OrderRequestItemId", "PreviousMode", "NewMode", "ActorUserId", "ActorDisplayName", "Reason", "OccurredAtUtc")
                SELECT i."Id", 'InternalFreeSupply', 'PriceRequired',
                       'fa7aeed2-288d-4b36-b2f7-d581e465e464'::uuid, 'Administrator',
                       'Sahibin qərarı: yeni səlahiyyətli kitab bu sətir üçün qiymət 4, cəmi 12 yazır — daxili pulsuz təminat deyil, alışdır.',
                       now() AT TIME ZONE 'utc'
                FROM "OrderRequestItems" i
                WHERE i."Id" = 500
                  AND i."UnitPrice" IS NULL
                  AND i."PricingMode" = 'InternalFreeSupply'
                  AND i."Quantity" = 3;
                """);

            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems"
                SET "UnitPrice" = 4, "PricingMode" = 'PriceRequired'
                WHERE "Id" = 500
                  AND "UnitPrice" IS NULL
                  AND "PricingMode" = 'InternalFreeSupply'
                  AND "Quantity" = 3;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Back to free supply with no price, and the decision struck from the log — the same guard, read
            // the other way round, so a line somebody has since edited is left alone.
            migrationBuilder.Sql("""
                UPDATE "OrderRequestItems"
                SET "UnitPrice" = NULL, "PricingMode" = 'InternalFreeSupply'
                WHERE "Id" = 500
                  AND "UnitPrice" = 4
                  AND "PricingMode" = 'PriceRequired'
                  AND "Quantity" = 3;
                """);

            migrationBuilder.Sql("""
                DELETE FROM "OrderItemPricingDecisions"
                WHERE "OrderRequestItemId" = 500
                  AND "PreviousMode" = 'InternalFreeSupply'
                  AND "NewMode" = 'PriceRequired';
                """);
        }
    }
}
