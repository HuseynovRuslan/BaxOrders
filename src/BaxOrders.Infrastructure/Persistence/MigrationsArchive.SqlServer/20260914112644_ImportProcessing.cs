using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ImportProcessing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ImportBatches_FileHash",
                table: "ImportBatches");

            migrationBuilder.AddColumn<string>(
                name: "FailureReason",
                table: "ImportBatches",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_ImportBatchId_MatchedLocationId_ParsedRequestDate",
                table: "ImportRows",
                columns: new[] { "ImportBatchId", "MatchedLocationId", "ParsedRequestDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportBatches_FileHash",
                table: "ImportBatches",
                column: "FileHash",
                unique: true,
                filter: "[FileHash] IS NOT NULL AND [Status] <> 'Failed'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ImportRows_ImportBatchId_MatchedLocationId_ParsedRequestDate",
                table: "ImportRows");

            migrationBuilder.DropIndex(
                name: "IX_ImportBatches_FileHash",
                table: "ImportBatches");

            migrationBuilder.DropColumn(
                name: "FailureReason",
                table: "ImportBatches");

            migrationBuilder.CreateIndex(
                name: "IX_ImportBatches_FileHash",
                table: "ImportBatches",
                column: "FileHash");
        }
    }
}
