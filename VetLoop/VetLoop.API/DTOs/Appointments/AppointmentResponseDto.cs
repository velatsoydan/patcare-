using VetLoop.API.Entities;

namespace VetLoop.API.DTOs.Appointments;

/// <summary>
/// Outbound DTO for a single Appointment record.
/// Includes denormalized pet name and vet name for display convenience —
/// avoids extra round-trips from the mobile client.
/// </summary>
public sealed record AppointmentResponseDto(
    Guid              Id,
    Guid              PetId,
    string            PetName,
    Guid              VetProfileId,
    string            VetFullName,
    DateTime          ScheduledAt,
    int               DurationMinutes,
    AppointmentStatus Status,
    string?           Reason,
    string?           VetNotes,
    decimal?          FinalFee,
    DateTime          CreatedAt,
    DateTime?         UpdatedAt
);
