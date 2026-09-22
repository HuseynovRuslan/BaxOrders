using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ClarifyImportPeriodSemantics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ImportRows_ImportBatchId_MatchedLocationId_ParsedRequestDate",
                table: "ImportRows");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "RequestDate",
                table: "OrderRequests",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AddColumn<DateOnly>(
                name: "ParsedRequestPeriod",
                table: "ImportRows",
                type: "date",
                nullable: true);

            // Already staged rows stored the order workbook's "Tarix" as ParsedRequestDate, but it is a period.
            // Move it to ParsedRequestPeriod (first day of its month) and clear the request date.
            // The source cell text stays in OriginalRequestDate, so nothing is lost.
            migrationBuilder.Sql(
                "UPDATE [ImportRows] SET [ParsedRequestPeriod] = DATEFROMPARTS(YEAR([ParsedRequestDate]), MONTH([ParsedRequestDate]), 1), " +
                "[ParsedRequestDate] = NULL WHERE [ParsedRequestDate] IS NOT NULL;");

            migrationBuilder.InsertData(
                table: "LocationAliases",
                columns: new[] { "Id", "Alias", "CreatedAtUtc", "LocationId", "NormalizedAlias" },
                values: new object[] { 1, "H.Ə.M", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 4, "h.ə.m" });

            migrationBuilder.UpdateData(
                table: "Locations",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Name", "NormalizedName" },
                values: new object[] { "Heydər Əliyev Mərkəzi", "heydər əliyev mərkəzi" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_ImportBatchId_MatchedLocationId_ParsedRequestPeriod",
                table: "ImportRows",
                columns: new[] { "ImportBatchId", "MatchedLocationId", "ParsedRequestPeriod" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_ImportRows_ParsedRequestPeriodIsMonthStart",
                table: "ImportRows",
                sql: "[ParsedRequestPeriod] IS NULL OR DATEPART(day, [ParsedRequestPeriod]) = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ImportRows_ImportBatchId_MatchedLocationId_ParsedRequestPeriod",
                table: "ImportRows");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ImportRows_ParsedRequestPeriodIsMonthStart",
                table: "ImportRows");

            migrationBuilder.DeleteData(
                table: "LocationAliases",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.Sql(
                "UPDATE [ImportRows] SET [ParsedRequestDate] = [ParsedRequestPeriod] " +
                "WHERE [ParsedRequestDate] IS NULL AND [ParsedRequestPeriod] IS NOT NULL;");

            migrationBuilder.DropColumn(
                name: "ParsedRequestPeriod",
                table: "ImportRows");

            // The previous model required a request date; use the period for requests that have none.
            migrationBuilder.Sql("UPDATE [OrderRequests] SET [RequestDate] = [RequestPeriod] WHERE [RequestDate] IS NULL;");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "RequestDate",
                table: "OrderRequests",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1),
                oldClrType: typeof(DateOnly),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.UpdateData(
                table: "Locations",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Name", "NormalizedName" },
                values: new object[] { "H.Ə.M", "h.ə.m" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_ImportBatchId_MatchedLocationId_ParsedRequestDate",
                table: "ImportRows",
                columns: new[] { "ImportBatchId", "MatchedLocationId", "ParsedRequestDate" });
        }
    }
}
