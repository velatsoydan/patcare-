namespace VetLoop.API.Services;

// ─────────────────────────────────────────────────────────────────────────────
//  Result type returned by a successful Google token validation.
//  Immutable record — all fields come directly from Google's cryptographically
//  verified JWT payload, never from the untrusted client body.
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>
/// Verified identity claims extracted from a Google ID Token.
/// Populated only after <see cref="IGoogleAuthService.ValidateIdTokenAsync"/> succeeds.
/// </summary>
public sealed record GoogleUserInfo(
    /// <summary>Google's stable, unique subject identifier (the `sub` claim).</summary>
    string GoogleId,
    /// <summary>Verified email address from Google's identity token.</summary>
    string Email,
    /// <summary>Display name from Google profile. Falls back to email prefix if absent.</summary>
    string FullName
);

// ─────────────────────────────────────────────────────────────────────────────
//  Service interface
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>
/// Validates a Google-issued ID Token and extracts verified user identity claims.
/// Abstracted behind an interface for testability and future provider extension
/// (e.g., Microsoft Entra ID can add its own implementation).
/// </summary>
public interface IGoogleAuthService
{
    /// <summary>
    /// Validates the <paramref name="idToken"/> against Google's public keys and
    /// the configured audience (Client ID).
    /// </summary>
    /// <param name="idToken">Raw Google ID Token JWT string received from the mobile client.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Verified <see cref="GoogleUserInfo"/> on success.</returns>
    /// <exception cref="UnauthorizedAccessException">
    /// Thrown when the token is invalid, expired, tampered, or issued for a
    /// different audience. The controller converts this to HTTP 401.
    /// </exception>
    Task<GoogleUserInfo> ValidateIdTokenAsync(string idToken, CancellationToken ct = default);
}
