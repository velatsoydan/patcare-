using VetLoop.API.Entities;

namespace VetLoop.API.Services;

/// <summary>
/// Contract for generating signed JWT tokens.
/// Abstracted behind an interface for testability and future key-rotation support.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Generates a signed JWT for the given user.
    /// </summary>
    /// <param name="user">The authenticated user — claims sourced from this object.</param>
    /// <returns>
    /// A tuple containing the raw token string and its UTC expiry timestamp.
    /// </returns>
    (string Token, DateTime ExpiresAt) GenerateToken(User user);
}
