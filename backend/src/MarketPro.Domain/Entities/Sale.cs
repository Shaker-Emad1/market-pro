using MarketPro.Domain.Common;
using MarketPro.Domain.Enums;

namespace MarketPro.Domain.Entities;

public class Sale : BaseEntity
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime SaleDate { get; set; } = DateTime.UtcNow;

    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Total { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }

    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? Notes { get; set; }

    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public Guid CashierId { get; set; }
    public User? Cashier { get; set; }

    public ICollection<SaleItem> Items { get; set; } = new List<SaleItem>();
}
