using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderItemPricingDecisions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OrderItemPricingDecisions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderRequestItemId = table.Column<long>(type: "bigint", nullable: false),
                    PreviousMode = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    NewMode = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    OccurredAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItemPricingDecisions", x => x.Id);
                    table.CheckConstraint("CK_OrderItemPricingDecisions_ModeChanged", "\"PreviousMode\" <> \"NewMode\"");
                    table.ForeignKey(
                        name: "FK_OrderItemPricingDecisions_OrderRequestItems_OrderRequestIte~",
                        column: x => x.OrderRequestItemId,
                        principalTable: "OrderRequestItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderItemPricingDecisions_OrderRequestItemId_OccurredAtUtc",
                table: "OrderItemPricingDecisions",
                columns: new[] { "OrderRequestItemId", "OccurredAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrderItemPricingDecisions");
        }
    }
}
