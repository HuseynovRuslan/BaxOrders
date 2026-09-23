using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductCategoryDecisions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProductCategoryDecisions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    PreviousCategoryId = table.Column<int>(type: "integer", nullable: true),
                    NewCategoryId = table.Column<int>(type: "integer", nullable: false),
                    DecisionType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductCategoryDecisions", x => x.Id);
                    table.CheckConstraint("CK_ProductCategoryDecisions_AutoFillsBlankOnly", "\"DecisionType\" <> 'AutoUniqueEvidence' OR \"PreviousCategoryId\" IS NULL");
                    table.CheckConstraint("CK_ProductCategoryDecisions_CategoryChanged", "\"PreviousCategoryId\" IS NULL OR \"PreviousCategoryId\" <> \"NewCategoryId\"");
                    table.ForeignKey(
                        name: "FK_ProductCategoryDecisions_Categories_NewCategoryId",
                        column: x => x.NewCategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductCategoryDecisions_Categories_PreviousCategoryId",
                        column: x => x.PreviousCategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductCategoryDecisions_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategoryDecisions_NewCategoryId",
                table: "ProductCategoryDecisions",
                column: "NewCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategoryDecisions_PreviousCategoryId",
                table: "ProductCategoryDecisions",
                column: "PreviousCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCategoryDecisions_ProductId_OccurredAtUtc",
                table: "ProductCategoryDecisions",
                columns: new[] { "ProductId", "OccurredAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductCategoryDecisions");
        }
    }
}
