using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddImportMaterialization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ImportMaterializations",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ImportBatchId = table.Column<long>(type: "bigint", nullable: false),
                    ConfirmedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportMaterializations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportMaterializations_ImportBatches_ImportBatchId",
                        column: x => x.ImportBatchId,
                        principalTable: "ImportBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ImportMaterializationGroups",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ImportMaterializationId = table.Column<long>(type: "bigint", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    RequestPeriod = table.Column<DateOnly>(type: "date", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    OrderRequestId = table.Column<long>(type: "bigint", nullable: true),
                    Version = table.Column<int>(type: "int", nullable: true),
                    SourceRowCount = table.Column<int>(type: "int", nullable: false),
                    SkipReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportMaterializationGroups", x => x.Id);
                    table.CheckConstraint("CK_ImportMaterializationGroups_SkipOrRequest", "([Action] = 'Skipped' AND [OrderRequestId] IS NULL AND [SkipReason] IS NOT NULL) OR ([Action] <> 'Skipped' AND [OrderRequestId] IS NOT NULL AND [SkipReason] IS NULL)");
                    table.ForeignKey(
                        name: "FK_ImportMaterializationGroups_ImportMaterializations_ImportMaterializationId",
                        column: x => x.ImportMaterializationId,
                        principalTable: "ImportMaterializations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ImportMaterializationGroups_OrderRequests_OrderRequestId",
                        column: x => x.OrderRequestId,
                        principalTable: "OrderRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ImportRowMaterializations",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ImportMaterializationId = table.Column<long>(type: "bigint", nullable: false),
                    ImportRowId = table.Column<long>(type: "bigint", nullable: false),
                    OrderRequestItemId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportRowMaterializations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportRowMaterializations_ImportMaterializations_ImportMaterializationId",
                        column: x => x.ImportMaterializationId,
                        principalTable: "ImportMaterializations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ImportRowMaterializations_ImportRows_ImportRowId",
                        column: x => x.ImportRowId,
                        principalTable: "ImportRows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportRowMaterializations_OrderRequestItems_OrderRequestItemId",
                        column: x => x.OrderRequestItemId,
                        principalTable: "OrderRequestItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ImportMaterializationGroups_ImportMaterializationId_LocationId_RequestPeriod",
                table: "ImportMaterializationGroups",
                columns: new[] { "ImportMaterializationId", "LocationId", "RequestPeriod" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportMaterializationGroups_OrderRequestId",
                table: "ImportMaterializationGroups",
                column: "OrderRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportMaterializations_ImportBatchId",
                table: "ImportMaterializations",
                column: "ImportBatchId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportRowMaterializations_ImportMaterializationId",
                table: "ImportRowMaterializations",
                column: "ImportMaterializationId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportRowMaterializations_ImportRowId",
                table: "ImportRowMaterializations",
                column: "ImportRowId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportRowMaterializations_OrderRequestItemId",
                table: "ImportRowMaterializations",
                column: "OrderRequestItemId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ImportMaterializationGroups");

            migrationBuilder.DropTable(
                name: "ImportRowMaterializations");

            migrationBuilder.DropTable(
                name: "ImportMaterializations");
        }
    }
}
