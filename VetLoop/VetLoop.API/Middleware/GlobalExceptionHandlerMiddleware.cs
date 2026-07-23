using System.Net;
using System.Text.Json;
namespace VetLoop.API.Middleware;

/// <summary>
/// Pipeline-level exception handler — the last safety net before the response leaves the server.
///
/// Catches ALL unhandled exceptions and converts them into a consistent JSON error envelope:
///
///   { "error": "...", "message": "...", "traceId": "..." }
///
/// This prevents raw stack traces from leaking to clients in production
/// and gives the mobile app a predictable error shape to parse.
///
/// Registration: app.UseMiddleware&lt;GlobalExceptionHandlerMiddleware&gt;()
///               → must be the FIRST middleware in the pipeline.
/// </summary>
public sealed class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate               _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;
    private readonly IHostEnvironment              _env;

    // Shared serializer options — reused across requests (thread-safe)
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public GlobalExceptionHandlerMiddleware(
        RequestDelegate                            next,
        ILogger<GlobalExceptionHandlerMiddleware>  logger,
        IHostEnvironment                           env)
    {
        _next   = next;
        _logger = logger;
        _env    = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        // Structured log with full exception chain — always logs regardless of environment
        _logger.LogError(exception,
            "Unhandled exception on {Method} {Path}",
            context.Request.Method,
            context.Request.Path);

        var traceId = context.TraceIdentifier;

        // ── Map exception type → HTTP status + user-facing error code ────────
        var (statusCode, errorCode, message) = exception switch
        {
            // Business rule violations sent from controllers/services as exceptions
            ArgumentException ae =>
                (HttpStatusCode.BadRequest, "BadRequest", ae.Message),

            // JWT claim missing / auth header absent at service layer
            UnauthorizedAccessException =>
                (HttpStatusCode.Unauthorized, "Unauthorized", "Authentication is required."),

            // EF Core record not found (thrown manually or via FirstOrDefault guard)
            KeyNotFoundException knfe =>
                (HttpStatusCode.NotFound, "NotFound", knfe.Message),

            // PostgreSQL / network transient failure
            Npgsql.NpgsqlException =>
                (HttpStatusCode.ServiceUnavailable, "DatabaseUnavailable",
                 "A database error occurred. Please try again shortly."),

            // Task cancellation (client disconnected)
            OperationCanceledException =>
                (HttpStatusCode.BadRequest, "RequestCancelled", "The request was cancelled."),

            // Catch-all
            _ => (HttpStatusCode.InternalServerError, "InternalServerError",
                  "An unexpected error occurred. Please contact support.")
        };

        // ── Build response payload ─────────────────────────────────────────────
        var payload = new ErrorResponse(
            Error:   errorCode,
            Message: message,
            // In Development, include the actual exception message for faster debugging.
            // In Production, the generic message above is used.
            Detail:  _env.IsDevelopment() ? exception.ToString() : null,
            TraceId: traceId
        );

        // Response must not already have started (e.g. streaming responses)
        if (context.Response.HasStarted)
        {
            _logger.LogWarning("Response already started — cannot rewrite status code for exception.");
            return;
        }

        context.Response.StatusCode  = (int)statusCode;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(payload, _jsonOptions));
    }

    /// <summary>
    /// Standard error envelope returned to all clients on unhandled exceptions.
    /// Detail field is null in Production to prevent information leakage.
    /// </summary>
    private sealed record ErrorResponse(
        string  Error,
        string  Message,
        string? Detail,
        string  TraceId
    );
}
