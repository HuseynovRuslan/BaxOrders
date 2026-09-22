using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SupportUnitlessVariantsAndSpecificationDescriptors : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_ImportResolutions_SingleTarget",
                table: "ImportResolutions");

            migrationBuilder.AlterColumn<int>(
                name: "OrderUnitId",
                table: "ProductVariants",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "SpecificationDescriptor",
                table: "ProductVariants",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SpecificationDescriptor",
                table: "ImportRows",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "CorrectedValue",
                table: "ImportRowCorrections",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductVariants_SpecificationDescriptorRequiresValue",
                table: "ProductVariants",
                sql: "[SpecificationDescriptor] IS NULL OR [SpecificationValue] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProductVariants_SpecificationUnitOrDescriptor",
                table: "ProductVariants",
                sql: "[SpecificationUnitId] IS NULL OR [SpecificationDescriptor] IS NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ImportResolutions_SingleTarget",
                table: "ImportResolutions",
                sql: "(CASE WHEN [LocationId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [SupplierId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ResponsiblePersonId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [UnitOfMeasureId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [CategoryId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ProductId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ProductVariantId] IS NULL THEN 0 ELSE 1 END) = CASE WHEN [Action] = 'MarkNotAUnit' THEN 0 ELSE 1 END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductVariants_SpecificationDescriptorRequiresValue",
                table: "ProductVariants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProductVariants_SpecificationUnitOrDescriptor",
                table: "ProductVariants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ImportResolutions_SingleTarget",
                table: "ImportResolutions");

            migrationBuilder.DropColumn(
                name: "SpecificationDescriptor",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "SpecificationDescriptor",
                table: "ImportRows");

            migrationBuilder.AlterColumn<int>(
                name: "OrderUnitId",
                table: "ProductVariants",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "CorrectedValue",
                table: "ImportRowCorrections",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000,
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_ImportResolutions_SingleTarget",
                table: "ImportResolutions",
                sql: "(CASE WHEN [LocationId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [SupplierId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ResponsiblePersonId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [UnitOfMeasureId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [CategoryId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ProductId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ProductVariantId] IS NULL THEN 0 ELSE 1 END) = 1");
        }
    }
}
