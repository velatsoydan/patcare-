namespace VetLoop.API.Entities;

/// <summary>
/// Lifecycle state machine for a veterinary appointment.
/// Stored as a string in the database for human-readability and migration safety.
///
/// Transitions:
///   Pending → Confirmed  (vet accepts)
///   Pending → Cancelled  (owner or vet cancels)
///   Confirmed → Completed (visit done)
///   Confirmed → Cancelled (late cancellation)
/// </summary>
public enum AppointmentStatus
{
    Pending   = 0,
    Confirmed = 1,
    Completed = 2,
    Cancelled = 3,
}
