using MarketPro.Application.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MarketPro.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _svc;
    public ReportsController(IReportService svc) => _svc = svc;

    [HttpGet("sales")]
    public Task<SalesReportDto> GetSales([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
    {
        var f = from ?? DateTime.UtcNow.Date.AddDays(-30);
        var t = to ?? DateTime.UtcNow;
        return _svc.GetSalesReportAsync(f, t, ct);
    }

    [HttpGet("products")]
    public Task<List<ProductSalesReportDto>> GetProducts([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
    {
        var f = from ?? DateTime.UtcNow.Date.AddDays(-30);
        var t = to ?? DateTime.UtcNow;
        return _svc.GetProductSalesReportAsync(f, t, ct);
    }

    [HttpGet("customer-debt")]
    public Task<List<CustomerDebtReportDto>> GetCustomerDebt(CancellationToken ct)
        => _svc.GetCustomerDebtReportAsync(ct);

    [HttpGet("inventory")]
    public Task<InventoryStatusReportDto> GetInventory(CancellationToken ct)
        => _svc.GetInventoryStatusReportAsync(ct);
}
