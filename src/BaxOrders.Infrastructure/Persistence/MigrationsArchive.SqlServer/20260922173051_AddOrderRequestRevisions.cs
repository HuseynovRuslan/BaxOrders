using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderRequestRevisions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "SourceOrderRequestItemId",
                table: "OrderRequestItems",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OrderRequestEditEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderRequestId = table.Column<long>(type: "bigint", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    OrderRequestItemId = table.Column<long>(type: "bigint", nullable: true),
                    ProductVariantId = table.Column<long>(type: "bigint", nullable: true),
                    Field = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    OldValue = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    NewValue = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    ActorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActorDisplayName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderRequestEditEvents", x => x.Id);
                    table.CheckConstraint("CK_OrderRequestEditEvents_FieldMatchesAction", "([Action] IN ('ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged') AND [Field] IS NOT NULL) OR ([Action] NOT IN ('ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged') AND [Field] IS NULL)");
                    table.CheckConstraint("CK_OrderRequestEditEvents_ItemEventNamesItem", "[Action] = 'RevisionCreated' OR ([OrderRequestItemId] IS NOT NULL AND [ProductVariantId] IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_OrderRequestEditEvents_AspNetUsers_ActorUserId",
                        column: x => x.ActorUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrderRequestEditEvents_OrderRequests_OrderRequestId",
                        column: x => x.OrderRequestId,
                        principalTable: "OrderRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderRequestEditEvents_ProductVariants_ProductVariantId",
                        column: x => x.ProductVariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderRequestRevisions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SourceOrderRequestId = table.Column<long>(type: "bigint", nullable: false),
                    RevisionOrderRequestId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedByDisplayName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderRequestRevisions", x => x.Id);
                    table.CheckConstraint("CK_OrderRequestRevisions_NotItself", "[SourceOrderRequestId] <> [RevisionOrderRequestId]");
                    table.ForeignKey(
                        name: "FK_OrderRequestRevisions_AspNetUsers_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrderRequestRevisions_OrderRequests_RevisionOrderRequestId",
                        column: x => x.RevisionOrderRequestId,
                        principalTable: "OrderRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrderRequestRevisions_OrderRequests_SourceOrderRequestId",
                        column: x => x.SourceOrderRequestId,
                        principalTable: "OrderRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestItems_SourceOrderRequestItemId",
                table: "OrderRequestItems",
                column: "SourceOrderRequestItemId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestEditEvents_ActorUserId",
                table: "OrderRequestEditEvents",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestEditEvents_OrderRequestId_OccurredAtUtc",
                table: "OrderRequestEditEvents",
                columns: new[] { "OrderRequestId", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestEditEvents_OrderRequestItemId",
                table: "OrderRequestEditEvents",
                column: "OrderRequestItemId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestEditEvents_ProductVariantId",
                table: "OrderRequestEditEvents",
                column: "ProductVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestRevisions_CreatedByUserId",
                table: "OrderRequestRevisions",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestRevisions_RevisionOrderRequestId",
                table: "OrderRequestRevisions",
                column: "RevisionOrderRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestRevisions_SourceOrderRequestId",
                table: "OrderRequestRevisions",
                column: "SourceOrderRequestId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderRequestItems_OrderRequestItems_SourceOrderRequestItemId",
                table: "OrderRequestItems",
                column: "SourceOrderRequestItemId",
                principalTable: "OrderRequestItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderRequestItems_OrderRequestItems_SourceOrderRequestItemId",
                table: "OrderRequestItems");

            migrationBuilder.DropTable(
                name: "OrderRequestEditEvents");

            migrationBuilder.DropTable(
                name: "OrderRequestRevisions");

            migrationBuilder.DropIndex(
                name: "IX_OrderRequestItems_SourceOrderRequestItemId",
                table: "OrderRequestItems");

            migrationBuilder.DropColumn(
                name: "SourceOrderRequestItemId",
                table: "OrderRequestItems");
        }
    }
}
