using MarketPro.Application.Common;
using MarketPro.Application.Common.Interfaces;
using MarketPro.Application.Common.Settings;
using MarketPro.Application.Pos.Dtos;
using MarketPro.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MarketPro.Application.Pos;

public interface IPosService
{
    Task<List<PosCategoryDto>> GetCategoriesAsync(CancellationToken ct);
    Task<List<PosProductDto>> SearchProductsAsync(string? query, Guid? categoryId, CancellationToken ct);
    Task<PosProductDto?> GetByBarcodeAsync(string barcode, CancellationToken ct);
    Task<Result<SaleSummaryDto>> CreateSaleAsync(CreateSaleRequest req, Guid cashierId, CancellationToken ct);
}

public class PosService : IPosService
{
    private readonly IAppDbContext _db;
    private readonly StoreSettings _store;
    public PosService(IAppDbContext db, IOptions<StoreSettings> store)
    {
        _db = db;
        _store = store.Value;
    }

    public async Task<List<PosCategoryDto>> GetCategoriesAsync(CancellationToken ct)
    {
        return await _db.Categories
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.DisplayOrder).ThenBy(c => c.NameAr)
            .Select(c => new PosCategoryDto(
                c.Id, c.NameAr, c.IconName, c.ColorHex,
                c.Products.Count(p => !p.IsDeleted && p.IsActive)))
            .ToListAsync(ct);
    }

    public async Task<List<PosProductDto>> SearchProductsAsync(string? query, Guid? categoryId, CancellationToken ct)
    {
        var q = _db.Products
            .Where(p => !p.IsDeleted && p.IsActive);

        if (categoryId.HasValue)
            q = q.Where(p => p.CategoryId == categoryId.Value);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var s = query.Trim();
            q = q.Where(p =>
                p.NameAr.Contains(s) ||
                (p.NameEn != null && p.NameEn.Contains(s)) ||
                p.Sku.Contains(s) ||
                (p.Barcode != null && p.Barcode.Contains(s)));
        }

        return await q
            .OrderBy(p => p.NameAr)
            .Take(60)
            .Select(p => new PosProductDto(
                p.Id, p.Sku, p.Barcode, p.NameAr, p.NameEn,
                p.SellPrice, p.DiscountPrice, p.TaxRate, p.StockQty, p.Unit,
                p.ImageUrl, p.CategoryId, p.Category!.NameAr))
            .ToListAsync(ct);
    }

    public async Task<PosProductDto?> GetByBarcodeAsync(string barcode, CancellationToken ct)
    {
        return await _db.Products
            .Where(p => !p.IsDeleted && p.IsActive && p.Barcode == barcode)
            .Select(p => new PosProductDto(
                p.Id, p.Sku, p.Barcode, p.NameAr, p.NameEn,
                p.SellPrice, p.DiscountPrice, p.TaxRate, p.StockQty, p.Unit,
                p.ImageUrl, p.CategoryId, p.Category!.NameAr))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<Result<SaleSummaryDto>> CreateSaleAsync(CreateSaleRequest req, Guid cashierId, CancellationToken ct)
    {
        if (req.Items == null || req.Items.Count == 0)
            return Result<SaleSummaryDto>.Fail("الفاتورة فارغة");

        var productIds = req.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _db.Products
            .Where(p => productIds.Contains(p.Id) && !p.IsDeleted)
            .ToDictionaryAsync(p => p.Id, ct);

        if (products.Count != productIds.Count)
            return Result<SaleSummaryDto>.Fail("بعض المنتجات غير موجودة");

        var sale = new Sale
        {
            InvoiceNumber = await GenerateInvoiceNumberAsync(ct),
            SaleDate = DateTime.UtcNow,
            CustomerId = req.CustomerId,
            CashierId = cashierId,
            PaymentMethod = req.PaymentMethod,
            Notes = req.Notes,
            DiscountAmount = req.DiscountAmount,
            PaidAmount = req.PaidAmount
        };

        decimal subTotal = 0m;
        decimal taxTotal = 0m;

        foreach (var item in req.Items)
        {
            var p = products[item.ProductId];
            if (p.TrackStock && p.StockQty < item.Quantity)
                return Result<SaleSummaryDto>.Fail($"رصيد غير كاف للمنتج: {p.NameAr}");

            var unitPrice = item.OverrideUnitPrice ?? (p.DiscountPrice ?? p.SellPrice);
            var lineGross = unitPrice * item.Quantity - item.LineDiscount;
            var lineTax = lineGross * (p.TaxRate / 100m);
            var lineTotal = lineGross + lineTax;

            sale.Items.Add(new SaleItem
            {
                ProductId = p.Id,
                ProductNameSnapshot = p.NameAr,
                Quantity = item.Quantity,
                UnitPrice = unitPrice,
                DiscountAmount = item.LineDiscount,
                TaxRate = p.TaxRate,
                LineTotal = lineTotal
            });

            subTotal += lineGross;
            taxTotal += lineTax;

            if (p.TrackStock)
            {
                var before = p.StockQty;
                p.StockQty -= item.Quantity;
                _db.InventoryMovements.Add(new InventoryMovement
                {
                    ProductId = p.Id,
                    Type = MovementType.Sale,
                    Quantity = -item.Quantity,
                    QuantityBefore = before,
                    QuantityAfter = p.StockQty,
                    Reference = sale.InvoiceNumber,
                    UserId = cashierId
                });
            }
        }

        sale.SubTotal = subTotal;
        sale.TaxAmount = taxTotal;
        sale.Total = subTotal + taxTotal - req.DiscountAmount;
        sale.ChangeAmount = Math.Max(0, req.PaidAmount - sale.Total);

        _db.Sales.Add(sale);
        await _db.SaveChangesAsync(ct);

        var cashier = await _db.Users.Where(u => u.Id == cashierId).Select(u => u.FullName).FirstOrDefaultAsync(ct) ?? "—";
        var customerName = req.CustomerId.HasValue
            ? await _db.Customers.Where(c => c.Id == req.CustomerId).Select(c => c.FullName).FirstOrDefaultAsync(ct)
            : null;

        var summary = new SaleSummaryDto(
            sale.Id, sale.InvoiceNumber, sale.SaleDate,
            sale.SubTotal, sale.DiscountAmount, sale.TaxAmount, sale.Total,
            sale.PaidAmount, sale.ChangeAmount, sale.PaymentMethod,
            cashier, customerName,
            sale.Items.Select(i => new SaleLineDto(
                i.ProductNameSnapshot, i.Quantity, i.UnitPrice,
                i.DiscountAmount, i.TaxRate, i.LineTotal,
                products[i.ProductId].Unit)).ToList(),
            ZatcaQrBuilder.Build(_store, sale.SaleDate, sale.Total, sale.TaxAmount),
            new StoreInfoDto(
                _store.NameAr, _store.NameEn, _store.AddressAr,
                _store.Phone, _store.TaxNumber, _store.Currency,
                _store.LogoUrl, _store.FooterAr, _store.FooterEn,
                _store.ReceiptWidthMm)
        );

        return Result<SaleSummaryDto>.Ok(summary);
    }

    private async Task<string> GenerateInvoiceNumberAsync(CancellationToken ct)
    {
        var today = DateTime.UtcNow;
        var prefix = $"INV-{today:yyyyMMdd}-";
        var lastNum = await _db.Sales
            .Where(s => s.InvoiceNumber.StartsWith(prefix))
            .OrderByDescending(s => s.InvoiceNumber)
            .Select(s => s.InvoiceNumber)
            .FirstOrDefaultAsync(ct);

        var seq = 1;
        if (lastNum != null)
        {
            var tail = lastNum.Substring(prefix.Length);
            if (int.TryParse(tail, out var n)) seq = n + 1;
        }
        return prefix + seq.ToString("D4");
    }
}
