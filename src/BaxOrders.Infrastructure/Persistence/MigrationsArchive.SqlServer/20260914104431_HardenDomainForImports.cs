using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class HardenDomainForImports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Suppliers_NormalizedName",
                table: "Suppliers");

            migrationBuilder.DropIndex(
                name: "IX_ResponsiblePeople_NormalizedName",
                table: "ResponsiblePeople");

            migrationBuilder.DropIndex(
                name: "IX_OrderRequests_LocationId_RequestPeriod",
                table: "OrderRequests");

            migrationBuilder.DropIndex(
                name: "IX_Locations_NormalizedName",
                table: "Locations");

            migrationBuilder.CreateSequence(
                name: "ProductCodeNumbers");

            migrationBuilder.CreateTable(
                name: "LocationAliases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    Alias = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NormalizedAlias = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                name: "ResponsiblePersonAliases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ResponsiblePersonId = table.Column<int>(type: "int", nullable: false),
                    Alias = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    NormalizedAlias = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponsiblePersonAliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResponsiblePersonAliases_ResponsiblePeople_ResponsiblePersonId",
                        column: x => x.ResponsiblePersonId,
                        principalTable: "ResponsiblePeople",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SupplierAliases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SupplierId = table.Column<int>(type: "int", nullable: false),
                    Alias = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    NormalizedAlias = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
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

            migrationBuilder.InsertData(
                table: "UnitOfMeasureAliases",
                columns: new[] { "Id", "Alias", "CreatedAtUtc", "NormalizedAlias", "UnitOfMeasureId" },
                values: new object[,]
                {
                    { 16, "əd", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "əd", 1 },
                    { 17, "əd.", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "əd.", 1 },
                    { 18, "paçqa", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "paçqa", 2 },
                    { 19, "cm", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "cm", 4 },
                    { 20, "mt", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "mt", 5 },
                    { 22, "gr", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "gr", 6 },
                    { 23, "kg", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "kg", 7 },
                    { 24, "l", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "l", 9 }
                });

            migrationBuilder.InsertData(
                table: "UnitsOfMeasure",
                columns: new[] { "Id", "Code", "IsActive", "Name", "Symbol", "UnitType" },
                values: new object[,]
                {
                    { 10, "MM", true, "Millimetr", "mm", "Length" },
                    { 11, "BAG", true, "Kisə", "kisə", "Package" }
                });

            migrationBuilder.InsertData(
                table: "UnitOfMeasureAliases",
                columns: new[] { "Id", "Alias", "CreatedAtUtc", "NormalizedAlias", "UnitOfMeasureId" },
                values: new object[,]
                {
                    { 21, "mm", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "mm", 10 },
                    { 25, "kisə", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "kisə", 11 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_NormalizedName",
                table: "Suppliers",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ResponsiblePeople_NormalizedName",
                table: "ResponsiblePeople",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequests_LocationId_RequestPeriod_Version",
                table: "OrderRequests",
                columns: new[] { "LocationId", "RequestPeriod", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Locations_NormalizedName",
                table: "Locations",
                column: "NormalizedName",
                unique: true);

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LocationAliases");

            migrationBuilder.DropTable(
                name: "ResponsiblePersonAliases");

            migrationBuilder.DropTable(
                name: "SupplierAliases");

            migrationBuilder.DropIndex(
                name: "IX_Suppliers_NormalizedName",
                table: "Suppliers");

            migrationBuilder.DropIndex(
                name: "IX_ResponsiblePeople_NormalizedName",
                table: "ResponsiblePeople");

            migrationBuilder.DropIndex(
                name: "IX_OrderRequests_LocationId_RequestPeriod_Version",
                table: "OrderRequests");

            migrationBuilder.DropIndex(
                name: "IX_Locations_NormalizedName",
                table: "Locations");

            migrationBuilder.DeleteData(
                table: "UnitOfMeasureAliases",
                keyColumn: "Id",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "UnitOfMeasureAliases",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "UnitOfMeasureAliases",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "UnitOfMeasureAliases",
                keyColumn: "Id",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "UnitOfMeasureAliases",
                keyColumn: "Id",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "UnitOfMeasureAliases",
                keyColumn: "Id",
                keyValue: 21);

            migrationBuilder.DeleteData(
                table: "UnitOfMeasureAliases",
                keyColumn: "Id",
                keyValue: 22);

            migrationBuilder.DeleteData(
                table: "UnitOfMeasureAliases",
                keyColumn: "Id",
                keyValue: 23);

            migrationBuilder.DeleteData(
                table: "UnitOfMeasureAliases",
                keyColumn: "Id",
                keyValue: 24);

            migrationBuilder.DeleteData(
                table: "UnitOfMeasureAliases",
                keyColumn: "Id",
                keyValue: 25);

            migrationBuilder.DeleteData(
                table: "UnitsOfMeasure",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "UnitsOfMeasure",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DropSequence(
                name: "ProductCodeNumbers");

            migrationBuilder.CreateIndex(
                name: "IX_Suppliers_NormalizedName",
                table: "Suppliers",
                column: "NormalizedName");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsiblePeople_NormalizedName",
                table: "ResponsiblePeople",
                column: "NormalizedName");

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequests_LocationId_RequestPeriod",
                table: "OrderRequests",
                columns: new[] { "LocationId", "RequestPeriod" });

            migrationBuilder.CreateIndex(
                name: "IX_Locations_NormalizedName",
                table: "Locations",
                column: "NormalizedName");
        }
    }
}
