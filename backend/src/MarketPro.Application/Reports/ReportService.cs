using MarketPro.Application.Common.Interfaces;
using MarketPro.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace MarketPro.Application.Reports;

public interface IReportService
{
    Task<SalesReportDto> GetSalesReportAsync(DateTime from, DateTime to, CancellationToken ct);
    Task<List<ProductSalesReportDto>> GetProductSalesReportAsync(DateTime from, DateTime to, CancellationToken ct);
    Task<List<CustomerDebtReportDto>> GetCustomerDebtReportAsync(CancellationToken ct);
    Task<InventoryStatusReportDto> GetInventoryStatusReportAsync(CancellationToken ct);
}

public record SalesReportDto(
    decimal TotalSales,
    int TotalInvoices,
    decimal TotalDiscount,
    decimal TotalTax,
    decimal NetRevenue,
    decimal AverageBasket,
    List<PaymentMethodBreakdownDto> PaymentMethods,
    List<DailyReportPointDto> DailySales
);

public record PaymentMethodBreakdownDto(PaymentMethod Method, int Count, decimal Total);
public record DailyReportPointDto(DateTime Date, int Count, decimal Total);

public record ProductSalesReportDto(
    string Sku,
    string ProductName,
    string CategoryName,
    decimal QuantitySold,
    decimal Revenue,
    decimal Cost,
    decimal Profit
);

public record CustomerDebtReportDto(
    Guid CustomerId,
    string FullName,
    string? Phone,
    decimal CreditBalance,
    decimal TotalPurchased
);

public record InventoryStatusReportDto(
    int TotalItems,
    decimal TotalQuantity,
    decimal TotalCostValue,
    decimal TotalRetailValue,
    decimal ProjectedProfit,
    List<LowStockItemReportDto> LowStockItems
);

public record LowStockItemReportDto(
    string Sku,
    string NameAr,
    decimal StockQty,
    decimal MinStockQty,
    string CategoryName
);

public class ReportService : IReportService
{
    private readonly IAppDbContext _db;
    public ReportService(IAppDbContext db) => _db = db;

    public async Task<SalesReportDto> GetSalesReportAsync(DateTime from, DateTime to, CancellationToken ct)
    {
        // Fetch raw sales within range
        var salesList = await _db.Sales
            .Where(s => !s.IsDeleted && s.SaleDate >= from && s.SaleDate <= to)
            .ToListAsync(ct);

        var totalSales = salesList.Sum(s => s.Total);
        var totalInvoices = salesList.Count;
        var totalDiscount = salesList.Sum(s => s.DiscountAmount);
        var totalTax = salesList.Sum(s => s.TaxAmount);
        var netRevenue = totalSales - totalTax;
        var avgBasket = totalInvoices == 0 ? 0m : Math.Round(totalSales / totalInvoices, 2);

        var paymentMethods = salesList
            .GroupBy(s => s.PaymentMethod)
            .Select(g => new PaymentMethodBreakdownDto(g.Key, g.Count(), g.Sum(x => x.Total)))
            .ToList();

        var dailySales = salesList
            .GroupBy(s => s.SaleDate.Date)
            .Select(g => new DailyReportPointDto(g.Key, g.Count(), g.Sum(x => x.Total)))
            .OrderBy(d => d.Date)
            .ToList();

        return new SalesReportDto(
            totalSales, totalInvoices, totalDiscount, totalTax,
            netRevenue, avgBasket, paymentMethods, dailySales
        );
    }

    public async Task<List<ProductSalesReportDto>> GetProductSalesReportAsync(DateTime from, DateTime to, CancellationToken ct)
    {
        // Load items with details in memory to prevent complex translations
        var items = await _db.SaleItems
            .Include(i => i.Product)
            .ThenInclude(p => p!.Category)
            .Where(i => !i.IsDeleted && i.Sale!.SaleDate >= from && i.Sale!.SaleDate <= to)
            .Select(i => new
            {
                Sku = i.Product != null ? i.Product.Sku : "—",
                ProductName = i.ProductNameSnapshot,
                CategoryName = (i.Product != null && i.Product.Category != null) ? i.Product.Category.NameAr : "عام",
                i.Quantity,
                i.LineTotal,
                Cost = i.Product != null ? i.Product.CostPrice : 0m
            })
            .ToListAsync(ct);

        return items
            .GroupBy(i => new { i.Sku, i.ProductName, i.CategoryName })
            .Select(g =>
            {
                var qty = g.Sum(x => x.Quantity);
                var rev = g.Sum(x => x.LineTotal);
                var totalCost = g.Sum(x => x.Cost * x.Quantity);
                return new ProductSalesReportDto(
                    g.Key.Sku,
                    g.Key.ProductName,
                    g.Key.CategoryName,
                    qty,
                    rev,
                    totalCost,
                    rev - totalCost
                );
            })
            .OrderByDescending(x => x.Revenue)
            .ToList();
    }

    public async Task<List<CustomerDebtReportDto>> GetCustomerDebtReportAsync(CancellationToken ct)
    {
        return await _db.Customers
            .Include(c => c.Sales)
            .Where(c => !c.IsDeleted && c.CreditBalance > 0)
            .OrderByDescending(c => c.CreditBalance)
            .Select(c => new CustomerDebtReportDto(
                c.Id,
                c.FullName,
                c.Phone,
                c.CreditBalance,
                c.Sales.Where(s => !s.IsDeleted).Sum(s => s.Total)
            ))
            .ToListAsync(ct);
    }

    public async Task<InventoryStatusReportDto> GetInventoryStatusReportAsync(CancellationToken ct)
    {
        var products = await _db.Products
            .Include(p => p.Category)
            .Where(p => !p.IsDeleted && p.IsActive && p.TrackStock)
            .ToListAsync(ct);

        var totalItems = products.Count;
        var totalQty = products.Sum(p => p.StockQty);
        var totalCost = products.Sum(p => p.StockQty * p.CostPrice);
        var totalRetail = products.Sum(p => p.StockQty * p.SellPrice);
        var projectedProfit = totalRetail - totalCost;

        var lowStock = products
            .Where(p => p.StockQty <= p.MinStockQty)
            .OrderBy(p => p.StockQty)
            .Select(p => new LowStockItemReportDto(
                p.Sku,
                p.NameAr,
                p.StockQty,
                p.MinStockQty,
                p.Category?.NameAr ?? "عام"
            ))
            .ToList();

        return new InventoryStatusReportDto(
            totalItems, totalQty, totalCost, totalRetail, projectedProfit, lowStock
        );
    }
}
