using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Puts the responsible person where the source states it — on the line — and fills it in for the history.
    /// </summary>
    /// <remarks>
    /// The order workbook carries "Cavabdeh şəxs" as a column, one cell per line, and one request routinely
    /// holds two or three different people's lines: the cleaning material of one, the fuel and machinery of
    /// another. The import has always resolved that cell per row and then dropped the answer, because a request
    /// has only one place to keep a person and a group of rows may name several. Twelve of the 167 historical
    /// requests are exactly that case, and they carry 39% of the money.
    /// <para>
    /// <see cref="Orders.OrderRequest.ResponsiblePersonId"/> stays, and keeps its own meaning: the whole order
    /// assigned to somebody by an explicit decision — requests 76 and 104 are the two that have one. Where
    /// there is none, a reader is shown the person the lines agree on, or that there are several. Nothing here
    /// touches either of those two, or any other request row.
    /// </para>
    /// <para>
    /// The check constraint is widened here as well, so the edit history can record a line moving from one
    /// person to another. The classification was let into that list by the migration before this one, which
    /// repaired a defect of its own; this adds only the new action.
    /// </para>
    /// </remarks>
    public partial class AddLineLevelResponsiblePerson : Migration
    {
        /// <summary>
        /// Who each historical line was asked for by, taken from the line's own source row.
        /// </summary>
        /// <remarks>
        /// Held as a constant so a test can run the statement this migration runs, rather than a copy of it
        /// that could drift from it. See the comment at the call site for what it prefers and why.
        /// </remarks>
        internal const string BackfillFromSource = """
            UPDATE "OrderRequestItems" AS i
            SET "ResponsiblePersonId" = t.person_id
            FROM (
                SELECT m."OrderRequestItemId" AS item_id,
                       MIN(COALESCE(r."MatchedResponsiblePersonId", p."Id", pa."Id")) AS person_id
                FROM "ImportRowMaterializations" m
                JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
                LEFT JOIN "ResponsiblePeople" p
                       ON p."NormalizedName" = r."NormalizedResponsiblePersonName" AND p."IsActive"
                LEFT JOIN "ResponsiblePersonAliases" a
                       ON a."NormalizedAlias" = r."NormalizedResponsiblePersonName"
                LEFT JOIN "ResponsiblePeople" pa
                       ON pa."Id" = a."ResponsiblePersonId" AND pa."IsActive"
                GROUP BY m."OrderRequestItemId"
            ) AS t
            WHERE i."Id" = t.item_id
              AND t.person_id IS NOT NULL
              AND i."ResponsiblePersonId" IS NULL;
            """;

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderRequestEditEvents_FieldMatchesAction",
                table: "OrderRequestEditEvents");

            migrationBuilder.AddColumn<int>(
                name: "ResponsiblePersonId",
                table: "OrderRequestItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SourceHadResponsiblePersonColumn",
                table: "ImportRows",
                type: "boolean",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestItems_OrderRequestId_ResponsiblePersonId",
                table: "OrderRequestItems",
                columns: new[] { "OrderRequestId", "ResponsiblePersonId" });

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestItems_ResponsiblePersonId",
                table: "OrderRequestItems",
                column: "ResponsiblePersonId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderRequestEditEvents_FieldMatchesAction",
                table: "OrderRequestEditEvents",
                sql: "(\"Action\" IN ('ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged', 'ItemOrderLineTypeChanged', 'ItemResponsiblePersonChanged') AND \"Field\" IS NOT NULL) OR (\"Action\" NOT IN ('ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged', 'ItemOrderLineTypeChanged', 'ItemResponsiblePersonChanged') AND \"Field\" IS NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderRequestItems_ResponsiblePeople_ResponsiblePersonId",
                table: "OrderRequestItems",
                column: "ResponsiblePersonId",
                principalTable: "ResponsiblePeople",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // ================================================================================================
            // Filling in the history, from what its own source rows already say.
            //
            // Two sources, in this order, and they do not disagree anywhere in this data:
            //
            //   1. ImportRows.MatchedResponsiblePersonId — the id the import itself resolved and stored. It is
            //      set on the rows that were imported while the person already had a canonical record.
            //   2. The normalized name beside it, looked up against the active canonical people and their
            //      active aliases. This is the same rule the two materialization migrations before this one
            //      used for whole requests, applied here to one line at a time.
            //
            // Where both answer, they answer the same: checked over every materialized line, 1152 rows carry a
            // matched id and every one of them equals what the name resolves to. The preference is still
            // stated, because the id is what the import decided at the time and the name is the derivation.
            //
            // Grouped by item so that a line can only be written once, whatever the staging data looks like,
            // and guarded on NULL so a person put on a line by hand is never overwritten. Nothing is invented:
            // a line whose cell was empty, or whose name has no canonical record, keeps no person at all.
            //
            // Nothing else moves. No Original* value, no normalized key, no import row, no materialization, no
            // classification, price, quantity, supplier, location, status or workflow event.
            // ================================================================================================
            migrationBuilder.Sql(BackfillFromSource);
        }


        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The column goes, and the backfill goes with it: there is no separate data undo to get wrong. The
            // source rows it was derived from are untouched, so running Up again reproduces it exactly. The
            // constraint goes back to what the migration before this one left, not to what preceded that.
            migrationBuilder.DropForeignKey(
                name: "FK_OrderRequestItems_ResponsiblePeople_ResponsiblePersonId",
                table: "OrderRequestItems");

            migrationBuilder.DropIndex(
                name: "IX_OrderRequestItems_OrderRequestId_ResponsiblePersonId",
                table: "OrderRequestItems");

            migrationBuilder.DropIndex(
                name: "IX_OrderRequestItems_ResponsiblePersonId",
                table: "OrderRequestItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderRequestEditEvents_FieldMatchesAction",
                table: "OrderRequestEditEvents");

            migrationBuilder.DropColumn(
                name: "ResponsiblePersonId",
                table: "OrderRequestItems");

            migrationBuilder.DropColumn(
                name: "SourceHadResponsiblePersonColumn",
                table: "ImportRows");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderRequestEditEvents_FieldMatchesAction",
                table: "OrderRequestEditEvents",
                sql: "(\"Action\" IN ('ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged', 'ItemOrderLineTypeChanged') AND \"Field\" IS NOT NULL) OR (\"Action\" NOT IN ('ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged', 'ItemOrderLineTypeChanged') AND \"Field\" IS NULL)");
        }
    }
}
