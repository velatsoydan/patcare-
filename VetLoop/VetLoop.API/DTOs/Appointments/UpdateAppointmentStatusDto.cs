using VetLoop.API.Entities;

namespace VetLoop.API.DTOs.Appointments;

/// <summary>
/// Inbound DTO for changing an appointment's lifecycle state.
/// Only veterinarians may call the status-update endpoint.
/// </summary>
public sealed record UpdateAppointmentStatusDto(
    /// <summary>The new status to transition to.</summary>
    AppointmentStatus NewStatus,

    /// <summary>
    /// Veterinarian's clinical notes.
    /// Required when transitioning to Completed.
    /// Optional for other transitions.
    /// </summary>
    string? VetNotes,

    /// <summary>
    /// Final charged fee in ₺.
    /// Should be provided when transitioning to Completed.
    /// </summary>
    decimal? FinalFee
);
