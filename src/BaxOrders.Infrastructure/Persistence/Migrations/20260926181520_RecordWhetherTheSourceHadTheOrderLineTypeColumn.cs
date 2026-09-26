using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RecordWhetherTheSourceHadTheOrderLineTypeColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Left null for every row already staged, and deliberately not backfilled either way. Those rows
            // came from workbooks that had no "Növ" column, but a batch already in review is not made invalid
            // retroactively — null reads as "do not block", and every import from here on records the answer.
            migrationBuilder.AddColumn<bool>(
                name: "SourceHadOrderLineTypeColumn",
                table: "ImportRows",
                type: "boolean",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SourceHadOrderLineTypeColumn",
                table: "ImportRows");
        }
    }
}
