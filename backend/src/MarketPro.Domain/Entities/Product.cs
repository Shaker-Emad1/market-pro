using MarketPro.Domain.Common;
using MarketPro.Domain.Enums;

namespace MarketPro.Domain.Entities;

public class Product : BaseEntity
{
    public string Sku { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }

    public decimal CostPrice { get; set; }
    public decimal SellPrice { get; set; }
    public decimal? DiscountPrice { get; set; }
    public decimal TaxRate { get; set; } = 15m;

    public decimal StockQty { get; set; }
    public decimal MinStockQty { get; set; } = 5m;
    public bool TrackStock { get; set; } = true;
    public UnitType Unit { get; set; } = UnitType.Piece;

    public DateTime? ExpirationDate { get; set; }
    public bool IsActive { get; set; } = true;

    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }

    public ICollection<SaleItem> SaleItems { get; set; } = new List<SaleItem>();
    public ICollection<InventoryMovement> Movements { get; set; } = new List<InventoryMovement>();
}
