namespace VetLoop.API.DTOs.Appointments;

/// <summary>
/// Inbound DTO for booking a new veterinary appointment.
/// Sent by the pet owner from the React Native client.
/// </summary>
public sealed record CreateAppointmentRequestDto(
    /// <summary>The pet this appointment is for. Must belong to the authenticated owner.</summary>
    Guid     PetId,

    /// <summary>The veterinarian's VetProfile ID.</summary>
    Guid     VetProfileId,

    /// <summary>Requested appointment date-time (UTC).</summary>
    DateTime ScheduledAt,

    /// <summary>Estimated session duration in minutes. Defaults to 30.</summary>
    int      DurationMinutes,

    /// <summary>Reason for visit / symptom description.</summary>
    string?  Reason
);
