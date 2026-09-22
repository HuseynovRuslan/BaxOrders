using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialDomainModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ParentId = table.Column<int>(type: "int", nullable: true),
                    Level = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                    table.CheckConstraint("CK_Categories_Level", "([ParentId] IS NULL AND [Level] = 1) OR ([ParentId] IS NOT NULL AND [Level] > 1)");
                    table.CheckConstraint("CK_Categories_NotOwnParent", "[ParentId] IS NULL OR [ParentId] <> [Id]");
                    table.ForeignKey(
                        name: "FK_Categories_Categories_ParentId",
                        column: x => x.ParentId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ImportBatches",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OriginalFileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    FileHash = table.Column<string>(type: "char(64)", unicode: false, fixedLength: true, maxLength: 64, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    TotalRows = table.Column<int>(type: "int", nullable: false),
                    ValidRows = table.Column<int>(type: "int", nullable: false),
                    WarningRows = table.Column<int>(type: "int", nullable: false),
                    InvalidRows = table.Column<int>(type: "int", nullable: false),
                    UploadedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportBatches", x => x.Id);
                    table.CheckConstraint("CK_ImportBatches_RowCounts", "[TotalRows] >= 0 AND [ValidRows] >= 0 AND [WarningRows] >= 0 AND [InvalidRows] >= 0 AND [ValidRows] + [WarningRows] + [InvalidRows] <= [TotalRows]");
                });

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ResponsiblePeople",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponsiblePeople", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Suppliers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    Name = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Suppliers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UnitsOfMeasure",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Symbol = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    UnitType = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UnitsOfMeasure", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Products_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderRequests",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    RequestDate = table.Column<DateOnly>(type: "date", nullable: false),
                    RequestPeriod = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Version = table.Column<int>(type: "int", nullable: false),
                    ResponsiblePersonId = table.Column<int>(type: "int", nullable: true),
                    SourceImportBatchId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ApprovedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderRequests", x => x.Id);
                    table.CheckConstraint("CK_OrderRequests_RequestPeriodIsMonthStart", "DATEPART(day, [RequestPeriod]) = 1");
                    table.CheckConstraint("CK_OrderRequests_Version", "[Version] >= 1");
                    table.ForeignKey(
                        name: "FK_OrderRequests_ImportBatches_SourceImportBatchId",
                        column: x => x.SourceImportBatchId,
                        principalTable: "ImportBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrderRequests_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrderRequests_ResponsiblePeople_ResponsiblePersonId",
                        column: x => x.ResponsiblePersonId,
                        principalTable: "ResponsiblePeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UnitOfMeasureAliases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UnitOfMeasureId = table.Column<int>(type: "int", nullable: false),
                    Alias = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    NormalizedAlias = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UnitOfMeasureAliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UnitOfMeasureAliases_UnitsOfMeasure_UnitOfMeasureId",
                        column: x => x.UnitOfMeasureId,
                        principalTable: "UnitsOfMeasure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductAliases",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    Alias = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    NormalizedAlias = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductAliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductAliases_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductVariants",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    SpecificationValue = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    SpecificationUnitId = table.Column<int>(type: "int", nullable: true),
                    ModelCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    OrderUnitId = table.Column<int>(type: "int", nullable: false),
                    NormalizedVariantKey = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariants", x => x.Id);
                    table.CheckConstraint("CK_ProductVariants_SpecificationUnitRequiresValue", "[SpecificationUnitId] IS NULL OR [SpecificationValue] IS NOT NULL");
                    table.ForeignKey(
                        name: "FK_ProductVariants_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductVariants_UnitsOfMeasure_OrderUnitId",
                        column: x => x.OrderUnitId,
                        principalTable: "UnitsOfMeasure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductVariants_UnitsOfMeasure_SpecificationUnitId",
                        column: x => x.SpecificationUnitId,
                        principalTable: "UnitsOfMeasure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ImportRows",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ImportBatchId = table.Column<long>(type: "bigint", nullable: false),
                    SheetName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RowNumber = table.Column<int>(type: "int", nullable: false),
                    OriginalSequenceNumber = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    OriginalMainCategory = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    OriginalMiddleCategory = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    OriginalSubCategory = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    OriginalProductName = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    OriginalSpecificationValue = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    OriginalSpecificationUnit = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    OriginalModelCode = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    OriginalQuantity = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    OriginalOrderUnit = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    OriginalUnitPrice = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    OriginalLineTotal = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    OriginalSupplierName = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    OriginalLocationName = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    OriginalRequestDate = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    OriginalResponsiblePersonName = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    NormalizedProductName = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    NormalizedSupplierName = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    NormalizedLocationName = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ParsedQuantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    ParsedUnitPrice = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    ParsedLineTotal = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    ParsedRequestDate = table.Column<DateOnly>(type: "date", nullable: true),
                    MatchedProductId = table.Column<long>(type: "bigint", nullable: true),
                    MatchedProductVariantId = table.Column<long>(type: "bigint", nullable: true),
                    MatchedSupplierId = table.Column<int>(type: "int", nullable: true),
                    MatchedLocationId = table.Column<int>(type: "int", nullable: true),
                    MatchedResponsiblePersonId = table.Column<int>(type: "int", nullable: true),
                    MatchedCategoryId = table.Column<int>(type: "int", nullable: true),
                    ValidationStatus = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportRows", x => x.Id);
                    table.CheckConstraint("CK_ImportRows_RowNumber", "[RowNumber] > 0");
                    table.ForeignKey(
                        name: "FK_ImportRows_Categories_MatchedCategoryId",
                        column: x => x.MatchedCategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportRows_ImportBatches_ImportBatchId",
                        column: x => x.ImportBatchId,
                        principalTable: "ImportBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ImportRows_Locations_MatchedLocationId",
                        column: x => x.MatchedLocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportRows_ProductVariants_MatchedProductVariantId",
                        column: x => x.MatchedProductVariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportRows_Products_MatchedProductId",
                        column: x => x.MatchedProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportRows_ResponsiblePeople_MatchedResponsiblePersonId",
                        column: x => x.MatchedResponsiblePersonId,
                        principalTable: "ResponsiblePeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportRows_Suppliers_MatchedSupplierId",
                        column: x => x.MatchedSupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderRequestItems",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderRequestId = table.Column<long>(type: "bigint", nullable: false),
                    ProductVariantId = table.Column<long>(type: "bigint", nullable: false),
                    SupplierId = table.Column<int>(type: "int", nullable: true),
                    Quantity = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: true),
                    OriginalProductName = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderRequestItems", x => x.Id);
                    table.CheckConstraint("CK_OrderRequestItems_Quantity", "[Quantity] > 0");
                    table.CheckConstraint("CK_OrderRequestItems_UnitPrice", "[UnitPrice] IS NULL OR [UnitPrice] >= 0");
                    table.ForeignKey(
                        name: "FK_OrderRequestItems_OrderRequests_OrderRequestId",
                        column: x => x.OrderRequestId,
                        principalTable: "OrderRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderRequestItems_ProductVariants_ProductVariantId",
                        column: x => x.ProductVariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrderRequestItems_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ImportRowIssues",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ImportRowId = table.Column<long>(type: "bigint", nullable: false),
                    IssueType = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    FieldName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Message = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    SuggestedEntityId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportRowIssues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportRowIssues_ImportRows_ImportRowId",
                        column: x => x.ImportRowId,
                        principalTable: "ImportRows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Locations",
                columns: new[] { "Id", "Code", "CreatedAtUtc", "IsActive", "Name", "NormalizedName", "UpdatedAtUtc" },
                values: new object[,]
                {
                    { 1, "RAMANA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "Ramana", "ramana", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, "MASTAGA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "Maştağa", "maştağa", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, "EMIRCAN", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "Əmircan", "əmircan", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 4, "HEM", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "H.Ə.M", "h.ə.m", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "UnitsOfMeasure",
                columns: new[] { "Id", "Code", "IsActive", "Name", "Symbol", "UnitType" },
                values: new object[,]
                {
                    { 1, "PCS", true, "Ədəd", "ədəd", "Count" },
                    { 2, "PACK", true, "Paçka", "paçka", "Package" },
                    { 3, "PAIR", true, "Cüt", "cüt", "Pair" },
                    { 4, "CM", true, "Santimetr", "sm", "Length" },
                    { 5, "M", true, "Metr", "m", "Length" },
                    { 6, "G", true, "Qram", "qr", "Mass" },
                    { 7, "KG", true, "Kiloqram", "kq", "Mass" },
                    { 8, "ML", true, "Millilitr", "ml", "Volume" },
                    { 9, "L", true, "Litr", "lt", "Volume" }
                });

            migrationBuilder.InsertData(
                table: "UnitOfMeasureAliases",
                columns: new[] { "Id", "Alias", "CreatedAtUtc", "NormalizedAlias", "UnitOfMeasureId" },
                values: new object[,]
                {
                    { 1, "Ədəd", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "ədəd", 1 },
                    { 2, "Paçka", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "paçka", 2 },
                    { 3, "Cüt", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "cüt", 3 },
                    { 4, "Santimetr", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "santimetr", 4 },
                    { 5, "sm", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "sm", 4 },
                    { 6, "Metr", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "metr", 5 },
                    { 7, "m", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "m", 5 },
                    { 8, "Qram", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "qram", 6 },
                    { 9, "qr", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "qr", 6 },
                    { 10, "Kiloqram", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "kiloqram", 7 },
                    { 11, "kq", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "kq", 7 },
                    { 12, "Millilitr", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "millilitr", 8 },
                    { 13, "ml", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "ml", 8 },
                    { 14, "Litr", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "litr", 9 },
                    { 15, "lt", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "lt", 9 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_ParentId_NormalizedName",
                table: "Categories",
                columns: new[] { "ParentId", "NormalizedName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportBatches_FileHash",
                table: "ImportBatches",
                column: "FileHash");

            migrationBuilder.CreateIndex(
                name: "IX_ImportRowIssues_ImportRowId",
                table: "ImportRowIssues",
                column: "ImportRowId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_ImportBatchId_SheetName_RowNumber",
                table: "ImportRows",
                columns: new[] { "ImportBatchId", "SheetName", "RowNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_ImportBatchId_ValidationStatus",
                table: "ImportRows",
                columns: new[] { "ImportBatchId", "ValidationStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_MatchedCategoryId",
                table: "ImportRows",
                column: "MatchedCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_MatchedLocationId",
                table: "ImportRows",
                column: "MatchedLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_MatchedProductId",
                table: "ImportRows",
                column: "MatchedProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_MatchedProductVariantId",
                table: "ImportRows",
                column: "MatchedProductVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_MatchedResponsiblePersonId",
                table: "ImportRows",
                column: "MatchedResponsiblePersonId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_MatchedSupplierId",
                table: "ImportRows",
                column: "MatchedSupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_Code",
                table: "Locations",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Locations_NormalizedName",
                table: "Locations",
                column: "NormalizedName");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestItems_OrderRequestId",
                table: "OrderRequestItems",
                column: "OrderRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestItems_ProductVariantId",
                table: "OrderRequestItems",
                column: "ProductVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestItems_SupplierId",
                table: "OrderRequestItems",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequests_LocationId_RequestPeriod",
                table: "OrderRequests",
                columns: new[] { "LocationId", "RequestPeriod" });

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequests_ResponsiblePersonId",
                table: "OrderRequests",
                column: "ResponsiblePersonId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequests_SourceImportBatchId",
                table: "OrderRequests",
                column: "SourceImportBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequests_Status",
                table: "OrderRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ProductAliases_NormalizedAlias",
                table: "ProductAliases",
                column: "NormalizedAlias",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductAliases_ProductId",
                table: "ProductAliases",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_CategoryId",
                table: "Products",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_Code",
                table: "Products",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_NormalizedName",
                table: "Products",
                column: "NormalizedName");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_OrderUnitId",
                table: "ProductVariants",
                column: "OrderUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_ProductId_NormalizedVariantKey",
                table: "ProductVariants",
                columns: new[] { "ProductId", "NormalizedVariantKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_SpecificationUnitId",
                table: "ProductVariants",
                column: "SpecificationUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsiblePeople_NormalizedName",
                table: "ResponsiblePeople",
                column: "NormalizedName");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_Code",
                table: "Suppliers",
                column: "Code",
                unique: true,
                filter: "[Code] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_NormalizedName",
                table: "Suppliers",
                column: "NormalizedName");

            migrationBuilder.CreateIndex(
                name: "IX_UnitOfMeasureAliases_NormalizedAlias",
                table: "UnitOfMeasureAliases",
                column: "NormalizedAlias",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UnitOfMeasureAliases_UnitOfMeasureId",
                table: "UnitOfMeasureAliases",
                column: "UnitOfMeasureId");

            migrationBuilder.CreateIndex(
                name: "IX_UnitsOfMeasure_Code",
                table: "UnitsOfMeasure",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ImportRowIssues");

            migrationBuilder.DropTable(
                name: "OrderRequestItems");

            migrationBuilder.DropTable(
                name: "ProductAliases");

            migrationBuilder.DropTable(
                name: "UnitOfMeasureAliases");

            migrationBuilder.DropTable(
                name: "ImportRows");

            migrationBuilder.DropTable(
                name: "OrderRequests");

            migrationBuilder.DropTable(
                name: "ProductVariants");

            migrationBuilder.DropTable(
                name: "Suppliers");

            migrationBuilder.DropTable(
                name: "ImportBatches");

            migrationBuilder.DropTable(
                name: "Locations");

            migrationBuilder.DropTable(
                name: "ResponsiblePeople");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "UnitsOfMeasure");

            migrationBuilder.DropTable(
                name: "Categories");
        }
    }
}
