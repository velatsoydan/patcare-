namespace VetLoop.API.DTOs.Vets;

/// <summary>
/// Payload for creating or updating a veterinarian's extended profile (POST /api/vets/profile).
/// Acts as an upsert — only users with Role == Veterinarian may access this endpoint.
/// </summary>
public sealed record CreateVetProfileRequestDto(
    string  LicenseNumber,
    string  ClinicAddress,
    string  Specialty,
    decimal ConsultationFee,
    bool    IsAvailableForEmergency
);
