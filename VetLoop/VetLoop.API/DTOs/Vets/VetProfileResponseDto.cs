namespace VetLoop.API.DTOs.Vets;

/// <summary>
/// Outbound DTO for a VetProfile record.
/// Mirrors the IVetProfile TypeScript interface on the React Native client.
/// </summary>
public sealed record VetProfileResponseDto(
    Guid     Id,
    string   LicenseNumber,
    string   ClinicAddress,
    string   Specialty,
    decimal  ConsultationFee,
    bool     IsAvailableForEmergency,
    Guid     UserId,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
