using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddImportResolutionWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence(
                name: "LocationCodeNumbers");

            migrationBuilder.AddColumn<int>(
                name: "MatchedOrderUnitId",
                table: "ImportRows",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MatchedSpecificationUnitId",
                table: "ImportRows",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NormalizedCategoryPath",
                table: "ImportRows",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NormalizedOrderUnit",
                table: "ImportRows",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NormalizedResponsiblePersonName",
                table: "ImportRows",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NormalizedSpecificationUnit",
                table: "ImportRows",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Origin",
                table: "ImportRowIssues",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Parsing");

            // Issues staged before origins existed: classify them by type, so a review decision rebuilds only the
            // Matching issues and leaves parsing, validation and duplicate issues untouched.
            migrationBuilder.Sql(
                """
                UPDATE [ImportRowIssues] SET [Origin] = CASE
                    WHEN [IssueType] IN ('UnknownProduct', 'UnknownProductVariant', 'UnknownSupplier', 'UnknownLocation',
                                         'UnknownUnit', 'UnknownCategory', 'UnknownResponsiblePerson', 'AmbiguousMatch') THEN 'Matching'
                    WHEN [IssueType] = 'DuplicateRow' THEN 'DuplicateDetection'
                    WHEN [IssueType] = 'MissingRequiredValue' AND [FieldName] IN (N'Obyekt', N'Ö/v') THEN 'Matching'
                    WHEN [IssueType] IN ('MissingRequiredValue', 'LineTotalMismatch') THEN 'Validation'
                    WHEN [IssueType] = 'Other' AND [Message] LIKE 'A specification unit requires%' THEN 'Matching'
                    ELSE 'Parsing' END;
                """);

            migrationBuilder.CreateTable(
                name: "ImportResolutions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ImportBatchId = table.Column<long>(type: "bigint", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    SourceKey = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    SourceKeyHash = table.Column<string>(type: "char(64)", unicode: false, fixedLength: true, maxLength: 64, nullable: false),
                    Scope = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: true),
                    SupplierId = table.Column<int>(type: "int", nullable: true),
                    ResponsiblePersonId = table.Column<int>(type: "int", nullable: true),
                    UnitOfMeasureId = table.Column<int>(type: "int", nullable: true),
                    CategoryId = table.Column<int>(type: "int", nullable: true),
                    ProductId = table.Column<long>(type: "bigint", nullable: true),
                    ProductVariantId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportResolutions", x => x.Id);
                    table.CheckConstraint("CK_ImportResolutions_SingleTarget", "(CASE WHEN [LocationId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [SupplierId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ResponsiblePersonId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [UnitOfMeasureId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [CategoryId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ProductId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ProductVariantId] IS NULL THEN 0 ELSE 1 END) = 1");
                    table.ForeignKey(
                        name: "FK_ImportResolutions_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportResolutions_ImportBatches_ImportBatchId",
                        column: x => x.ImportBatchId,
                        principalTable: "ImportBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ImportResolutions_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportResolutions_ProductVariants_ProductVariantId",
                        column: x => x.ProductVariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportResolutions_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportResolutions_ResponsiblePeople_ResponsiblePersonId",
                        column: x => x.ResponsiblePersonId,
                        principalTable: "ResponsiblePeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportResolutions_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportResolutions_UnitsOfMeasure_UnitOfMeasureId",
                        column: x => x.UnitOfMeasureId,
                        principalTable: "UnitsOfMeasure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_MatchedOrderUnitId",
                table: "ImportRows",
                column: "MatchedOrderUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_MatchedSpecificationUnitId",
                table: "ImportRows",
                column: "MatchedSpecificationUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportResolutions_CategoryId",
                table: "ImportResolutions",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportResolutions_ImportBatchId_Kind_SourceKeyHash",
                table: "ImportResolutions",
                columns: new[] { "ImportBatchId", "Kind", "SourceKeyHash" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportResolutions_LocationId",
                table: "ImportResolutions",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportResolutions_ProductId",
                table: "ImportResolutions",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportResolutions_ProductVariantId",
                table: "ImportResolutions",
                column: "ProductVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportResolutions_ResponsiblePersonId",
                table: "ImportResolutions",
                column: "ResponsiblePersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportResolutions_SupplierId",
                table: "ImportResolutions",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportResolutions_UnitOfMeasureId",
                table: "ImportResolutions",
                column: "UnitOfMeasureId");

            migrationBuilder.AddForeignKey(
                name: "FK_ImportRows_UnitsOfMeasure_MatchedOrderUnitId",
                table: "ImportRows",
                column: "MatchedOrderUnitId",
                principalTable: "UnitsOfMeasure",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ImportRows_UnitsOfMeasure_MatchedSpecificationUnitId",
                table: "ImportRows",
                column: "MatchedSpecificationUnitId",
                principalTable: "UnitsOfMeasure",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ImportRows_UnitsOfMeasure_MatchedOrderUnitId",
                table: "ImportRows");

            migrationBuilder.DropForeignKey(
                name: "FK_ImportRows_UnitsOfMeasure_MatchedSpecificationUnitId",
                table: "ImportRows");

            migrationBuilder.DropTable(
                name: "ImportResolutions");

            migrationBuilder.DropIndex(
                name: "IX_ImportRows_MatchedOrderUnitId",
                table: "ImportRows");

            migrationBuilder.DropIndex(
                name: "IX_ImportRows_MatchedSpecificationUnitId",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "MatchedOrderUnitId",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "MatchedSpecificationUnitId",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "NormalizedCategoryPath",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "NormalizedOrderUnit",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "NormalizedResponsiblePersonName",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "NormalizedSpecificationUnit",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "Origin",
                table: "ImportRowIssues");

            migrationBuilder.DropSequence(
                name: "LocationCodeNumbers");
        }
    }
}
