using MarketPro.Application.Common;
using MarketPro.Application.Common.Interfaces;
using MarketPro.Domain.Entities;
using MarketPro.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace MarketPro.Application.Products;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetProductsAsync(ProductQuery query, CancellationToken ct);
    Task<ProductDto?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Result<ProductDto>> CreateAsync(CreateProductDto dto, Guid userId, CancellationToken ct);
    Task<Result<ProductDto>> UpdateAsync(Guid id, UpdateProductDto dto, Guid userId, CancellationToken ct);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct);
    Task<List<CategoryDto>> GetCategoriesAsync(CancellationToken ct);
}

public record ProductQuery(
    string? Search,
    Guid? CategoryId,
    bool? LowStock,
    int Page = 1,
    int PageSize = 10
);

public record ProductDto(
    Guid Id,
    string Sku,
    string? Barcode,
    string NameAr,
    string? NameEn,
    string? Description,
    string? ImageUrl,
    decimal CostPrice,
    decimal SellPrice,
    decimal? DiscountPrice,
    decimal TaxRate,
    decimal StockQty,
    decimal MinStockQty,
    bool TrackStock,
    UnitType Unit,
    DateTime? ExpirationDate,
    bool IsActive,
    Guid CategoryId,
    string CategoryName
);

public record CreateProductDto(
    string Sku,
    string? Barcode,
    string NameAr,
    string? NameEn,
    string? Description,
    string? ImageUrl,
    decimal CostPrice,
    decimal SellPrice,
    decimal? DiscountPrice,
    decimal TaxRate,
    decimal StockQty,
    decimal MinStockQty,
    bool TrackStock,
    UnitType Unit,
    DateTime? ExpirationDate,
    bool IsActive,
    Guid CategoryId
);

public record UpdateProductDto(
    string Sku,
    string? Barcode,
    string NameAr,
    string? NameEn,
    string? Description,
    string? ImageUrl,
    decimal CostPrice,
    decimal SellPrice,
    decimal? DiscountPrice,
    decimal TaxRate,
    decimal MinStockQty,
    bool TrackStock,
    UnitType Unit,
    DateTime? ExpirationDate,
    bool IsActive,
    Guid CategoryId
);

public record CategoryDto(
    Guid Id,
    string NameAr,
    string? NameEn,
    string? IconName,
    string? ColorHex,
    int DisplayOrder
);

public class ProductService : IProductService
{
    private readonly IAppDbContext _db;
    public ProductService(IAppDbContext db) => _db = db;

    public async Task<PagedResult<ProductDto>> GetProductsAsync(ProductQuery query, CancellationToken ct)
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

        if (query.CategoryId.HasValue)
        {
            q = q.Where(p => p.CategoryId == query.CategoryId.Value);
        }

        if (query.LowStock == true)
        {
            q = q.Where(p => p.TrackStock && p.StockQty <= p.MinStockQty);
        }

        var total = await q.CountAsync(ct);
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Max(1, query.PageSize);

