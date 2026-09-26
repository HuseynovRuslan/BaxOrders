using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddImportRowOrderLineType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Provenance for the workbook's "Növ" column. Nothing is backfilled: rows staged from workbooks
            // that had no such column said nothing about classification, and null is what that means. The
            // historical lines already carry their classification on the item itself.
            migrationBuilder.AddColumn<string>(
                name: "OriginalOrderLineType",
                table: "ImportRows",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OriginalOrderLineType",
                table: "ImportRows");
        }
    }
}
