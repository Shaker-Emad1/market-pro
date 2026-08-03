using MarketPro.Application.Common;
using MarketPro.Application.Common.Interfaces;
using MarketPro.Domain.Entities;
using MarketPro.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace MarketPro.Application.Inventory;

public interface IInventoryService
{
    Task<InventoryAnalyticsDto> GetAnalyticsAsync(CancellationToken ct);
    Task<PagedResult<InventoryItemDto>> GetStockOverviewAsync(InventoryOverviewQuery query, CancellationToken ct);
    Task<PagedResult<MovementDto>> GetMovementsAsync(MovementQuery query, CancellationToken ct);
    Task<Result<bool>> RestockAsync(RestockRequest req, Guid userId, CancellationToken ct);
    Task<Result<bool>> AdjustStockAsync(StockAdjustmentRequest req, Guid userId, CancellationToken ct);
}

public record InventoryAnalyticsDto(
    int TotalProducts,
    decimal TotalStockQty,
    decimal TotalStockValue,
    int LowStockCount,
    int ExpiringCount
);

public record InventoryOverviewQuery(
    string? Search,
    bool? LowStock,
    bool? ExpiringSoon,
    int Page = 1,
    int PageSize = 10
);

public record InventoryItemDto(
    Guid ProductId,
    string Sku,
    string? Barcode,
    string NameAr,
    string CategoryName,
    decimal StockQty,
    decimal MinStockQty,
    decimal CostPrice,
    decimal SellPrice,
    UnitType Unit,
    DateTime? ExpirationDate,
    bool TrackStock
);

public record MovementQuery(
    string? Search,
    MovementType? Type,
    Guid? ProductId,
    int Page = 1,
    int PageSize = 10
);

public record MovementDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string Sku,
    MovementType Type,
    decimal Quantity,
    decimal QuantityBefore,
    decimal QuantityAfter,
    decimal UnitCost,
    string? Reference,
    string? Reason,
    DateTime CreatedAt,
    string? UserFullName
);

public record RestockRequest(
    Guid ProductId,
    decimal Quantity,
    decimal UnitCost,
    string? Reference,
    string? Notes
);

public record StockAdjustmentRequest(
    Guid ProductId,
    decimal NewQuantity,
    MovementType Type,
    string? Reason,
    string? Reference
);

public class InventoryService : IInventoryService
{
    private readonly IAppDbContext _db;
    public InventoryService(IAppDbContext db) => _db = db;

    public async Task<InventoryAnalyticsDto> GetAnalyticsAsync(CancellationToken ct)
    {
        var activeProds = await _db.Products
            .Where(p => !p.IsDeleted && p.IsActive)
            .ToListAsync(ct);

        var totalProducts = activeProds.Count;
        var totalStockQty = activeProds.Where(p => p.TrackStock).Sum(p => p.StockQty);
        var totalStockValue = activeProds.Where(p => p.TrackStock).Sum(p => p.StockQty * p.CostPrice);

        var lowStockCount = activeProds.Count(p => p.TrackStock && p.StockQty <= p.MinStockQty);

        var targetExp = DateTime.UtcNow.AddDays(30);
        var expiringCount = activeProds.Count(p => p.ExpirationDate.HasValue && p.ExpirationDate.Value <= targetExp);

        return new InventoryAnalyticsDto(
            totalProducts,
            totalStockQty,
            totalStockValue,
            lowStockCount,
            expiringCount
        );
    }

    public async Task<PagedResult<InventoryItemDto>> GetStockOverviewAsync(InventoryOverviewQuery query, CancellationToken ct)
    {
        var q = _db.Products
            .Include(p => p.Category)
            .Where(p => !p.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(p => p.NameAr.Contains(s) || 
                           (p.NameEn != null && p.NameEn.Contains(s)) || 
                           p.Sku.Contains(s) || 
                           (p.Barcode != null && p.Barcode.Contains(s)));
        }

        if (query.LowStock == true)
        {
            q = q.Where(p => p.TrackStock && p.StockQty <= p.MinStockQty);
        }

        if (query.ExpiringSoon == true)
        {
            var limit = DateTime.UtcNow.AddDays(30);
            q = q.Where(p => p.ExpirationDate != null && p.ExpirationDate <= limit);
        }

        var total = await q.CountAsync(ct);
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Max(1, query.PageSize);

        var items = await q
            .OrderBy(p => p.StockQty)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new InventoryItemDto(
                p.Id, p.Sku, p.Barcode, p.NameAr, p.Category!.NameAr,
                p.StockQty, p.MinStockQty, p.CostPrice, p.SellPrice,
                p.Unit, p.ExpirationDate, p.TrackStock
            ))
            .ToListAsync(ct);

