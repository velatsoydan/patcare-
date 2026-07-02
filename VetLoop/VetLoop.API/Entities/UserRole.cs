namespace VetLoop.API.Entities;

/// <summary>
/// Defines the platform access tier and portal routing logic for each user.
/// Stored as a string in the database for human-readability and migration safety.
/// </summary>
public enum UserRole
{
    PetOwner     = 0,
    FarmOwner    = 1,
    Veterinarian = 2,
    Admin        = 3,
}
