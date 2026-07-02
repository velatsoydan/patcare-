using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using VetLoop.API.Data;

// ══════════════════════════════════════════════════════════════════════════════
//  VetLoop.API  |  .NET 9 Minimal Hosting
//  Clean Architecture entry point — service registration & pipeline assembly.
// ══════════════════════════════════════════════════════════════════════════════

var builder = WebApplication.CreateBuilder(args);

// ── 1. PostgreSQL + EF Core ────────────────────────────────────────────────
builder.Services.AddDbContext<VetLoopDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is missing."),
        npgsql =>
        {
            npgsql.EnableRetryOnFailure(
                maxRetryCount:  5,
                maxRetryDelay:  TimeSpan.FromSeconds(10),
                errorCodesToAdd: null);
        })
    // Log EF Core SQL only in Development — avoids noise in production logs
    .EnableDetailedErrors(builder.Environment.IsDevelopment())
    .EnableSensitiveDataLogging(builder.Environment.IsDevelopment()));

// ── 2. JWT Bearer Authentication ───────────────────────────────────────────
var jwtSection = builder.Configuration.GetSection("Jwt");

var jwtKey      = jwtSection["Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured.");
var jwtIssuer   = jwtSection["Issuer"]
    ?? throw new InvalidOperationException("Jwt:Issuer is not configured.");
var jwtAudience = jwtSection["Audience"]
    ?? throw new InvalidOperationException("Jwt:Audience is not configured.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            // ── What to validate ──────────────────────────────────────────
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,

            // ── Valid values ───────────────────────────────────────────────
            ValidIssuer      = jwtIssuer,
            ValidAudience    = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(
                                   Encoding.UTF8.GetBytes(jwtKey)),

            // ── Strict expiry — zero tolerance for clock skew ─────────────
            ClockSkew = TimeSpan.Zero,

            // ── Role claim mapping (ASP.NET Core Identity convention) ──────
            RoleClaimType = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
        };

        // Propagate auth failures as 401/403 rather than redirecting
        options.Events = new JwtBearerEvents
        {
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode  = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";
                return context.Response.WriteAsync(
                    """{"error":"Unauthorized","message":"A valid JWT Bearer token is required."}""");
            },
            OnForbidden = context =>
            {
                context.Response.StatusCode  = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                return context.Response.WriteAsync(
                    """{"error":"Forbidden","message":"You do not have permission to perform this action."}""");
            },
        };
    });

builder.Services.AddAuthorization();

// ── 3. Application Services ────────────────────────────────────────────────
builder.Services.AddHttpClient();
builder.Services.AddScoped<VetLoop.API.Services.ITokenService,
                            VetLoop.API.Services.TokenService>();
builder.Services.AddScoped<VetLoop.API.Services.IGoogleAuthService,
                            VetLoop.API.Services.GoogleAuthService>();
builder.Services.AddScoped<VetLoop.API.Services.IAiService,
                            VetLoop.API.Services.OpenAiService>();

// ── 4. Controllers ─────────────────────────────────────────────────────────
builder.Services.AddControllers();

// ── 4. OpenAPI (native .NET 9) + Scalar UI ────────────────────────────────
builder.Services.AddOpenApi();

// ── 5. CORS ────────────────────────────────────────────────────────────────
//  Dev: allow all origins (Expo/Vite dev servers).
//  Production: restrict via environment-specific appsettings.
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevPolicy", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

// ══════════════════════════════════════════════════════════════════════════════
//  Middleware Pipeline
// ══════════════════════════════════════════════════════════════════════════════

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    // OpenAPI JSON document: GET /openapi/v1.json
    app.MapOpenApi();

    // Scalar interactive API explorer: GET /scalar/v1
    app.MapScalarApiReference(options =>
    {
        options.Title       = "VetLoop API";
        options.Theme       = ScalarTheme.DeepSpace;
    });
}

app.UseHttpsRedirection();
app.UseCors("DevPolicy");

// IMPORTANT: Authentication MUST be registered before Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
