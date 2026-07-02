namespace VetLoop.API.DTOs.Auth;

/// <summary>
/// Payload sent by the mobile client to POST /api/auth/google.
/// Contains the raw Google ID Token obtained from the OAuth 2.0 flow.
/// The backend re-validates this token server-side — the client is never trusted
/// to self-report identity.
/// </summary>
public sealed record GoogleLoginRequestDto(
    /// <summary>
    /// The Google-signed ID Token (JWT) obtained from the mobile OAuth flow.
    /// Validated server-side via <c>GoogleJsonWebSignature.ValidateAsync</c>.
    /// </summary>
    string IdToken
);
