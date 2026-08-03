using System.Security.Claims;
using MarketPro.Application.Common;
using MarketPro.Application.Inventory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MarketPro.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/inventory")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _svc;
    public InventoryController(IInventoryService svc) => _svc = svc;

    [HttpGet("analytics")]
    public Task<InventoryAnalyticsDto> GetAnalytics(CancellationToken ct)
        => _svc.GetAnalyticsAsync(ct);

    [HttpGet("overview")]
    public Task<PagedResult<InventoryItemDto>> GetOverview([FromQuery] InventoryOverviewQuery query, CancellationToken ct)
        => _svc.GetStockOverviewAsync(query, ct);

    [HttpGet("movements")]
    public Task<PagedResult<MovementDto>> GetMovements([FromQuery] MovementQuery query, CancellationToken ct)
        => _svc.GetMovementsAsync(query, ct);

    [HttpPost("restock")]
    public async Task<ActionResult> Restock([FromBody] RestockRequest req, CancellationToken ct)
    {
        var userId = GetUserId();
        var res = await _svc.RestockAsync(req, userId, ct);
        if (!res.Success) return BadRequest(new { error = res.Error });
        return Ok(new { message = "تمت عملية التوريد بنجاح" });
    }

    [HttpPost("adjust")]
    public async Task<ActionResult> Adjust([FromBody] StockAdjustmentRequest req, CancellationToken ct)
    {
        var userId = GetUserId();
        var res = await _svc.AdjustStockAsync(req, userId, ct);
        if (!res.Success) return BadRequest(new { error = res.Error });
        return Ok(new { message = "تمت عملية التسوية بنجاح" });
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
                  ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var guid) ? guid : Guid.Empty;
    }
}
