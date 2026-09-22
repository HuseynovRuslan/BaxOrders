using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductVariantResolution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VariantSourceKey",
                table: "ImportRows",
                type: "nvarchar(480)",
                maxLength: 480,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_ImportBatchId_VariantSourceKey",
                table: "ImportRows",
                columns: new[] { "ImportBatchId", "VariantSourceKey" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ImportRows_ImportBatchId_VariantSourceKey",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "VariantSourceKey",
                table: "ImportRows");
        }
    }
}
