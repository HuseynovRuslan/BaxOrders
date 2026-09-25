using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddImportRowPricingClassification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PricingClassification",
                table: "ImportRows",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PricingClassifiedAtUtc",
                table: "ImportRows",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PricingClassifiedByDisplayName",
                table: "ImportRows",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PricingClassifiedByUserId",
                table: "ImportRows",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_ImportRows_PricingClassification",
                table: "ImportRows",
                sql: "\"PricingClassification\" IS NULL OR \"PricingClassification\" IN ('PriceRequired', 'InternalFreeSupply')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ImportRows_PricingClassificationActor",
                table: "ImportRows",
                sql: "(\"PricingClassification\" IS NULL AND \"PricingClassifiedByUserId\" IS NULL AND \"PricingClassifiedByDisplayName\" IS NULL AND \"PricingClassifiedAtUtc\" IS NULL) OR (\"PricingClassification\" IS NOT NULL AND \"PricingClassifiedByUserId\" IS NOT NULL AND \"PricingClassifiedByDisplayName\" IS NOT NULL AND \"PricingClassifiedAtUtc\" IS NOT NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_ImportRows_PricingClassification",
                table: "ImportRows");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ImportRows_PricingClassificationActor",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "PricingClassification",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "PricingClassifiedAtUtc",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "PricingClassifiedByDisplayName",
                table: "ImportRows");

            migrationBuilder.DropColumn(
                name: "PricingClassifiedByUserId",
                table: "ImportRows");
        }
    }
}
