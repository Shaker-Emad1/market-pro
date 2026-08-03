using MarketPro.Domain.Common;

namespace MarketPro.Domain.Entities;

public class SaleItem : BaseEntity
{
    public Guid SaleId { get; set; }
    public Sale? Sale { get; set; }

    public Guid ProductId { get; set; }
    public Product? Product { get; set; }

    public string ProductNameSnapshot { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxRate { get; set; }
    public decimal LineTotal { get; set; }
}
