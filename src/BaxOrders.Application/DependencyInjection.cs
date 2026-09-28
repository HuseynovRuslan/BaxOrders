using BaxOrders.Application.Analytics;
using BaxOrders.Application.Analytics.Dashboard;
using BaxOrders.Application.Approvals;
using BaxOrders.Application.Catalog;
using BaxOrders.Application.Catalog.ProductMatches;
using BaxOrders.Application.Decisions;
using BaxOrders.Application.Imports;
using BaxOrders.Application.Imports.Confirmation;
using BaxOrders.Application.Imports.Matching;
using BaxOrders.Application.Imports.Pricing;
using BaxOrders.Application.Imports.Review;
using BaxOrders.Application.Locations;
using BaxOrders.Application.Orders;
using BaxOrders.Application.Orders.Pricing;
using BaxOrders.Application.Orders.Revisions;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Application.Reports;
using BaxOrders.Application.Suppliers;
using BaxOrders.Application.UnitsOfMeasure;
using Microsoft.Extensions.DependencyInjection;

namespace BaxOrders.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<LocationQueries>();
        services.AddScoped<UnitOfMeasureQueries>();
        services.AddScoped<OrderRequestVersions>();
        services.AddScoped<LocationOrderQueries>();
        services.AddScoped<OrderRequestQueries>();
        services.AddScoped<ProductHistoryQueries>();
        services.AddScoped<OrderWorkflowService>();
        services.AddScoped<OrderRevisionService>();
        services.AddScoped<OrderAnalyticsQueries>();
        services.AddScoped<ManagementDashboardQueries>();
        services.AddScoped<OutsideMonthlyQueries>();
        services.AddScoped<ApprovalInboxQueries>();
        services.AddScoped<OrderDecisionContextQueries>();
        services.AddScoped<MonthlyReportQueries>();
        services.AddScoped<ProductCategoryQueries>();
        services.AddScoped<ProductCategoryService>();
        services.AddScoped<ProductMatchQueries>();
        services.AddScoped<ProductMatchService>();
        services.AddScoped<SupplierPricingService>();
        services.AddScoped<PricingModeReviewService>();

        services.AddScoped<ImportCatalogLoader>();
        services.AddScoped<ImportPreviewQueries>();
        services.AddScoped<ExcelImportService>();

        services.AddScoped<ImportReviewQueries>();
        services.AddScoped<ReferenceSearchQueries>();
        services.AddScoped<ImportRevalidator>();
        services.AddScoped<ImportResolutionService>();
        services.AddScoped<BulkResolutionPlanner>();
        services.AddScoped<BulkResolutionService>();
        services.AddScoped<ImportRowDetailQueries>();
        services.AddScoped<ImportRowCorrectionService>();
        services.AddScoped<ImportReadinessQueries>();
        services.AddScoped<ImportConfirmationPlanner>();
        services.AddScoped<ImportConfirmationService>();
        services.AddScoped<ImportPricingService>();

        return services;
    }
}
