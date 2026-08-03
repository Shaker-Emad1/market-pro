using MarketPro.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MarketPro.Infrastructure.Persistence.Configurations;

public class ProductConfig : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> b)
    {
        b.ToTable("Products");
        b.HasIndex(x => x.Sku).IsUnique();
        b.HasIndex(x => x.Barcode);
        b.Property(x => x.NameAr).HasMaxLength(200).IsRequired();
        b.Property(x => x.NameEn).HasMaxLength(200);
        b.Property(x => x.Sku).HasMaxLength(64).IsRequired();
        b.Property(x => x.Barcode).HasMaxLength(64);
        b.Property(x => x.CostPrice).HasColumnType("decimal(18,2)");
        b.Property(x => x.SellPrice).HasColumnType("decimal(18,2)");
        b.Property(x => x.DiscountPrice).HasColumnType("decimal(18,2)");
        b.Property(x => x.TaxRate).HasColumnType("decimal(5,2)");
        b.Property(x => x.StockQty).HasColumnType("decimal(18,3)");
        b.Property(x => x.MinStockQty).HasColumnType("decimal(18,3)");
        b.HasOne(x => x.Category).WithMany(c => c.Products).HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class CategoryConfig : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> b)
    {
        b.ToTable("Categories");
        b.Property(x => x.NameAr).HasMaxLength(120).IsRequired();
        b.Property(x => x.NameEn).HasMaxLength(120);
        b.Property(x => x.IconName).HasMaxLength(64);
        b.Property(x => x.ColorHex).HasMaxLength(9);
    }
}

public class CustomerConfig : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> b)
    {
        b.ToTable("Customers");
        b.Property(x => x.FullName).HasMaxLength(200).IsRequired();
        b.Property(x => x.Phone).HasMaxLength(32);
        b.HasIndex(x => x.Phone);
        b.Property(x => x.LoyaltyPoints).HasColumnType("decimal(18,2)");
        b.Property(x => x.CreditBalance).HasColumnType("decimal(18,2)");
    }
}

public class SaleConfig : IEntityTypeConfiguration<Sale>
{
    public void Configure(EntityTypeBuilder<Sale> b)
    {
        b.ToTable("Sales");
        b.HasIndex(x => x.InvoiceNumber).IsUnique();
        b.Property(x => x.InvoiceNumber).HasMaxLength(40).IsRequired();
        b.Property(x => x.SubTotal).HasColumnType("decimal(18,2)");
        b.Property(x => x.DiscountAmount).HasColumnType("decimal(18,2)");
        b.Property(x => x.TaxAmount).HasColumnType("decimal(18,2)");
        b.Property(x => x.Total).HasColumnType("decimal(18,2)");
        b.Property(x => x.PaidAmount).HasColumnType("decimal(18,2)");
        b.Property(x => x.ChangeAmount).HasColumnType("decimal(18,2)");
        b.HasMany(x => x.Items).WithOne(i => i.Sale!).HasForeignKey(i => i.SaleId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Customer).WithMany(c => c.Sales).HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.SetNull);
        b.HasOne(x => x.Cashier).WithMany().HasForeignKey(x => x.CashierId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class SaleItemConfig : IEntityTypeConfiguration<SaleItem>
{
    public void Configure(EntityTypeBuilder<SaleItem> b)
    {
        b.ToTable("SaleItems");
        b.Property(x => x.ProductNameSnapshot).HasMaxLength(200).IsRequired();
        b.Property(x => x.Quantity).HasColumnType("decimal(18,3)");
        b.Property(x => x.UnitPrice).HasColumnType("decimal(18,2)");
        b.Property(x => x.DiscountAmount).HasColumnType("decimal(18,2)");
        b.Property(x => x.TaxRate).HasColumnType("decimal(5,2)");
        b.Property(x => x.LineTotal).HasColumnType("decimal(18,2)");
    }
}

public class InventoryConfig : IEntityTypeConfiguration<InventoryMovement>
{
    public void Configure(EntityTypeBuilder<InventoryMovement> b)
    {
        b.ToTable("InventoryMovements");
        b.Property(x => x.Quantity).HasColumnType("decimal(18,3)");
        b.Property(x => x.QuantityBefore).HasColumnType("decimal(18,3)");
        b.Property(x => x.QuantityAfter).HasColumnType("decimal(18,3)");
        b.Property(x => x.UnitCost).HasColumnType("decimal(18,2)");
        b.Property(x => x.Reference).HasMaxLength(64);
    }
}

public class UserConfig : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.ToTable("Users");
        b.HasIndex(x => x.Username).IsUnique();
        b.Property(x => x.Username).HasMaxLength(64).IsRequired();
        b.Property(x => x.FullName).HasMaxLength(200).IsRequired();
        b.Property(x => x.PasswordHash).HasMaxLength(200).IsRequired();
        b.Property(x => x.Email).HasMaxLength(160);
        b.Property(x => x.Phone).HasMaxLength(32);
    }
}
