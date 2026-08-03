using MarketPro.Domain.Common;

namespace MarketPro.Domain.Entities;

public class Category : BaseEntity
{
    public string NameAr { get; set; } = string.Empty;
    public string? NameEn { get; set; }
    public string? IconName { get; set; }
    public string? ColorHex { get; set; }
    public int DisplayOrder { get; set; }
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
