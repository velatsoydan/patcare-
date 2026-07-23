using VetLoop.API.Entities.Base;

namespace VetLoop.API.Entities;

/// <summary>
/// B2C domain entity representing a companion animal.
/// Extended with clinical data fields (weight, blood type, allergies)
/// and an IoT integration hook for real-time health collar telemetry.
/// </summary>
public sealed class Pet : BaseEntity
{
    // ── Identity ─────────────────────────────────────────────────────────────
    public string  Name        { get; set; } = string.Empty;
    public string  Species     { get; set; } = string.Empty;   // Dog, Cat, Bird …
    public string  Breed       { get; set; } = string.Empty;

    // ── Clinical Data ─────────────────────────────────────────────────────────
    public DateTime DateOfBirth { get; set; }
    public string   Gender      { get; set; } = string.Empty;  // Male | Female | Unknown
    public decimal  WeightKg    { get; set; }
    public string?  BloodType   { get; set; }
    /// <summary>
    /// Comma-separated allergy list stored as plain text for simplicity.
    /// Can be normalised to a junction table in a future iteration.
    /// </summary>
    public string?  Allergies   { get; set; }

    // ── IoT Integration ───────────────────────────────────────────────────────
    /// <summary>
    /// MAC address of the paired smart health collar (e.g. "AA:BB:CC:DD:EE:FF").
    /// Null when no collar is registered for this pet.
    /// </summary>
    public string? IoTCollarMacAddress { get; set; }

    // ── Foreign Key ───────────────────────────────────────────────────────────
    public Guid OwnerId { get; set; }

    // ── Navigation Properties ─────────────────────────────────────────────────
    public User Owner { get; set; } = null!;

    /// <summary>All veterinary appointments booked for this pet.</summary>
    public ICollection<Appointment> Appointments { get; set; } = [];
}
