using System.Security.Claims;
using System.Text;
using MarketPro.Api.Middleware;
using MarketPro.Application;
using MarketPro.Application.Common.Settings;
using MarketPro.Infrastructure;
using MarketPro.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.Configure<StoreSettings>(builder.Configuration.GetSection("Store"));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var jwt = builder.Configuration.GetSection("Jwt");
var keyBytes = Encoding.UTF8.GetBytes(jwt["Key"]!);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:4200" };

builder.Services.AddCors(o => o.AddPolicy("Spa", p =>
    p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Market Pro API V1");
    c.RoutePrefix = "swagger";
});

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    int maxRetries = 15;
    int delaySeconds = 4;
    bool success = false;
    
    for (int i = 1; i <= maxRetries; i++)
    {
        try
        {
            logger.LogInformation("Attempting to connect to SQL Server and seed database... (Attempt {Attempt}/{MaxRetries})", i, maxRetries);
            await DbSeeder.SeedAsync(db);
            logger.LogInformation("Database connection established and seeded successfully!");
            success = true;
            break;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to connect to database or seed on attempt {Attempt}. Retrying in {Delay} seconds...", i, delaySeconds);
            if (i < maxRetries)
            {
                await Task.Delay(TimeSpan.FromSeconds(delaySeconds));
            }
        }
    }
    
    if (!success)
    {
        logger.LogCritical("Could not connect to database after {MaxRetries} attempts. API startup proceeding, but database queries will fail.", maxRetries);
    }
}

app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors("Spa");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

app.Run();
