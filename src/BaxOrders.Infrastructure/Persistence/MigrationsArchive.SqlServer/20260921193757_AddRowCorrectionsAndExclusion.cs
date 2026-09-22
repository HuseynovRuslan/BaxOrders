using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRowCorrectionsAndExclusion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DuplicateFingerprint",
                table: "ImportRows",
                type: "char(64)",
                unicode: false,
                fixedLength: true,
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExcludedAtUtc",
                table: "ImportRows",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExclusionReason",
                table: "ImportRows",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsExcluded",
                table: "ImportRows",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ExcludedRows",
                table: "ImportBatches",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "ImportRowCorrections",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ImportRowId = table.Column<long>(type: "bigint", nullable: false),
                    Field = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    CorrectedValue = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportRowCorrections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportRowCorrections_ImportRows_ImportRowId",
                        column: x => x.ImportRowId,
                        principalTable: "ImportRows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_ImportBatchId_DuplicateFingerprint",
                table: "ImportRows",
                columns: new[] { "ImportBatchId", "DuplicateFingerprint" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_ImportBatchId_IsExcluded",
                table: "ImportRows",
                columns: new[] { "ImportBatchId", "IsExcluded" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportRowCorrections_ImportRowId_Field",
                table: "ImportRowCorrections",
                columns: new[] { "ImportRowId", "Field" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ImportRowCorrections");

            migrationBuilder.DropIndex(
                name: "IX_ImportRows_ImportBatchId_DuplicateFingerprint",
                table: "ImportRows");

            migrationBuilder.DropIndex(
                name: "IX_ImportRows_ImportBatchId_IsExcluded",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "DuplicateFingerprint",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "ExcludedAtUtc",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "ExclusionReason",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "IsExcluded",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "ExcludedRows",
                table: "ImportBatches");
        }
    }
}
