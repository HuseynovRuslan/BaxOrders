using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence(
                name: "LocationCodeNumbers");

            migrationBuilder.CreateSequence(
                name: "ProductCodeNumbers");

            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ParentId = table.Column<int>(type: "integer", nullable: true),
                    Level = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                    table.CheckConstraint("CK_Categories_Level", "(\"ParentId\" IS NULL AND \"Level\" = 1) OR (\"ParentId\" IS NOT NULL AND \"Level\" > 1)");
                    table.CheckConstraint("CK_Categories_NotOwnParent", "\"ParentId\" IS NULL OR \"ParentId\" <> \"Id\"");
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
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OriginalFileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    FileHash = table.Column<string>(type: "character(64)", unicode: false, fixedLength: true, maxLength: 64, nullable: true),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    TotalRows = table.Column<int>(type: "integer", nullable: false),
                    ValidRows = table.Column<int>(type: "integer", nullable: false),
                    WarningRows = table.Column<int>(type: "integer", nullable: false),
                    InvalidRows = table.Column<int>(type: "integer", nullable: false),
                    ExcludedRows = table.Column<int>(type: "integer", nullable: false),
                    UploadedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FailureReason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportBatches", x => x.Id);
                    table.CheckConstraint("CK_ImportBatches_RowCounts", "\"TotalRows\" >= 0 AND \"ValidRows\" >= 0 AND \"WarningRows\" >= 0 AND \"InvalidRows\" >= 0 AND \"ValidRows\" + \"WarningRows\" + \"InvalidRows\" <= \"TotalRows\"");
                });

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ResponsiblePeople",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponsiblePeople", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Suppliers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    Name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Suppliers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UnitsOfMeasure",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Symbol = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    UnitType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UnitsOfMeasure", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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
                name: "ImportMaterializations",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ImportBatchId = table.Column<long>(type: "bigint", nullable: false),
                    ConfirmedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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
                name: "LocationAliases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LocationId = table.Column<int>(type: "integer", nullable: false),
                    Alias = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedAlias = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocationAliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LocationAliases_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderRequests",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LocationId = table.Column<int>(type: "integer", nullable: false),
                    RequestPeriod = table.Column<DateOnly>(type: "date", nullable: false),
                    RequestDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    ResponsiblePersonId = table.Column<int>(type: "integer", nullable: true),
                    SourceImportBatchId = table.Column<long>(type: "bigint", nullable: true),
                    ConcurrencyStamp = table.Column<Guid>(type: "uuid", nullable: false),
                    SubmittedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReturnedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderRequests", x => x.Id);
                    table.CheckConstraint("CK_OrderRequests_RequestPeriodIsMonthStart", "EXTRACT(DAY FROM \"RequestPeriod\") = 1");
                    table.CheckConstraint("CK_OrderRequests_Version", "\"Version\" >= 1");
                    table.ForeignKey(
                        name: "FK_OrderRequests_AspNetUsers_SubmittedByUserId",
                        column: x => x.SubmittedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
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
                name: "ResponsiblePersonAliases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ResponsiblePersonId = table.Column<int>(type: "integer", nullable: false),
                    Alias = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedAlias = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponsiblePersonAliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResponsiblePersonAliases_ResponsiblePeople_ResponsiblePerso~",
                        column: x => x.ResponsiblePersonId,
                        principalTable: "ResponsiblePeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SupplierAliases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SupplierId = table.Column<int>(type: "integer", nullable: false),
                    Alias = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    NormalizedAlias = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupplierAliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupplierAliases_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UnitOfMeasureAliases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UnitOfMeasureId = table.Column<int>(type: "integer", nullable: false),
                    Alias = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    NormalizedAlias = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    Alias = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    NormalizedAlias = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    SpecificationValue = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    SpecificationUnitId = table.Column<int>(type: "integer", nullable: true),
                    SpecificationDescriptor = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ModelCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    OrderUnitId = table.Column<int>(type: "integer", nullable: true),
                    NormalizedVariantKey = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariants", x => x.Id);
                    table.CheckConstraint("CK_ProductVariants_SpecificationDescriptorRequiresValue", "\"SpecificationDescriptor\" IS NULL OR \"SpecificationValue\" IS NOT NULL");
                    table.CheckConstraint("CK_ProductVariants_SpecificationUnitOrDescriptor", "\"SpecificationUnitId\" IS NULL OR \"SpecificationDescriptor\" IS NULL");
                    table.CheckConstraint("CK_ProductVariants_SpecificationUnitRequiresValue", "\"SpecificationUnitId\" IS NULL OR \"SpecificationValue\" IS NOT NULL");
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
                name: "ImportMaterializationGroups",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ImportMaterializationId = table.Column<long>(type: "bigint", nullable: false),
                    LocationId = table.Column<int>(type: "integer", nullable: false),
                    RequestPeriod = table.Column<DateOnly>(type: "date", nullable: false),
                    Action = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    OrderRequestId = table.Column<long>(type: "bigint", nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: true),
                    SourceRowCount = table.Column<int>(type: "integer", nullable: false),
                    SkipReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportMaterializationGroups", x => x.Id);
                    table.CheckConstraint("CK_ImportMaterializationGroups_SkipOrRequest", "(\"Action\" = 'Skipped' AND \"OrderRequestId\" IS NULL AND \"SkipReason\" IS NOT NULL) OR (\"Action\" <> 'Skipped' AND \"OrderRequestId\" IS NOT NULL AND \"SkipReason\" IS NULL)");
                    table.ForeignKey(
                        name: "FK_ImportMaterializationGroups_ImportMaterializations_ImportMa~",
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
                name: "OrderRequestRevisions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceOrderRequestId = table.Column<long>(type: "bigint", nullable: false),
                    RevisionOrderRequestId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderRequestRevisions", x => x.Id);
                    table.CheckConstraint("CK_OrderRequestRevisions_NotItself", "\"SourceOrderRequestId\" <> \"RevisionOrderRequestId\"");
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

            migrationBuilder.CreateTable(
                name: "OrderRequestWorkflowEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderRequestId = table.Column<long>(type: "bigint", nullable: false),
                    Action = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    FromStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ToStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Comment = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    MissingPriceItemCount = table.Column<int>(type: "integer", nullable: false),
                    MissingPricesAcknowledged = table.Column<bool>(type: "boolean", nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderRequestWorkflowEvents", x => x.Id);
                    table.CheckConstraint("CK_OrderRequestWorkflowEvents_StatusChanged", "\"FromStatus\" <> \"ToStatus\"");
                    table.ForeignKey(
                        name: "FK_OrderRequestWorkflowEvents_AspNetUsers_ActorUserId",
                        column: x => x.ActorUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrderRequestWorkflowEvents_OrderRequests_OrderRequestId",
                        column: x => x.OrderRequestId,
                        principalTable: "OrderRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ImportResolutions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ImportBatchId = table.Column<long>(type: "bigint", nullable: false),
                    Kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    SourceKey = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    SourceKeyHash = table.Column<string>(type: "character(64)", unicode: false, fixedLength: true, maxLength: 64, nullable: false),
                    Scope = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Action = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    LocationId = table.Column<int>(type: "integer", nullable: true),
                    SupplierId = table.Column<int>(type: "integer", nullable: true),
                    ResponsiblePersonId = table.Column<int>(type: "integer", nullable: true),
                    UnitOfMeasureId = table.Column<int>(type: "integer", nullable: true),
                    CategoryId = table.Column<int>(type: "integer", nullable: true),
                    ProductId = table.Column<long>(type: "bigint", nullable: true),
                    ProductVariantId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportResolutions", x => x.Id);
                    table.CheckConstraint("CK_ImportResolutions_SingleTarget", "(CASE WHEN \"LocationId\" IS NULL THEN 0 ELSE 1 END + CASE WHEN \"SupplierId\" IS NULL THEN 0 ELSE 1 END + CASE WHEN \"ResponsiblePersonId\" IS NULL THEN 0 ELSE 1 END + CASE WHEN \"UnitOfMeasureId\" IS NULL THEN 0 ELSE 1 END + CASE WHEN \"CategoryId\" IS NULL THEN 0 ELSE 1 END + CASE WHEN \"ProductId\" IS NULL THEN 0 ELSE 1 END + CASE WHEN \"ProductVariantId\" IS NULL THEN 0 ELSE 1 END) = CASE WHEN \"Action\" = 'MarkNotAUnit' THEN 0 ELSE 1 END");
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

            migrationBuilder.CreateTable(
                name: "ImportRows",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ImportBatchId = table.Column<long>(type: "bigint", nullable: false),
                    SheetName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RowNumber = table.Column<int>(type: "integer", nullable: false),
                    OriginalSequenceNumber = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OriginalMainCategory = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OriginalMiddleCategory = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OriginalSubCategory = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OriginalProductName = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OriginalSpecificationValue = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OriginalSpecificationUnit = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OriginalModelCode = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OriginalQuantity = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OriginalOrderUnit = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OriginalUnitPrice = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OriginalLineTotal = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OriginalSupplierName = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OriginalLocationName = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OriginalRequestDate = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    OriginalResponsiblePersonName = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    NormalizedProductName = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    NormalizedSupplierName = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    NormalizedLocationName = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    NormalizedResponsiblePersonName = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    NormalizedOrderUnit = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    NormalizedSpecificationUnit = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    NormalizedCategoryPath = table.Column<string>(type: "text", nullable: true),
                    ParsedQuantity = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    ParsedUnitPrice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    ParsedLineTotal = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    ParsedRequestPeriod = table.Column<DateOnly>(type: "date", nullable: true),
                    ParsedRequestDate = table.Column<DateOnly>(type: "date", nullable: true),
                    MatchedProductId = table.Column<long>(type: "bigint", nullable: true),
                    MatchedProductVariantId = table.Column<long>(type: "bigint", nullable: true),
                    MatchedSupplierId = table.Column<int>(type: "integer", nullable: true),
                    MatchedLocationId = table.Column<int>(type: "integer", nullable: true),
                    MatchedResponsiblePersonId = table.Column<int>(type: "integer", nullable: true),
                    MatchedCategoryId = table.Column<int>(type: "integer", nullable: true),
                    MatchedOrderUnitId = table.Column<int>(type: "integer", nullable: true),
                    MatchedSpecificationUnitId = table.Column<int>(type: "integer", nullable: true),
                    SpecificationDescriptor = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    VariantSourceKey = table.Column<string>(type: "character varying(480)", maxLength: 480, nullable: true),
                    DuplicateFingerprint = table.Column<string>(type: "character(64)", unicode: false, fixedLength: true, maxLength: 64, nullable: true),
                    IsExcluded = table.Column<bool>(type: "boolean", nullable: false),
                    ExclusionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ExcludedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ValidationStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportRows", x => x.Id);
                    table.CheckConstraint("CK_ImportRows_ParsedRequestPeriodIsMonthStart", "\"ParsedRequestPeriod\" IS NULL OR EXTRACT(DAY FROM \"ParsedRequestPeriod\") = 1");
                    table.CheckConstraint("CK_ImportRows_RowNumber", "\"RowNumber\" > 0");
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
                    table.ForeignKey(
                        name: "FK_ImportRows_UnitsOfMeasure_MatchedOrderUnitId",
                        column: x => x.MatchedOrderUnitId,
                        principalTable: "UnitsOfMeasure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportRows_UnitsOfMeasure_MatchedSpecificationUnitId",
                        column: x => x.MatchedSpecificationUnitId,
                        principalTable: "UnitsOfMeasure",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderRequestEditEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderRequestId = table.Column<long>(type: "bigint", nullable: false),
                    Action = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    OrderRequestItemId = table.Column<long>(type: "bigint", nullable: true),
                    ProductVariantId = table.Column<long>(type: "bigint", nullable: true),
                    Field = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    OldValue = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    NewValue = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderRequestEditEvents", x => x.Id);
                    table.CheckConstraint("CK_OrderRequestEditEvents_FieldMatchesAction", "(\"Action\" IN ('ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged') AND \"Field\" IS NOT NULL) OR (\"Action\" NOT IN ('ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged') AND \"Field\" IS NULL)");
                    table.CheckConstraint("CK_OrderRequestEditEvents_ItemEventNamesItem", "\"Action\" = 'RevisionCreated' OR (\"OrderRequestItemId\" IS NOT NULL AND \"ProductVariantId\" IS NOT NULL)");
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
                name: "OrderRequestItems",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderRequestId = table.Column<long>(type: "bigint", nullable: false),
                    ProductVariantId = table.Column<long>(type: "bigint", nullable: false),
                    SupplierId = table.Column<int>(type: "integer", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    OriginalProductName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SourceOrderRequestItemId = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderRequestItems", x => x.Id);
                    table.CheckConstraint("CK_OrderRequestItems_Quantity", "\"Quantity\" > 0");
                    table.CheckConstraint("CK_OrderRequestItems_UnitPrice", "\"UnitPrice\" IS NULL OR \"UnitPrice\" >= 0");
                    table.ForeignKey(
                        name: "FK_OrderRequestItems_OrderRequestItems_SourceOrderRequestItemId",
                        column: x => x.SourceOrderRequestItemId,
                        principalTable: "OrderRequestItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
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
                name: "ImportRowCorrections",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ImportRowId = table.Column<long>(type: "bigint", nullable: false),
                    Field = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CorrectedValue = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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

            migrationBuilder.CreateTable(
                name: "ImportRowIssues",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ImportRowId = table.Column<long>(type: "bigint", nullable: false),
                    IssueType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Severity = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Origin = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    FieldName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    SuggestedEntityId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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

            migrationBuilder.CreateTable(
                name: "ImportRowMaterializations",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ImportMaterializationId = table.Column<long>(type: "bigint", nullable: false),
                    ImportRowId = table.Column<long>(type: "bigint", nullable: false),
                    OrderRequestItemId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportRowMaterializations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportRowMaterializations_ImportMaterializations_ImportMate~",
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
                        name: "FK_ImportRowMaterializations_OrderRequestItems_OrderRequestIte~",
                        column: x => x.OrderRequestItemId,
                        principalTable: "OrderRequestItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Locations",
                columns: new[] { "Id", "Code", "CreatedAtUtc", "IsActive", "Name", "NormalizedName", "UpdatedAtUtc" },
                values: new object[,]
                {
                    { 1, "RAMANA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "Ramana", "ramana", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, "MASTAGA", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "Maştağa", "maştağa", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, "EMIRCAN", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "Əmircan", "əmircan", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 4, "HEM", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, "Heydər Əliyev Mərkəzi", "heydər əliyev mərkəzi", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
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
                    { 9, "L", true, "Litr", "lt", "Volume" },
                    { 10, "MM", true, "Millimetr", "mm", "Length" },
                    { 11, "BAG", true, "Kisə", "kisə", "Package" }
                });

            migrationBuilder.InsertData(
                table: "LocationAliases",
                columns: new[] { "Id", "Alias", "CreatedAtUtc", "LocationId", "NormalizedAlias" },
                values: new object[] { 1, "H.Ə.M", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 4, "h.ə.m" });

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
                    { 15, "lt", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "lt", 9 },
                    { 16, "əd", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "əd", 1 },
                    { 17, "əd.", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "əd.", 1 },
                    { 18, "paçqa", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "paçqa", 2 },
                    { 19, "cm", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "cm", 4 },
                    { 20, "mt", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "mt", 5 },
                    { 21, "mm", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "mm", 10 },
                    { 22, "gr", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "gr", 6 },
                    { 23, "kg", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "kg", 7 },
                    { 24, "l", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "l", 9 },
                    { 25, "kisə", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "kisə", 11 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_ParentId_NormalizedName",
                table: "Categories",
                columns: new[] { "ParentId", "NormalizedName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportBatches_FileHash",
                table: "ImportBatches",
                column: "FileHash",
                unique: true,
                filter: "\"FileHash\" IS NOT NULL AND \"Status\" <> 'Failed'");

            migrationBuilder.CreateIndex(
                name: "IX_ImportMaterializationGroups_ImportMaterializationId_Locatio~",
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

            migrationBuilder.CreateIndex(
                name: "IX_ImportRowCorrections_ImportRowId_Field",
                table: "ImportRowCorrections",
                columns: new[] { "ImportRowId", "Field" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportRowIssues_ImportRowId",
                table: "ImportRowIssues",
                column: "ImportRowId");

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

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_ImportBatchId_DuplicateFingerprint",
                table: "ImportRows",
                columns: new[] { "ImportBatchId", "DuplicateFingerprint" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_ImportBatchId_IsExcluded",
                table: "ImportRows",
                columns: new[] { "ImportBatchId", "IsExcluded" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_ImportBatchId_MatchedLocationId_ParsedRequestPer~",
                table: "ImportRows",
                columns: new[] { "ImportBatchId", "MatchedLocationId", "ParsedRequestPeriod" });

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
                name: "IX_ImportRows_ImportBatchId_VariantSourceKey",
                table: "ImportRows",
                columns: new[] { "ImportBatchId", "VariantSourceKey" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_MatchedCategoryId",
                table: "ImportRows",
                column: "MatchedCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_MatchedLocationId",
                table: "ImportRows",
                column: "MatchedLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_MatchedOrderUnitId",
                table: "ImportRows",
                column: "MatchedOrderUnitId");

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
                name: "IX_ImportRows_MatchedSpecificationUnitId",
                table: "ImportRows",
                column: "MatchedSpecificationUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportRows_MatchedSupplierId",
                table: "ImportRows",
                column: "MatchedSupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_LocationAliases_LocationId",
                table: "LocationAliases",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_LocationAliases_NormalizedAlias",
                table: "LocationAliases",
                column: "NormalizedAlias",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Locations_Code",
                table: "Locations",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Locations_NormalizedName",
                table: "Locations",
                column: "NormalizedName",
                unique: true);

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
                name: "IX_OrderRequestItems_OrderRequestId",
                table: "OrderRequestItems",
                column: "OrderRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestItems_ProductVariantId",
                table: "OrderRequestItems",
                column: "ProductVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestItems_SourceOrderRequestItemId",
                table: "OrderRequestItems",
                column: "SourceOrderRequestItemId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestItems_SupplierId",
                table: "OrderRequestItems",
                column: "SupplierId");

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

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequests_LocationId_RequestPeriod_Version",
                table: "OrderRequests",
                columns: new[] { "LocationId", "RequestPeriod", "Version" },
                unique: true);

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
                name: "IX_OrderRequests_SubmittedByUserId",
                table: "OrderRequests",
                column: "SubmittedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestWorkflowEvents_ActorUserId",
                table: "OrderRequestWorkflowEvents",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestWorkflowEvents_OrderRequestId_OccurredAtUtc",
                table: "OrderRequestWorkflowEvents",
                columns: new[] { "OrderRequestId", "OccurredAtUtc" });

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
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ResponsiblePersonAliases_NormalizedAlias",
                table: "ResponsiblePersonAliases",
                column: "NormalizedAlias",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ResponsiblePersonAliases_ResponsiblePersonId",
                table: "ResponsiblePersonAliases",
                column: "ResponsiblePersonId");

            migrationBuilder.CreateIndex(
                name: "IX_SupplierAliases_NormalizedAlias",
                table: "SupplierAliases",
                column: "NormalizedAlias",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupplierAliases_SupplierId",
                table: "SupplierAliases",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_Code",
                table: "Suppliers",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_NormalizedName",
                table: "Suppliers",
                column: "NormalizedName",
                unique: true);

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
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "ImportMaterializationGroups");

            migrationBuilder.DropTable(
                name: "ImportResolutions");

            migrationBuilder.DropTable(
                name: "ImportRowCorrections");

            migrationBuilder.DropTable(
                name: "ImportRowIssues");

            migrationBuilder.DropTable(
                name: "ImportRowMaterializations");

            migrationBuilder.DropTable(
                name: "LocationAliases");

            migrationBuilder.DropTable(
                name: "OrderRequestEditEvents");

            migrationBuilder.DropTable(
                name: "OrderRequestRevisions");

            migrationBuilder.DropTable(
                name: "OrderRequestWorkflowEvents");

            migrationBuilder.DropTable(
                name: "ProductAliases");

            migrationBuilder.DropTable(
                name: "ResponsiblePersonAliases");

            migrationBuilder.DropTable(
                name: "SupplierAliases");

            migrationBuilder.DropTable(
                name: "UnitOfMeasureAliases");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "ImportMaterializations");

            migrationBuilder.DropTable(
                name: "ImportRows");

            migrationBuilder.DropTable(
                name: "OrderRequestItems");

            migrationBuilder.DropTable(
                name: "OrderRequests");

            migrationBuilder.DropTable(
                name: "ProductVariants");

            migrationBuilder.DropTable(
                name: "Suppliers");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

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

            migrationBuilder.DropSequence(
                name: "LocationCodeNumbers");

            migrationBuilder.DropSequence(
                name: "ProductCodeNumbers");
        }
    }
}
