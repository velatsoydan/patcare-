using VetLoop.API.Entities.Base;

namespace VetLoop.API.Entities;

/// <summary>
/// Core scheduling entity linking a Pet (owner side) to a VetProfile (provider side).
///
/// Relationship map:
///   Pet        (1) ──── (N) Appointment   [FK: PetId]
///   VetProfile (1) ──── (N) Appointment   [FK: VetProfileId]
///
/// Status lifecycle is modelled by the AppointmentStatus enum.
/// The entity inherits soft-delete, audit timestamps and UUID PK from BaseEntity.
/// </summary>
public sealed class Appointment : BaseEntity
{
    // ── Foreign Keys ──────────────────────────────────────────────────────────
    /// <summary>The companion animal this appointment is for.</summary>
    public Guid PetId { get; set; }

    /// <summary>The veterinarian accepting/providing the service.</summary>
    public Guid VetProfileId { get; set; }

    // ── Scheduling ────────────────────────────────────────────────────────────
    /// <summary>Requested / confirmed appointment date-time (UTC).</summary>
    public DateTime ScheduledAt { get; set; }

    /// <summary>
    /// Estimated session duration in minutes.
    /// Defaults to 30. Used by the calendar availability engine.
    /// </summary>
    public int DurationMinutes { get; set; } = 30;

    // ── Status ────────────────────────────────────────────────────────────────
    /// <summary>Current lifecycle state. Stored as string in DB.</summary>
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;

    // ── Clinical Context ──────────────────────────────────────────────────────
    /// <summary>Owner-provided description of symptoms or reason for visit.</summary>
    public string? Reason { get; set; }

    /// <summary>Veterinarian's post-visit notes (filled after completion).</summary>
    public string? VetNotes { get; set; }

    // ── Billing ───────────────────────────────────────────────────────────────
    /// <summary>
    /// Final charged fee in Turkish Lira (₺).
    /// Null until appointment is Completed and invoiced.
    /// Defaults to VetProfile.ConsultationFee at booking time.
    /// </summary>
    public decimal? FinalFee { get; set; }

    // ── Navigation Properties ─────────────────────────────────────────────────
    public Pet        Pet        { get; set; } = null!;
    public VetProfile VetProfile { get; set; } = null!;
}
