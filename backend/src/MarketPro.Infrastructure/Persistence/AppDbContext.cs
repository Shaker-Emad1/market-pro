using MarketPro.Application.Common.Interfaces;
using MarketPro.Domain.Common;
using MarketPro.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MarketPro.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        foreach (var et in b.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(et.ClrType))
            {
                b.Entity(et.ClrType).HasQueryFilter(GetSoftDeleteFilter(et.ClrType));
            }
        }
    }

    private static System.Linq.Expressions.LambdaExpression GetSoftDeleteFilter(Type type)
    {
        var p = System.Linq.Expressions.Expression.Parameter(type, "e");
        var prop = System.Linq.Expressions.Expression.Property(p, nameof(BaseEntity.IsDeleted));
        var notDeleted = System.Linq.Expressions.Expression.Not(prop);
        return System.Linq.Expressions.Expression.Lambda(notDeleted, p);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var e in ChangeTracker.Entries<BaseEntity>())
        {
            if (e.State == EntityState.Added) e.Entity.CreatedAt = DateTime.UtcNow;
            if (e.State == EntityState.Modified) e.Entity.UpdatedAt = DateTime.UtcNow;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
