using System.Security.Claims;
using MarketPro.Application.Pos;
using MarketPro.Application.Pos.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MarketPro.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/pos")]
public class PosController : ControllerBase
{
    private readonly IPosService _pos;
    public PosController(IPosService pos) => _pos = pos;

    [HttpGet("categories")]
    public Task<List<PosCategoryDto>> Categories(CancellationToken ct) => _pos.GetCategoriesAsync(ct);

    [HttpGet("products")]
    public Task<List<PosProductDto>> Products([FromQuery] string? q, [FromQuery] Guid? categoryId, CancellationToken ct)
        => _pos.SearchProductsAsync(q, categoryId, ct);

    [HttpGet("products/by-barcode/{barcode}")]
    public async Task<ActionResult<PosProductDto>> ByBarcode(string barcode, CancellationToken ct)
    {
        var p = await _pos.GetByBarcodeAsync(barcode, ct);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpPost("sales")]
    public async Task<ActionResult<SaleSummaryDto>> CreateSale([FromBody] CreateSaleRequest req, CancellationToken ct)
    {
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
                  ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(sub, out var cashierId)) return Unauthorized();

        var result = await _pos.CreateSaleAsync(req, cashierId, ct);
        if (!result.Success) return BadRequest(new { error = result.Error });
        return Ok(result.Data);
    }
}
