using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using VetLoop.API.Entities;

namespace VetLoop.API.Services;

/// <summary>
/// Produces signed HS256 JWT tokens with role, email, and sub claims.
/// Reads key material from IConfiguration — never hardcoded.
/// </summary>
public sealed class TokenService : ITokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    public (string Token, DateTime ExpiresAt) GenerateToken(User user)
    {
        var jwtSection   = _config.GetSection("Jwt");
        var rawKey       = jwtSection["Key"]      ?? throw new InvalidOperationException("Jwt:Key missing.");
        var issuer       = jwtSection["Issuer"]   ?? throw new InvalidOperationException("Jwt:Issuer missing.");
        var audience     = jwtSection["Audience"] ?? throw new InvalidOperationException("Jwt:Audience missing.");
        var expiresInMin = int.TryParse(jwtSection["ExpiresInMinutes"], out var parsed) ? parsed : 60;

        var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(rawKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt   = DateTime.UtcNow.AddMinutes(expiresInMin);

        // ── Claims ──────────────────────────────────────────────────────────
        // Role stored under the ASP.NET Core Identity URI so [Authorize(Roles = "...")] works
        // transparently with the standard claims transformation pipeline.
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()), // Unique token ID
            new(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),
            new("full_name",  user.FullName),
            // ASP.NET Core standard role claim URI — works with [Authorize(Roles = "Veterinarian")]
            new("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", user.Role.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:             issuer,
            audience:           audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
