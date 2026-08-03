using MarketPro.Application.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MarketPro.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _svc;
    public DashboardController(IDashboardService svc) => _svc = svc;

    [HttpGet("summary")]
    public Task<DashboardSummaryDto> Summary(CancellationToken ct) => _svc.GetSummaryAsync(ct);
}
