using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductMatchDecisions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProductMatchDecisions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Outcome = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SourceVariantId = table.Column<long>(type: "bigint", nullable: true),
                    TargetVariantId = table.Column<long>(type: "bigint", nullable: true),
                    SourceProductId = table.Column<long>(type: "bigint", nullable: false),
                    TargetProductId = table.Column<long>(type: "bigint", nullable: false),
                    VariantLabel = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DecidedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    DecidedByDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DecidedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UndoneByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    UndoneByDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    UndoneAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UndoReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductMatchDecisions", x => x.Id);
                    table.CheckConstraint("CK_ProductMatchDecisions_DifferentSides", "(\"Kind\" = 'SameItem' AND \"SourceVariantId\" <> \"TargetVariantId\") OR (\"Kind\" = 'Variant' AND \"SourceProductId\" <> \"TargetProductId\")");
                    table.CheckConstraint("CK_ProductMatchDecisions_KindShape", "(\"Kind\" = 'SameItem' AND \"SourceVariantId\" IS NOT NULL AND \"TargetVariantId\" IS NOT NULL) OR (\"Kind\" = 'Variant' AND \"SourceVariantId\" IS NULL AND \"TargetVariantId\" IS NULL)");
                    table.CheckConstraint("CK_ProductMatchDecisions_Outcome", "\"Outcome\" IN ('Approved', 'Rejected')");
                    table.CheckConstraint("CK_ProductMatchDecisions_Undo", "(\"UndoneByUserId\" IS NULL AND \"UndoneByDisplayName\" IS NULL AND \"UndoneAtUtc\" IS NULL AND \"UndoReason\" IS NULL) OR (\"UndoneByUserId\" IS NOT NULL AND \"UndoneByDisplayName\" IS NOT NULL AND \"UndoneAtUtc\" IS NOT NULL)");
                    table.CheckConstraint("CK_ProductMatchDecisions_VariantLabel", "(\"VariantLabel\" IS NOT NULL) = (\"Kind\" = 'Variant' AND \"Outcome\" = 'Approved')");
                    table.ForeignKey(
                        name: "FK_ProductMatchDecisions_ProductVariants_SourceVariantId",
                        column: x => x.SourceVariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductMatchDecisions_ProductVariants_TargetVariantId",
                        column: x => x.TargetVariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductMatchDecisions_Products_SourceProductId",
                        column: x => x.SourceProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductMatchDecisions_Products_TargetProductId",
                        column: x => x.TargetProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProductMatchDecisions_SourceProductId",
                table: "ProductMatchDecisions",
                column: "SourceProductId",
                unique: true,
                filter: "\"Kind\" = 'Variant' AND \"Outcome\" = 'Approved' AND \"UndoneAtUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProductMatchDecisions_SourceProductId_TargetProductId",
                table: "ProductMatchDecisions",
                columns: new[] { "SourceProductId", "TargetProductId" },
                unique: true,
                filter: "\"Kind\" = 'Variant' AND \"UndoneAtUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProductMatchDecisions_SourceVariantId",
                table: "ProductMatchDecisions",
                column: "SourceVariantId",
                unique: true,
                filter: "\"Kind\" = 'SameItem' AND \"Outcome\" = 'Approved' AND \"UndoneAtUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProductMatchDecisions_SourceVariantId_TargetVariantId",
                table: "ProductMatchDecisions",
                columns: new[] { "SourceVariantId", "TargetVariantId" },
                unique: true,
                filter: "\"Kind\" = 'SameItem' AND \"UndoneAtUtc\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProductMatchDecisions_TargetProductId",
                table: "ProductMatchDecisions",
                column: "TargetProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductMatchDecisions_TargetVariantId",
                table: "ProductMatchDecisions",
                column: "TargetVariantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductMatchDecisions");
        }
    }
}
