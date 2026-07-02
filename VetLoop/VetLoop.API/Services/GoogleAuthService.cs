using Google.Apis.Auth;

namespace VetLoop.API.Services;

/// <summary>
/// Validates Google ID Tokens using Google.Apis.Auth's built-in RSA signature
/// verification against Google's rotating public key endpoints.
///
/// Security guarantees provided by <c>GoogleJsonWebSignature.ValidateAsync</c>:
///   • Verifies the JWT's RS256 signature against Google's published JWKS
///   • Validates the `iss` claim is one of Google's trusted issuers
///   • Validates the `aud` claim matches our configured Client ID (prevents
///     tokens issued for other apps from being accepted)
///   • Validates `exp` — rejects expired tokens
///   • Validates `nbf` — rejects tokens not yet valid
///
/// This means: even if a mobile client sends a forged or stolen token from
/// another app, it will be rejected because the audience won't match.
/// </summary>
public sealed class GoogleAuthService : IGoogleAuthService
{
    private readonly IConfiguration              _config;
    private readonly ILogger<GoogleAuthService>  _logger;

    public GoogleAuthService(
        IConfiguration             config,
        ILogger<GoogleAuthService> logger)
    {
        _config = config;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<GoogleUserInfo> ValidateIdTokenAsync(
        string            idToken,
        CancellationToken ct = default)
    {
        // ── Resolve the expected audience (our Web Client ID) ──────────────
        var clientId = _config["Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            throw new InvalidOperationException(
                "Google:ClientId is not configured. " +
                "Add it to appsettings.Development.json or set the " +
                "GOOGLE__CLIENTID environment variable.");

        // ── Server-side validation via Google's public RSA keys ────────────
        //    ValidateAsync fetches & caches Google's JWKS automatically.
        //    Throws InvalidJwtException on any validation failure.
        var settings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = [clientId],   // C# 12 collection expression
        };

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning(
                "[GoogleAuthService] ID token validation failed: {Reason}",
                ex.Message);

            // Re-throw as UnauthorizedAccessException so the controller can
            // translate it to HTTP 401 without leaking internal exception details.
            throw new UnauthorizedAccessException(
                "The provided Google ID token is invalid or has expired.", ex);
        }

        // ── Defensive: Google guarantees `email_verified` for Gmail accounts ─
        //    Reject unverified emails to prevent account takeover via
        //    unverified address ownership.
        if (payload.EmailVerified != true)
        {
            _logger.LogWarning(
                "[GoogleAuthService] Rejected unverified Google email: {Email}",
                payload.Email);

            throw new UnauthorizedAccessException(
                "Google account email address is not verified.");
        }

        // ── Extract and return verified claims ─────────────────────────────
        var email    = payload.Email
                       ?? throw new InvalidOperationException(
                              "Google ID token is missing the email claim.");

        var fullName = payload.Name
                       ?? payload.GivenName
                       ?? email.Split('@')[0]; // Ultimate fallback: username part

        _logger.LogDebug(
            "[GoogleAuthService] Validated Google token for {Email} (sub={Sub})",
            email, payload.Subject);

        return new GoogleUserInfo(
            GoogleId: payload.Subject,  // Stable across email changes
            Email:    email,
            FullName: fullName);
    }
}
