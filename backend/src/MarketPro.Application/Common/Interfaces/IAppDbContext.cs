using MarketPro.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MarketPro.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<Product> Products { get; }
    DbSet<Category> Categories { get; }
    DbSet<Customer> Customers { get; }
    DbSet<Sale> Sales { get; }
    DbSet<SaleItem> SaleItems { get; }
    DbSet<InventoryMovement> InventoryMovements { get; }
    DbSet<User> Users { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
