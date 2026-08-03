using MarketPro.Domain.Common;

namespace MarketPro.Domain.Entities;

public enum MovementType
{
    Purchase = 1,
    Sale = 2,
    Adjustment = 3,
    Return = 4,
    Waste = 5
}

public class InventoryMovement : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product? Product { get; set; }
    public MovementType Type { get; set; }

    public decimal Quantity { get; set; }
    public decimal QuantityBefore { get; set; }
    public decimal QuantityAfter { get; set; }
    public decimal UnitCost { get; set; }

    public string? Reference { get; set; }
    public string? Reason { get; set; }
    public Guid? UserId { get; set; }
}
