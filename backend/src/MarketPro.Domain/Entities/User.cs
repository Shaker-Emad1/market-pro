using MarketPro.Domain.Common;

namespace MarketPro.Domain.Entities;

public enum UserRole
{
    Admin = 1,
    Cashier = 2
}

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public UserRole Role { get; set; } = UserRole.Cashier;
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
}
