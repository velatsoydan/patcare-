namespace VetLoop.API.DTOs.Auth;

/// <summary>
/// Unified auth response returned after successful Login or Register.
/// The frontend decodes the JWT to extract role and email for routing decisions.
/// </summary>
public sealed record AuthResponseDto(
    string Token,       // Signed JWT — contains role, email, sub claims
    string Email,
    string FullName,
    string Role,        // Plaintext role string for immediate UI consumption
    DateTime ExpiresAt  // UTC expiry timestamp for client-side countdown
);
