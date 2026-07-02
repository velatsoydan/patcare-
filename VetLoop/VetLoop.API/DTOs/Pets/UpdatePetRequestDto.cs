namespace VetLoop.API.DTOs.Pets;

/// <summary>
/// Payload for updating an existing pet record (PUT /api/pets/{id}).
/// All fields are updatable — ownership is validated server-side via JWT sub claim.
/// </summary>
public sealed record UpdatePetRequestDto(
    string   Name,
    string   Species,
    string   Breed,
    DateTime DateOfBirth,
    string   Gender,
    decimal  WeightKg,
    string?  BloodType,
    string?  Allergies,
    string?  IoTCollarMacAddress
);
