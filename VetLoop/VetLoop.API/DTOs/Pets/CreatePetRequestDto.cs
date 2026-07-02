namespace VetLoop.API.DTOs.Pets;

/// <summary>Payload for creating a new pet record.</summary>
public sealed record CreatePetRequestDto(
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
