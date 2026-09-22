using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderApprovalWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "RejectedAtUtc",
                table: "OrderRequests",
                newName: "ReturnedAtUtc");

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "OrderRequests",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.CreateTable(
                name: "OrderRequestWorkflowEvents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderRequestId = table.Column<long>(type: "bigint", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    FromStatus = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ToStatus = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ActorDisplayName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    MissingPriceItemCount = table.Column<int>(type: "int", nullable: false),
                    MissingPricesAcknowledged = table.Column<bool>(type: "bit", nullable: false),
                    OccurredAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderRequestWorkflowEvents", x => x.Id);
                    table.CheckConstraint("CK_OrderRequestWorkflowEvents_StatusChanged", "[FromStatus] <> [ToStatus]");
                    table.ForeignKey(
                        name: "FK_OrderRequestWorkflowEvents_OrderRequests_OrderRequestId",
                        column: x => x.OrderRequestId,
                        principalTable: "OrderRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderRequestWorkflowEvents_OrderRequestId_OccurredAtUtc",
                table: "OrderRequestWorkflowEvents",
                columns: new[] { "OrderRequestId", "OccurredAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrderRequestWorkflowEvents");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "OrderRequests");

            migrationBuilder.RenameColumn(
                name: "ReturnedAtUtc",
                table: "OrderRequests",
                newName: "RejectedAtUtc");
        }
    }
}
