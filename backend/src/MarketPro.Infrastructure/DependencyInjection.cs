using MarketPro.Application.Common.Interfaces;
using MarketPro.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MarketPro.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var cs = config.GetConnectionString("Default")
                 ?? "Server=(localdb)\\MSSQLLocalDB;Database=MarketProDb;Trusted_Connection=True;TrustServerCertificate=True;";

        services.AddDbContext<AppDbContext>(opt => opt.UseSqlServer(cs));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        return services;
    }
}