        var items = await q
            .OrderBy(p => p.NameAr)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProductDto(
                p.Id, p.Sku, p.Barcode, p.NameAr, p.NameEn, p.Description, p.ImageUrl,
                p.CostPrice, p.SellPrice, p.DiscountPrice, p.TaxRate, p.StockQty, p.MinStockQty,
                p.TrackStock, p.Unit, p.ExpirationDate, p.IsActive, p.CategoryId, p.Category!.NameAr
            ))
            .ToListAsync(ct);

        return new PagedResult<ProductDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ProductDto?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _db.Products
            .Include(p => p.Category)
            .Where(p => !p.IsDeleted && p.Id == id)
            .Select(p => new ProductDto(
                p.Id, p.Sku, p.Barcode, p.NameAr, p.NameEn, p.Description, p.ImageUrl,
                p.CostPrice, p.SellPrice, p.DiscountPrice, p.TaxRate, p.StockQty, p.MinStockQty,
                p.TrackStock, p.Unit, p.ExpirationDate, p.IsActive, p.CategoryId, p.Category!.NameAr
            ))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<Result<ProductDto>> CreateAsync(CreateProductDto dto, Guid userId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.NameAr))
            return Result<ProductDto>.Fail("الاسم العربي للمنتج مطلوب");

        if (string.IsNullOrWhiteSpace(dto.Sku))
            return Result<ProductDto>.Fail("رمز SKU مطلوب");

        var exists = await _db.Products.AnyAsync(p => !p.IsDeleted && p.Sku == dto.Sku, ct);
        if (exists)
            return Result<ProductDto>.Fail("رمز SKU مستخدم بالفعل لمنتج آخر");

        if (dto.SellPrice < dto.CostPrice)
            return Result<ProductDto>.Fail("سعر البيع لا يمكن أن يكون أقل من سعر الشراء");

        var categoryExists = await _db.Categories.AnyAsync(c => !c.IsDeleted && c.Id == dto.CategoryId, ct);
        if (!categoryExists)
            return Result<ProductDto>.Fail("القسم المحدد غير موجود");

        var product = new Product
        {
            Sku = dto.Sku,
            Barcode = dto.Barcode,
            NameAr = dto.NameAr,
            NameEn = dto.NameEn,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            CostPrice = dto.CostPrice,
            SellPrice = dto.SellPrice,
            DiscountPrice = dto.DiscountPrice,
            TaxRate = dto.TaxRate,
            StockQty = dto.StockQty,
            MinStockQty = dto.MinStockQty,
            TrackStock = dto.TrackStock,
            Unit = dto.Unit,
            ExpirationDate = dto.ExpirationDate,
            IsActive = dto.IsActive,
            CategoryId = dto.CategoryId
        };

        _db.Products.Add(product);

        // Add inventory movement for initial stock
        if (product.StockQty > 0)
        {
            _db.InventoryMovements.Add(new InventoryMovement
            {
                ProductId = product.Id,
                Type = MovementType.Adjustment,
                Quantity = product.StockQty,
                QuantityBefore = 0,
                QuantityAfter = product.StockQty,
                Reference = "Initial Stock",
                Reason = "رصيد افتتاحي عند إضافة المنتج",
                UserId = userId
            });
        }

        await _db.SaveChangesAsync(ct);

        var categoryName = await _db.Categories
            .Where(c => c.Id == dto.CategoryId)
            .Select(c => c.NameAr)
            .FirstAsync(ct);

        var resultDto = new ProductDto(
            product.Id, product.Sku, product.Barcode, product.NameAr, product.NameEn, product.Description, product.ImageUrl,
            product.CostPrice, product.SellPrice, product.DiscountPrice, product.TaxRate, product.StockQty, product.MinStockQty,
            product.TrackStock, product.Unit, product.ExpirationDate, product.IsActive, product.CategoryId, categoryName
        );

        return Result<ProductDto>.Ok(resultDto);
    }

    public async Task<Result<ProductDto>> UpdateAsync(Guid id, UpdateProductDto dto, Guid userId, CancellationToken ct)
    {
        var product = await _db.Products
            .Where(p => !p.IsDeleted && p.Id == id)
            .FirstOrDefaultAsync(ct);

        if (product == null)
            return Result<ProductDto>.Fail("المنتج غير موجود");

        if (string.IsNullOrWhiteSpace(dto.NameAr))
            return Result<ProductDto>.Fail("الاسم العربي للمنتج مطلوب");

        if (string.IsNullOrWhiteSpace(dto.Sku))
            return Result<ProductDto>.Fail("رمز SKU مطلوب");

        var exists = await _db.Products.AnyAsync(p => !p.IsDeleted && p.Id != id && p.Sku == dto.Sku, ct);
        if (exists)
            return Result<ProductDto>.Fail("رمز SKU مستخدم بالفعل لمنتج آخر");

        if (dto.SellPrice < dto.CostPrice)
            return Result<ProductDto>.Fail("سعر البيع لا يمكن أن يكون أقل من سعر الشراء");

        var categoryExists = await _db.Categories.AnyAsync(c => !c.IsDeleted && c.Id == dto.CategoryId, ct);
        if (!categoryExists)
            return Result<ProductDto>.Fail("القسم المحدد غير موجود");

        product.Sku = dto.Sku;
        product.Barcode = dto.Barcode;
        product.NameAr = dto.NameAr;
        product.NameEn = dto.NameEn;
        product.Description = dto.Description;
        product.ImageUrl = dto.ImageUrl;
        product.CostPrice = dto.CostPrice;
        product.SellPrice = dto.SellPrice;
        product.DiscountPrice = dto.DiscountPrice;
        product.TaxRate = dto.TaxRate;
        product.MinStockQty = dto.MinStockQty;
        product.TrackStock = dto.TrackStock;
        product.Unit = dto.Unit;
        product.ExpirationDate = dto.ExpirationDate;
        product.IsActive = dto.IsActive;
        product.CategoryId = dto.CategoryId;

        await _db.SaveChangesAsync(ct);

        var categoryName = await _db.Categories
            .Where(c => c.Id == dto.CategoryId)
            .Select(c => c.NameAr)
            .FirstAsync(ct);

        var resultDto = new ProductDto(
            product.Id, product.Sku, product.Barcode, product.NameAr, product.NameEn, product.Description, product.ImageUrl,
            product.CostPrice, product.SellPrice, product.DiscountPrice, product.TaxRate, product.StockQty, product.MinStockQty,
            product.TrackStock, product.Unit, product.ExpirationDate, product.IsActive, product.CategoryId, categoryName
        );

        return Result<ProductDto>.Ok(resultDto);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct)
    {
        var product = await _db.Products
            .Where(p => !p.IsDeleted && p.Id == id)
            .FirstOrDefaultAsync(ct);

        if (product == null) return false;

        product.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<CategoryDto>> GetCategoriesAsync(CancellationToken ct)
    {
        return await _db.Categories
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.DisplayOrder)
            .Select(c => new CategoryDto(
                c.Id, c.NameAr, c.NameEn, c.IconName, c.ColorHex, c.DisplayOrder
            ))
            .ToListAsync(ct);
    }
}
