using MarketPro.Domain.Common;

namespace MarketPro.Domain.Entities;

public class Customer : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Notes { get; set; }
    public decimal CreditBalance { get; set; }
    public decimal LoyaltyPoints { get; set; }
    public ICollection<Sale> Sales { get; set; } = new List<Sale>();
}
