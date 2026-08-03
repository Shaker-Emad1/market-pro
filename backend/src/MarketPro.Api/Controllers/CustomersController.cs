using MarketPro.Application.Common;
using MarketPro.Application.Customers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MarketPro.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/customers")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _svc;
    public CustomersController(ICustomerService svc) => _svc = svc;

    [HttpGet]
    public Task<PagedResult<CustomerDto>> Get([FromQuery] CustomerQuery query, CancellationToken ct)
        => _svc.GetCustomersAsync(query, ct);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> GetById(Guid id, CancellationToken ct)
    {
        var c = await _svc.GetByIdAsync(id, ct);
        return c is null ? NotFound() : Ok(c);
    }

    [HttpPost]
    public async Task<ActionResult<CustomerDto>> Create([FromBody] CreateCustomerDto dto, CancellationToken ct)
    {
        var res = await _svc.CreateAsync(dto, ct);
        if (!res.Success) return BadRequest(new { error = res.Error });
        return CreatedAtAction(nameof(GetById), new { id = res.Data!.Id }, res.Data);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> Update(Guid id, [FromBody] UpdateCustomerDto dto, CancellationToken ct)
    {
        var res = await _svc.UpdateAsync(id, dto, ct);
        if (!res.Success) return BadRequest(new { error = res.Error });
        return Ok(res.Data);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var ok = await _svc.DeleteAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("{id:guid}/invoices")]
    public Task<PagedResult<CustomerInvoiceDto>> GetInvoices(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
        => _svc.GetInvoicesAsync(id, page, pageSize, ct);

    [HttpPost("{id:guid}/pay-debt")]
    public async Task<ActionResult> PayDebt(Guid id, [FromBody] PayDebtRequest req, CancellationToken ct)
    {
        var res = await _svc.PayDebtAsync(id, req.Amount, req.Notes, ct);
        if (!res.Success) return BadRequest(new { error = res.Error });
        return Ok(new { creditBalance = res.Data, message = "تم سداد الدفعة بنجاح" });
    }
}

public record PayDebtRequest(decimal Amount, string? Notes);