        return new PagedResult<InventoryItemDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<PagedResult<MovementDto>> GetMovementsAsync(MovementQuery query, CancellationToken ct)
    {
        var q = _db.InventoryMovements
            .Include(m => m.Product)
            .Where(m => !m.IsDeleted);

        if (query.ProductId.HasValue)
        {
            q = q.Where(m => m.ProductId == query.ProductId.Value);
        }

        if (query.Type.HasValue)
        {
            q = q.Where(m => m.Type == query.Type.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(m => m.Product!.NameAr.Contains(s) || 
                           m.Product!.Sku.Contains(s) || 
                           (m.Reference != null && m.Reference.Contains(s)) ||
                           (m.Reason != null && m.Reason.Contains(s)));
        }

        var total = await q.CountAsync(ct);
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Max(1, query.PageSize);

        var movements = await q
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        // Fetch User FullNames in memory to avoid complex join if user table references are soft
        var userIds = movements.Where(m => m.UserId.HasValue).Select(m => m.UserId!.Value).Distinct().ToList();
        var userMap = await _db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        var items = movements.Select(m => new MovementDto(
            m.Id,
            m.ProductId,
            m.Product?.NameAr ?? "منتج محذوف",
            m.Product?.Sku ?? "—",
            m.Type,
            m.Quantity,
            m.QuantityBefore,
            m.QuantityAfter,
            m.UnitCost,
            m.Reference,
            m.Reason,
            m.CreatedAt,
            m.UserId.HasValue && userMap.TryGetValue(m.UserId.Value, out var name) ? name : "النظام"
        )).ToList();

        return new PagedResult<MovementDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<Result<bool>> RestockAsync(RestockRequest req, Guid userId, CancellationToken ct)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == req.ProductId && !p.IsDeleted, ct);
        if (product == null) return Result<bool>.Fail("المنتج غير موجود");

        if (req.Quantity <= 0) return Result<bool>.Fail("الكمية يجب أن تكون أكبر من الصفر");

        var before = product.StockQty;
        product.StockQty += req.Quantity;
        if (req.UnitCost > 0)
        {
            product.CostPrice = req.UnitCost; // Update unit cost with latest purchase cost
        }

        _db.InventoryMovements.Add(new InventoryMovement
        {
            ProductId = product.Id,
            Type = MovementType.Purchase,
            Quantity = req.Quantity,
            QuantityBefore = before,
            QuantityAfter = product.StockQty,
            UnitCost = req.UnitCost,
            Reference = req.Reference ?? "توريد مخزني",
            Reason = req.Notes ?? "شراء وتوريد بضاعة",
            UserId = userId
        });

        await _db.SaveChangesAsync(ct);
        return Result<bool>.Ok(true);
    }

    public async Task<Result<bool>> AdjustStockAsync(StockAdjustmentRequest req, Guid userId, CancellationToken ct)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == req.ProductId && !p.IsDeleted, ct);
        if (product == null) return Result<bool>.Fail("المنتج غير موجود");

        if (req.NewQuantity < 0) return Result<bool>.Fail("الكمية الجديدة لا يمكن أن تكون سالبة");

        var before = product.StockQty;
        var diff = req.NewQuantity - before;

        if (diff == 0) return Result<bool>.Ok(true); // No change

        product.StockQty = req.NewQuantity;

        _db.InventoryMovements.Add(new InventoryMovement
        {
            ProductId = product.Id,
            Type = req.Type,
            Quantity = diff,
            QuantityBefore = before,
            QuantityAfter = product.StockQty,
            UnitCost = product.CostPrice,
            Reference = req.Reference ?? "تسوية مخزنية",
            Reason = req.Reason ?? "تعديل يدوي للرصيد",
            UserId = userId
        });

        await _db.SaveChangesAsync(ct);
        return Result<bool>.Ok(true);
    }
}
