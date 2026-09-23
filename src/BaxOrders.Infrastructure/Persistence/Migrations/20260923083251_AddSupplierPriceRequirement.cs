using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierPriceRequirement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PriceRequirement",
                table: "Suppliers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Required");

            migrationBuilder.CreateTable(
                name: "SupplierPricingDecisions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SupplierId = table.Column<int>(type: "integer", nullable: false),
                    PreviousRequirement = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    NewRequirement = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupplierPricingDecisions", x => x.Id);
                    table.CheckConstraint("CK_SupplierPricingDecisions_RequirementChanged", "\"PreviousRequirement\" <> \"NewRequirement\"");
                    table.ForeignKey(
                        name: "FK_SupplierPricingDecisions_Suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "Suppliers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SupplierPricingDecisions_SupplierId_OccurredAtUtc",
                table: "SupplierPricingDecisions",
                columns: new[] { "SupplierId", "OccurredAtUtc" });

            // Every supplier is Required by the column default above. Exactly one is not: the company's own
            // store, which the business confirmed supplies material internally and therefore has no purchase
            // price to record.
            //
            // The business calls it "Qala anbar"; the catalogue record created from the workbooks is named
            // "Qala baza". That mapping was read off the data before this was written, not guessed.
            //
            // This matches one exact normalized name and nothing else. It is deliberately NOT a pattern: this
            // catalogue also contains a supplier called "Anbar", which is somebody the company buys from, and
            // any rule built on the words "anbar" or "baza" would have swept it up and quietly stopped asking
            // for its prices. A second internal supplier is a decision for a person to record, through the
            // supplier screen, which writes an audit row. It is not something a migration should infer.
            migrationBuilder.Sql(
                "UPDATE \"Suppliers\" SET \"PriceRequirement\" = 'NotRequired' WHERE \"NormalizedName\" = 'qala baza';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SupplierPricingDecisions");

            migrationBuilder.DropColumn(
                name: "PriceRequirement",
                table: "Suppliers");
        }
    }
}
