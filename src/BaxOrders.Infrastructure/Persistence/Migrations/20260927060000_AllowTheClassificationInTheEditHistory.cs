using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Lets the edit history record a change to a line's classification, which until now it could not.
    /// </summary>
    /// <remarks>
    /// The constraint on this table reads its list of actions both ways: an action in the list must name a
    /// field, and an action outside it must not. So an action that names a field but is missing from the list
    /// cannot be written at all — the insert is refused by the database.
    /// <para>
    /// <c>ItemOrderLineTypeChanged</c> was added to the domain without being added to that list, so changing a
    /// line's classification on a correction has been failing at save time ever since, with a constraint
    /// violation rather than anything a reader would understand. Nothing was lost — the write never happened —
    /// and there is no such entry anywhere to repair. This names it, and the configuration beside it now says
    /// why leaving an action out breaks it.
    /// </para>
    /// </remarks>
    public partial class AllowTheClassificationInTheEditHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderRequestEditEvents_FieldMatchesAction",
                table: "OrderRequestEditEvents");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderRequestEditEvents_FieldMatchesAction",
                table: "OrderRequestEditEvents",
                sql: "(\"Action\" IN ('ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged', 'ItemOrderLineTypeChanged') AND \"Field\" IS NOT NULL) OR (\"Action\" NOT IN ('ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged', 'ItemOrderLineTypeChanged') AND \"Field\" IS NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Back to the list as it was. A classification entry written meanwhile would then violate it, so the
            // rollback deletes nothing and leaves that for whoever is rolling back to see.
            migrationBuilder.DropCheckConstraint(
                name: "CK_OrderRequestEditEvents_FieldMatchesAction",
                table: "OrderRequestEditEvents");

            migrationBuilder.AddCheckConstraint(
                name: "CK_OrderRequestEditEvents_FieldMatchesAction",
                table: "OrderRequestEditEvents",
                sql: "(\"Action\" IN ('ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged') AND \"Field\" IS NOT NULL) OR (\"Action\" NOT IN ('ItemQuantityChanged', 'ItemPriceChanged', 'ItemSupplierChanged') AND \"Field\" IS NULL)");
        }
    }
}
