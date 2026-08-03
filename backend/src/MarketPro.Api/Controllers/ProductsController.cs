using System.Security.Claims;
using MarketPro.Application.Common;
using MarketPro.Application.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MarketPro.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _svc;
    public ProductsController(IProductService svc) => _svc = svc;

    [HttpGet]
    public Task<PagedResult<ProductDto>> Get([FromQuery] ProductQuery query, CancellationToken ct)
        => _svc.GetProductsAsync(query, ct);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductDto>> GetById(Guid id, CancellationToken ct)
    {
        var p = await _svc.GetByIdAsync(id, ct);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductDto dto, CancellationToken ct)
    {
        var userId = GetUserId();
        var res = await _svc.CreateAsync(dto, userId, ct);
        if (!res.Success) return BadRequest(new { error = res.Error });
        return CreatedAtAction(nameof(GetById), new { id = res.Data!.Id }, res.Data);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProductDto>> Update(Guid id, [FromBody] UpdateProductDto dto, CancellationToken ct)
    {
        var userId = GetUserId();
        var res = await _svc.UpdateAsync(id, dto, userId, ct);
        if (!res.Success) return BadRequest(new { error = res.Error });
        return Ok(res.Data);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var ok = await _svc.DeleteAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("categories")]
    public Task<List<CategoryDto>> GetCategories(CancellationToken ct)
        => _svc.GetCategoriesAsync(ct);

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
                  ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var guid) ? guid : Guid.Empty;
    }
}
