using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MarketPro.Application.Common.Interfaces;
using MarketPro.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace MarketPro.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly IConfiguration _cfg;
    public AuthController(IAppDbContext db, IConfiguration cfg) { _db = db; _cfg = cfg; }

    public record LoginRequest(string Username, string Password);
    public record LoginResponse(string Token, DateTime ExpiresAt, Guid UserId, string FullName, string Role);

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username && u.IsActive, ct);
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { error = new { code = "INVALID_CREDENTIALS", message = "بيانات الدخول غير صحيحة" } });

        var jwt = _cfg.GetSection("Jwt");
        var minutes = int.TryParse(jwt["ExpiresMinutes"], out var m) ? m : 480;
        var expires = DateTime.UtcNow.AddMinutes(minutes);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("username", user.Username)
        };
        var token = new JwtSecurityToken(jwt["Issuer"], jwt["Audience"], claims, expires: expires, signingCredentials: creds);
        var jwtStr = new JwtSecurityTokenHandler().WriteToken(token);

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(new LoginResponse(jwtStr, expires, user.Id, user.FullName, user.Role.ToString()));
    }
}
