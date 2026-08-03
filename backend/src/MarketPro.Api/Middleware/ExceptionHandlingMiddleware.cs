using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace MarketPro.Api.Middleware;

/// <summary>
/// Global exception handler that returns a stable, structured error envelope to the SPA.
/// Status codes follow REST conventions; client code reads `error.message` and `error.code`.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await _next(ctx);
        }
        catch (BadHttpRequestException ex)
        {
            await Write(ctx, HttpStatusCode.BadRequest, "BAD_REQUEST", ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            await Write(ctx, HttpStatusCode.Unauthorized, "UNAUTHORIZED", ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            await Write(ctx, HttpStatusCode.NotFound, "NOT_FOUND", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Path}", ctx.Request.Path);
            var msg = ctx.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment()
                ? ex.Message
                : "حدث خطأ غير متوقع";
            await Write(ctx, HttpStatusCode.InternalServerError, "SERVER_ERROR", msg);
        }
    }

    private static Task Write(HttpContext ctx, HttpStatusCode code, string errCode, string message)
    {
        if (ctx.Response.HasStarted) return Task.CompletedTask;
        ctx.Response.Clear();
        ctx.Response.StatusCode = (int)code;
        ctx.Response.ContentType = "application/json; charset=utf-8";
        var payload = JsonSerializer.Serialize(new
        {
            error = new { code = errCode, message },
            traceId = ctx.TraceIdentifier
        });
        return ctx.Response.WriteAsync(payload);
    }
}
