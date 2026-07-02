namespace VetLoop.API.DTOs.Auth;

/// <summary>Payload sent by the client to initiate a login session.</summary>
public sealed record LoginRequestDto(
    string Email,
    string Password
);
