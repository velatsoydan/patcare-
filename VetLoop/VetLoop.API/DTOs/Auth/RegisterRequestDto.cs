using VetLoop.API.Entities;

namespace VetLoop.API.DTOs.Auth;

/// <summary>Payload sent by the client to create a new platform account.</summary>
public sealed record RegisterRequestDto(
    string   FullName,
    string   Email,
    string   Password,
    string?  PhoneNumber,
    UserRole Role       // Client specifies the desired role at registration
);
