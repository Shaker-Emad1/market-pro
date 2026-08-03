using Microsoft.Extensions.DependencyInjection;
using MarketPro.Application.Dashboard;
using MarketPro.Application.Pos;
using MarketPro.Application.Products;
using MarketPro.Application.Inventory;
using MarketPro.Application.Customers;
using MarketPro.Application.Reports;

namespace MarketPro.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IPosService, PosService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IReportService, ReportService>();
        return services;
    }
}
