namespace VetLoop.API.DTOs.Pets;

/// <summary>
/// Outbound DTO for a single Pet record.
/// Mirrors the IPet TypeScript interface on the React Native client.
/// </summary>
public sealed record PetResponseDto(
    Guid     Id,
    string   Name,
    string   Species,
    string   Breed,
    DateTime DateOfBirth,
    string   Gender,
    decimal  WeightKg,
    string?  BloodType,
    string?  Allergies,
    string?  IoTCollarMacAddress,
    Guid     OwnerId,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
