using MarketPro.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MarketPro.Application.Dashboard;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct);
}

public record DashboardSummaryDto(
    decimal TodaySales,
    int TodayInvoices,
    decimal AverageBasket,
    int LowStockCount,
    int ActiveProducts,
    List<DailySalesPointDto> Last7Days,
    List<TopProductDto> TopProducts,
    List<LowStockItemDto> LowStockItems
);

public record DailySalesPointDto(string Label, decimal Total);
public record TopProductDto(string Name, decimal Quantity, decimal Revenue);
public record LowStockItemDto(string Name, decimal StockQty, string Sku);

public class DashboardService : IDashboardService
{
    private readonly IAppDbContext _db;
    public DashboardService(IAppDbContext db) => _db = db;

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct)
    {
        var todayStart = DateTime.UtcNow.Date;
        var weekStart = todayStart.AddDays(-6);

        var todaySales = await _db.Sales
            .Where(s => s.SaleDate >= todayStart)
            .SumAsync(s => (decimal?)s.Total, ct) ?? 0m;

        var todayInvoices = await _db.Sales.CountAsync(s => s.SaleDate >= todayStart, ct);

        var avgBasket = todayInvoices == 0 ? 0m : Math.Round(todaySales / todayInvoices, 2);

        var lowStock = await _db.Products
            .Where(p => !p.IsDeleted && p.IsActive && p.TrackStock && p.StockQty <= p.MinStockQty)
            .OrderBy(p => p.StockQty)
            .Take(8)
            .Select(p => new LowStockItemDto(p.NameAr, p.StockQty, p.Sku))
            .ToListAsync(ct);

        var lowCount = await _db.Products.CountAsync(
            p => !p.IsDeleted && p.IsActive && p.TrackStock && p.StockQty <= p.MinStockQty, ct);

        var activeProducts = await _db.Products.CountAsync(p => !p.IsDeleted && p.IsActive, ct);

        // Fetch sales for the week and aggregate in memory
        var weekSalesList = await _db.Sales
            .Where(s => s.SaleDate >= weekStart)
            .Select(s => new { s.SaleDate, s.Total })
            .ToListAsync(ct);

        var weekSales = weekSalesList
            .GroupBy(s => s.SaleDate.Date)
            .Select(g => new { Date = g.Key, Total = g.Sum(x => x.Total) })
            .ToList();

        var dayMap = weekSales.ToDictionary(x => x.Date, x => x.Total);
        var last7 = Enumerable.Range(0, 7)
            .Select(i => weekStart.AddDays(i))
            .Select(d => new DailySalesPointDto(
                d.ToString("ddd"),
                dayMap.TryGetValue(d, out var v) ? v : 0m))
            .ToList();

        var monthStart = todayStart.AddDays(-30);
        
        // Fetch sale items and aggregate in memory to prevent translation issue
        var saleItemsList = await _db.SaleItems
            .Where(i => i.Sale!.SaleDate >= monthStart)
            .Select(i => new { i.ProductNameSnapshot, i.Quantity, i.LineTotal })
            .ToListAsync(ct);

        var top = saleItemsList
            .GroupBy(i => i.ProductNameSnapshot)
            .Select(g => new TopProductDto(
                g.Key ?? "Unknown",
                g.Sum(x => x.Quantity),
                g.Sum(x => x.LineTotal)))
            .OrderByDescending(x => x.Revenue)
            .Take(5)
            .ToList();

        return new DashboardSummaryDto(
            todaySales, todayInvoices, avgBasket,
            lowCount, activeProducts, last7, top, lowStock);
    }
}
