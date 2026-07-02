using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VetLoop.API.Data;
using VetLoop.API.DTOs.Auth;
using VetLoop.API.Entities;
using VetLoop.API.Services;

namespace VetLoop.API.Controllers;

/// <summary>
/// Handles platform authentication — email/password registration, login, and SSO.
/// Returns signed JWTs consumed by the React Native AuthContext.
/// Route: /api/auth
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly VetLoopDbContext            _db;
    private readonly ITokenService              _tokenService;
    private readonly IGoogleAuthService         _googleAuthService;
    private readonly ILogger<AuthController>    _logger;

    public AuthController(
        VetLoopDbContext         db,
        ITokenService            tokenService,
        IGoogleAuthService       googleAuthService,
        ILogger<AuthController>  logger)
    {
        _db                = db;
        _tokenService      = tokenService;
        _googleAuthService = googleAuthService;
        _logger            = logger;
    }

    // ── POST /api/auth/register ─────────────────────────────────────────────
    /// <summary>
    /// Creates a new platform account and returns an authentication token.
    /// Admin role registration is blocked at this public endpoint.
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequestDto dto,
        CancellationToken ct)
    {
        // Block self-registration as Admin
        if (dto.Role == UserRole.Admin)
            return BadRequest(new { error = "Admin accounts cannot be self-registered." });

        // Check for duplicate email (case-insensitive)
        var emailExists = await _db.Users
            .AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower(), ct);

        if (emailExists)
            return Conflict(new { error = $"An account with email '{dto.Email}' already exists." });

        // Hash password with BCrypt (work factor 12 — production standard)
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 12);

        var user = new User
        {
            FullName     = dto.FullName.Trim(),
            Email        = dto.Email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHash,
            PhoneNumber  = dto.PhoneNumber?.Trim(),
            Role         = dto.Role,
            IsActive     = true,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("New user registered: {Email} as {Role}", user.Email, user.Role);

        var (token, expiresAt) = _tokenService.GenerateToken(user);

        return CreatedAtAction(
            actionName: nameof(Register),
            value: new AuthResponseDto(
                Token:     token,
                Email:     user.Email,
                FullName:  user.FullName,
                Role:      user.Role.ToString(),
                ExpiresAt: expiresAt));
    }

    // ── POST /api/auth/login ────────────────────────────────────────────────
    /// <summary>
    /// Authenticates an existing user and returns a fresh JWT.
    /// Returns 401 for both "user not found" and "wrong password" to prevent user enumeration.
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequestDto dto,
        CancellationToken ct)
    {
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == dto.Email.ToLowerInvariant(), ct);

        // Constant-time check to mitigate timing attacks
        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            _logger.LogWarning("Failed login attempt for email: {Email}", dto.Email);
            return Unauthorized(new { error = "Invalid email or password." });
        }

        if (!user.IsActive)
            return Unauthorized(new { error = "This account has been deactivated. Contact support." });

        // Update last login timestamp (fire-and-forget style)
        await _db.Users
            .Where(u => u.Id == user.Id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.LastLoginDate, DateTime.UtcNow)
                .SetProperty(u => u.UpdatedAt,     DateTime.UtcNow),
            ct);

        _logger.LogInformation("User logged in: {Email}", user.Email);

        var (token, expiresAt) = _tokenService.GenerateToken(user);

        return Ok(new AuthResponseDto(
            Token:     token,
            Email:     user.Email,
            FullName:  user.FullName,
            Role:      user.Role.ToString(),
            ExpiresAt: expiresAt));
    }

    // ── POST /api/auth/google ───────────────────────────────────────────────
    /// <summary>
    /// Google SSO endpoint — validates a Google ID Token from the mobile client,
    /// finds or auto-creates the user, and returns a VetLoop platform JWT.
    ///
    /// Security model (ID Token Exchange pattern):
    ///   1. Mobile client performs OAuth with Google and receives an ID Token.
    ///   2. ID Token is POSTed here — never trusted at face value.
    ///   3. <see cref="IGoogleAuthService"/> re-validates the token against
    ///      Google's public RSA keys, confirming the audience, expiry, and
    ///      signature before any database lookup is performed.
    ///   4. Our platform JWT is issued using the same <see cref="ITokenService"/>
    ///      as email/password login — consistent token shape and claims.
    ///
    /// Account linking: if a user previously registered with the same email
    /// address, their Google ID is linked to that existing account automatically.
    /// </summary>
    [HttpPost("google")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GoogleLogin(
        [FromBody] GoogleLoginRequestDto dto,
        CancellationToken ct)
    {
        // ── 1. Server-side token validation ───────────────────────────────
        if (string.IsNullOrWhiteSpace(dto.IdToken))
            return BadRequest(new { error = "idToken is required." });

        GoogleUserInfo googleUser;
        try
        {
            googleUser = await _googleAuthService.ValidateIdTokenAsync(dto.IdToken, ct);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(
                "[Auth/Google] Token validation rejected: {Reason}", ex.Message);
            return Unauthorized(new { error = ex.Message });
        }

        // ── 2. Find existing user — GoogleId first, email fallback ────────
        //    The GoogleId lookup handles users who may have changed their
        //    Google email but kept the same `sub` (subject) identifier.
        //    The email fallback handles account linking for existing
        //    email+password users signing in with Google for the first time.
        var user = await _db.Users
            .FirstOrDefaultAsync(
                u => u.GoogleId == googleUser.GoogleId || u.Email == googleUser.Email,
                ct);

        if (user is null)
        {
            // ── 3a. Auto-register new SSO user ─────────────────────────
            //    Defaults to PetOwner — the most common role.
            //    A "complete your profile" flow can upgrade the role later.
            user = new User
            {
                FullName     = googleUser.FullName,
                Email        = googleUser.Email.ToLowerInvariant(),
                GoogleId     = googleUser.GoogleId,
                PasswordHash = string.Empty,   // No password for SSO-only accounts
                Role         = UserRole.PetOwner,
                IsActive     = true,
                LastLoginDate = DateTime.UtcNow,
            };
            _db.Users.Add(user);

            _logger.LogInformation(
                "[Auth/Google] Auto-registered new SSO user: {Email} (GoogleId={GoogleId})",
                user.Email, googleUser.GoogleId);
        }
        else
        {
            // ── 3b. Existing user ───────────────────────────────────────
            if (!user.IsActive)
                return Unauthorized(new { error = "This account has been deactivated. Contact support." });

            // Account linking: first time this email account signs in via Google
            if (user.GoogleId is null)
            {
                user.GoogleId = googleUser.GoogleId;
                _logger.LogInformation(
                    "[Auth/Google] Linked Google account to existing user: {Email}",
                    user.Email);
            }

            user.LastLoginDate = DateTime.UtcNow;
        }

        // ── 4. Persist changes (both new user and last-login update) ──────
        //    StampUpdatedAt() in SaveChangesAsync handles the UpdatedAt field.
        await _db.SaveChangesAsync(ct);

        // ── 5. Issue our platform JWT via the existing TokenService ───────
        var (token, expiresAt) = _tokenService.GenerateToken(user);

        _logger.LogInformation("[Auth/Google] Issued VetLoop JWT for {Email}", user.Email);

        return Ok(new AuthResponseDto(
            Token:     token,
            Email:     user.Email,
            FullName:  user.FullName,
            Role:      user.Role.ToString(),
            ExpiresAt: expiresAt));
    }
}
