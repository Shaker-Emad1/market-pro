using MarketPro.Application.Common;
using MarketPro.Application.Common.Interfaces;
using MarketPro.Domain.Entities;
using MarketPro.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace MarketPro.Application.Customers;

public interface ICustomerService
{
    Task<PagedResult<CustomerDto>> GetCustomersAsync(CustomerQuery query, CancellationToken ct);
    Task<CustomerDto?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Result<CustomerDto>> CreateAsync(CreateCustomerDto dto, CancellationToken ct);
    Task<Result<CustomerDto>> UpdateAsync(Guid id, UpdateCustomerDto dto, CancellationToken ct);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct);
    Task<PagedResult<CustomerInvoiceDto>> GetInvoicesAsync(Guid customerId, int page, int pageSize, CancellationToken ct);
    Task<Result<decimal>> PayDebtAsync(Guid customerId, decimal amount, string? notes, CancellationToken ct);
}

public record CustomerQuery(
    string? Search,
    bool? HasDebt,
    int Page = 1,
    int PageSize = 10
);

public record CustomerDto(
    Guid Id,
    string FullName,
    string? Phone,
    string? Email,
    string? Notes,
    decimal CreditBalance,
    decimal LoyaltyPoints,
    int TotalSalesCount,
    decimal TotalSalesAmount
);

public record CreateCustomerDto(
    string FullName,
    string? Phone,
    string? Email,
    string? Notes,
    decimal CreditBalance = 0m,
    decimal LoyaltyPoints = 0m
);

public record UpdateCustomerDto(
    string FullName,
    string? Phone,
    string? Email,
    string? Notes,
    decimal CreditBalance,
    decimal LoyaltyPoints
);

public record CustomerInvoiceDto(
    Guid Id,
    string InvoiceNumber,
    DateTime SaleDate,
    decimal Total,
    decimal PaidAmount,
    decimal ChangeAmount,
    PaymentMethod PaymentMethod
);

public class CustomerService : ICustomerService
{
    private readonly IAppDbContext _db;
    public CustomerService(IAppDbContext db) => _db = db;

    public async Task<PagedResult<CustomerDto>> GetCustomersAsync(CustomerQuery query, CancellationToken ct)
    {
        var q = _db.Customers
            .Include(c => c.Sales)
            .Where(c => !c.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(c => c.FullName.Contains(s) || (c.Phone != null && c.Phone.Contains(s)));
        }

        if (query.HasDebt == true)
        {
            q = q.Where(c => c.CreditBalance > 0);
        }

        var total = await q.CountAsync(ct);
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Max(1, query.PageSize);

        var items = await q
            .OrderBy(c => c.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CustomerDto(
                c.Id,
                c.FullName,
                c.Phone,
                c.Email,
                c.Notes,
                c.CreditBalance,
                c.LoyaltyPoints,
                c.Sales.Count(s => !s.IsDeleted),
                c.Sales.Where(s => !s.IsDeleted).Sum(s => s.Total)
            ))
            .ToListAsync(ct);

        return new PagedResult<CustomerDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<CustomerDto?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _db.Customers
            .Include(c => c.Sales)
            .Where(c => !c.IsDeleted && c.Id == id)
            .Select(c => new CustomerDto(
                c.Id,
                c.FullName,
                c.Phone,
                c.Email,
                c.Notes,
                c.CreditBalance,
                c.LoyaltyPoints,
                c.Sales.Count(s => !s.IsDeleted),
                c.Sales.Where(s => !s.IsDeleted).Sum(s => s.Total)
            ))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<Result<CustomerDto>> CreateAsync(CreateCustomerDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName))
            return Result<CustomerDto>.Fail("اسم العميل بالكامل مطلوب");

        var customer = new Customer
        {
            FullName = dto.FullName,
            Phone = dto.Phone,
            Email = dto.Email,
            Notes = dto.Notes,
            CreditBalance = dto.CreditBalance,
            LoyaltyPoints = dto.LoyaltyPoints
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);

        return Result<CustomerDto>.Ok(new CustomerDto(
            customer.Id, customer.FullName, customer.Phone, customer.Email, customer.Notes,
            customer.CreditBalance, customer.LoyaltyPoints, 0, 0m
        ));
    }

    public async Task<Result<CustomerDto>> UpdateAsync(Guid id, UpdateCustomerDto dto, CancellationToken ct)
    {
        var customer = await _db.Customers
            .Include(c => c.Sales)
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);

        if (customer == null)
            return Result<CustomerDto>.Fail("العميل غير موجود");

        if (string.IsNullOrWhiteSpace(dto.FullName))
            return Result<CustomerDto>.Fail("اسم العميل بالكامل مطلوب");

        customer.FullName = dto.FullName;
        customer.Phone = dto.Phone;
        customer.Email = dto.Email;
        customer.Notes = dto.Notes;
        customer.CreditBalance = dto.CreditBalance;
        customer.LoyaltyPoints = dto.LoyaltyPoints;

        await _db.SaveChangesAsync(ct);

        return Result<CustomerDto>.Ok(new CustomerDto(
            customer.Id, customer.FullName, customer.Phone, customer.Email, customer.Notes,
            customer.CreditBalance, customer.LoyaltyPoints,
            customer.Sales.Count(s => !s.IsDeleted),
            customer.Sales.Where(s => !s.IsDeleted).Sum(s => s.Total)
        ));
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, ct);
        if (customer == null) return false;

        customer.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<PagedResult<CustomerInvoiceDto>> GetInvoicesAsync(Guid customerId, int page, int pageSize, CancellationToken ct)
    {
        var q = _db.Sales
            .Where(s => !s.IsDeleted && s.CustomerId == customerId);

        var total = await q.CountAsync(ct);
        var p = Math.Max(1, page);
        var ps = Math.Max(1, pageSize);

        var items = await q
            .OrderByDescending(s => s.SaleDate)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(s => new CustomerInvoiceDto(
                s.Id, s.InvoiceNumber, s.SaleDate, s.Total, s.PaidAmount, s.ChangeAmount, s.PaymentMethod
            ))
            .ToListAsync(ct);

        return new PagedResult<CustomerInvoiceDto>
        {
            Items = items,
            TotalCount = total,
            Page = p,
            PageSize = ps
        };
    }

    public async Task<Result<decimal>> PayDebtAsync(Guid customerId, decimal amount, string? notes, CancellationToken ct)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == customerId && !c.IsDeleted, ct);
        if (customer == null) return Result<decimal>.Fail("العميل غير موجود");

        if (amount <= 0) return Result<decimal>.Fail("المبلغ المدفوع يجب أن يكون أكبر من الصفر");

        if (amount > customer.CreditBalance)
            return Result<decimal>.Fail("المبلغ المدفوع أكبر من إجمالي الدين المستحق");

        customer.CreditBalance -= amount;

        // Log payment in Customer notes or we can just save it
        if (!string.IsNullOrWhiteSpace(notes))
        {
            customer.Notes = $"{customer.Notes}\n[{DateTime.UtcNow:yyyy/MM/dd}]: سداد دفعة بقيمة {amount} - {notes}".Trim();
        }
        else
        {
            customer.Notes = $"{customer.Notes}\n[{DateTime.UtcNow:yyyy/MM/dd}]: سداد دفعة بقيمة {amount}".Trim();
        }

        await _db.SaveChangesAsync(ct);
        return Result<decimal>.Ok(customer.CreditBalance);
    }
}
