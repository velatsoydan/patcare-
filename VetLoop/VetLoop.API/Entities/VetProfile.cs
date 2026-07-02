using VetLoop.API.Entities.Base;

namespace VetLoop.API.Entities;

/// <summary>
/// Extended profile for users whose Role == Veterinarian.
/// One-to-one with User — created on veterinarian onboarding.
/// Holds licensing, specialisation, and availability data
/// required for the AI triage dispatch engine.
/// </summary>
public sealed class VetProfile : BaseEntity
{
    // ── Professional Identity ─────────────────────────────────────────────────
    /// <summary>
    /// Official veterinary license number issued by the regulatory authority
    /// (e.g. Türkiye Veteriner Hekimler Birliği license code).
    /// </summary>
    public string  LicenseNumber         { get; set; } = string.Empty;

    public string  ClinicAddress         { get; set; } = string.Empty;

    /// <summary>e.g. "Small Animals", "Large Animals", "Equine", "Exotic".</summary>
    public string  Specialty             { get; set; } = string.Empty;

    // ── Service Pricing ───────────────────────────────────────────────────────
    /// <summary>
    /// Base consultation fee in Turkish Lira (₺).
    /// Used by the marketplace pricing engine and displayed on the vet card.
    /// </summary>
    public decimal ConsultationFee       { get; set; }

    // ── Availability ──────────────────────────────────────────────────────────
    /// <summary>
    /// When true, the dispatch engine may route urgent (AI-flagged CRITICAL)
    /// cases to this veterinarian outside of normal working hours.
    /// </summary>
    public bool IsAvailableForEmergency  { get; set; } = false;

    // ── Foreign Key (One-to-One with User) ───────────────────────────────────
    public Guid UserId { get; set; }

    // ── Navigation Property ────────────────────────────────────────────────────
    public User User { get; set; } = null!;
}
