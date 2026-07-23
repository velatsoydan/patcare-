using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VetLoop.API.Data;
using VetLoop.API.DTOs.Appointments;
using VetLoop.API.Entities;

namespace VetLoop.API.Controllers;

/// <summary>
/// Manages the full appointment lifecycle between pet owners and veterinarians.
///
/// Authorization model:
///   • PetOwners  — create appointments, view their own, cancel their own
///   • Vets       — view incoming appointments, update status (confirm/complete/cancel)
///   • Both roles — view a specific appointment they are party to
///
/// Route: /api/appointments
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class AppointmentsController : ControllerBase
{
    private readonly VetLoopDbContext              _db;
    private readonly ILogger<AppointmentsController> _logger;

    public AppointmentsController(VetLoopDbContext db, ILogger<AppointmentsController> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── Helper: extract caller's UserId from JWT ──────────────────────────
    private Guid GetCallerUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
               ?? User.FindFirstValue("sub")
               ?? throw new UnauthorizedAccessException("JWT 'sub' claim is missing.");
        return Guid.Parse(sub);
    }

    // ── Helper: project Appointment → AppointmentResponseDto ─────────────
    // Static expression prevents repeated inline lambda allocation.
    private static AppointmentResponseDto ToDto(Appointment a) =>
        new(a.Id,
            a.PetId,
            a.Pet.Name,
            a.VetProfileId,
            a.VetProfile.User.FullName,
            a.ScheduledAt,
            a.DurationMinutes,
            a.Status,
            a.Reason,
            a.VetNotes,
            a.FinalFee,
            a.CreatedAt,
            a.UpdatedAt);

    // ══════════════════════════════════════════════════════════════════════
    //  GET /api/appointments/my
    //  Returns all appointments for the authenticated pet owner.
    // ══════════════════════════════════════════════════════════════════════
    /// <summary>Returns all non-cancelled appointments belonging to the authenticated owner's pets.</summary>
    [HttpGet("my")]
    [ProducesResponseType(typeof(IEnumerable<AppointmentResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyAppointments(
        [FromQuery] AppointmentStatus? status,
        CancellationToken ct)
    {
        var userId = GetCallerUserId();

        // Appointments are owned indirectly: User → Pet → Appointment
        var query = _db.Appointments
            .AsNoTracking()
            .Include(a => a.Pet)
            .Include(a => a.VetProfile).ThenInclude(v => v.User)
            .Where(a => a.Pet.OwnerId == userId);

        if (status.HasValue)
            query = query.Where(a => a.Status == status.Value);

        var appointments = await query
            .OrderByDescending(a => a.ScheduledAt)
            .Select(a => ToDto(a))
            .ToListAsync(ct);

        return Ok(appointments);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  GET /api/appointments/vet
    //  Returns all incoming appointments for the authenticated veterinarian.
    // ══════════════════════════════════════════════════════════════════════
    /// <summary>Returns appointments assigned to the authenticated veterinarian.</summary>
    [HttpGet("vet")]
    [ProducesResponseType(typeof(IEnumerable<AppointmentResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetVetAppointments(
        [FromQuery] AppointmentStatus? status,
        CancellationToken ct)
    {
        var userId = GetCallerUserId();

        // Verify the caller is actually a Veterinarian and has a VetProfile
        var vetProfile = await _db.VetProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.UserId == userId, ct);

        if (vetProfile is null)
            return Forbid(); // 403 — not a registered vet

        var query = _db.Appointments
            .AsNoTracking()
            .Include(a => a.Pet)
            .Include(a => a.VetProfile).ThenInclude(v => v.User)
            .Where(a => a.VetProfileId == vetProfile.Id);

        if (status.HasValue)
            query = query.Where(a => a.Status == status.Value);

        var appointments = await query
            .OrderByDescending(a => a.ScheduledAt)
            .Select(a => ToDto(a))
            .ToListAsync(ct);

        return Ok(appointments);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  GET /api/appointments/{id}
    //  Returns a single appointment — caller must be the owner or the vet.
    // ══════════════════════════════════════════════════════════════════════
    /// <summary>Returns a single appointment. Accessible by the pet owner or the assigned vet.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AppointmentResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAppointmentById(Guid id, CancellationToken ct)
    {
        var userId = GetCallerUserId();

        var appointment = await _db.Appointments
            .AsNoTracking()
            .Include(a => a.Pet)
            .Include(a => a.VetProfile).ThenInclude(v => v.User)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (appointment is null)
            return NotFound(new { error = $"Appointment '{id}' not found." });

        // Security: only the pet owner or the assigned vet may view
        var isOwner = appointment.Pet.OwnerId    == userId;
        var isVet   = appointment.VetProfile.UserId == userId;

        if (!isOwner && !isVet)
            return NotFound(new { error = $"Appointment '{id}' not found." }); // don't leak existence

        return Ok(ToDto(appointment));
    }

    // ══════════════════════════════════════════════════════════════════════
    //  POST /api/appointments
    //  Pet owner books a new appointment.
    // ══════════════════════════════════════════════════════════════════════
    /// <summary>
    /// Creates a new appointment request.
    /// The pet must belong to the authenticated user.
    /// The appointment starts in <c>Pending</c> status awaiting vet confirmation.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(AppointmentResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateAppointment(
        [FromBody] CreateAppointmentRequestDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
        {
            var modelErrors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? e.Exception?.Message : e.ErrorMessage)
                .Where(e => !string.IsNullOrEmpty(e))
                .ToList();

            _logger.LogWarning("[CreateAppointment] ModelState validation failed: {Errors}", string.Join(" | ", modelErrors));
            return BadRequest(new { error = "ValidationFailed", message = string.Join(" | ", modelErrors), errors = modelErrors });
        }

        _logger.LogInformation(
            "[CreateAppointment] Received request for PetId={PetId}, VetProfileId={VetProfileId}, ScheduledAt={ScheduledAt} (UTC)",
            dto.PetId, dto.VetProfileId, dto.ScheduledAt);

        var userId = GetCallerUserId();

        // 1. Validate pet ownership
        var pet = await _db.Pets
            .FirstOrDefaultAsync(p => p.Id == dto.PetId && p.OwnerId == userId, ct);

        if (pet is null)
        {
            _logger.LogWarning("[CreateAppointment] Pet '{PetId}' not found or owner mismatch for user '{UserId}'", dto.PetId, userId);
            return NotFound(new { error = $"Pet '{dto.PetId}' not found or does not belong to you." });
        }

        // 2. Validate vet profile exists
        var vetProfile = await _db.VetProfiles
            .Include(v => v.User)
            .FirstOrDefaultAsync(v => v.Id == dto.VetProfileId, ct);

        if (vetProfile is null)
        {
            _logger.LogWarning("[CreateAppointment] VetProfile '{VetProfileId}' not found", dto.VetProfileId);
            return NotFound(new { error = $"VetProfile '{dto.VetProfileId}' not found." });
        }

        // 3. Validate scheduled time is in the future
        if (dto.ScheduledAt <= DateTime.UtcNow)
        {
            _logger.LogWarning("[CreateAppointment] ScheduledAt ({ScheduledAt}) is in the past compared to UtcNow ({UtcNow})", dto.ScheduledAt, DateTime.UtcNow);
            return BadRequest(new { error = "ScheduledAt must be a future date-time." });
        }

        // 4. Create appointment
        var appointment = new Appointment
        {
            PetId           = dto.PetId,
            VetProfileId    = dto.VetProfileId,
            ScheduledAt     = dto.ScheduledAt,
            DurationMinutes = dto.DurationMinutes > 0 ? dto.DurationMinutes : 30,
            Reason          = dto.Reason?.Trim(),
            Status          = AppointmentStatus.Pending,
        };

        _db.Appointments.Add(appointment);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Appointment {AppId} created: Pet {PetId} → Vet {VetId} on {Date}",
            appointment.Id, appointment.PetId, appointment.VetProfileId, appointment.ScheduledAt);

        // Re-attach navigation data for response DTO
        appointment.Pet        = pet;
        appointment.VetProfile = vetProfile;

        return CreatedAtAction(nameof(GetAppointmentById), new { id = appointment.Id }, ToDto(appointment));
    }

    // ══════════════════════════════════════════════════════════════════════
    //  PUT /api/appointments/{id}/status
    //  Veterinarian updates appointment status.
    // ══════════════════════════════════════════════════════════════════════
    /// <summary>
    /// Updates the lifecycle status of an appointment.
    /// Only the assigned veterinarian may call this endpoint.
    /// </summary>
    [HttpPut("{id:guid}/status")]
    [ProducesResponseType(typeof(AppointmentResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAppointmentStatus(
        Guid id,
        [FromBody] UpdateAppointmentStatusDto dto,
        CancellationToken ct)
    {
        var userId = GetCallerUserId();

        var appointment = await _db.Appointments
            .Include(a => a.Pet)
            .Include(a => a.VetProfile).ThenInclude(v => v.User)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (appointment is null)
            return NotFound(new { error = $"Appointment '{id}' not found." });

        // Only the assigned vet may update status
        if (appointment.VetProfile.UserId != userId)
            return NotFound(new { error = $"Appointment '{id}' not found." });

        // Business rule: cannot transition out of terminal states
        if (appointment.Status is AppointmentStatus.Completed or AppointmentStatus.Cancelled)
            return BadRequest(new
            {
                error = $"Cannot change status of a '{appointment.Status}' appointment."
            });

        // Business rule: VetNotes required on Completion
        if (dto.NewStatus == AppointmentStatus.Completed && string.IsNullOrWhiteSpace(dto.VetNotes))
            return BadRequest(new { error = "VetNotes are required when completing an appointment." });

        appointment.Status   = dto.NewStatus;
        appointment.VetNotes = dto.VetNotes?.Trim() ?? appointment.VetNotes;
        appointment.FinalFee = dto.FinalFee         ?? appointment.FinalFee;

        await _db.SaveChangesAsync(ct); // StampUpdatedAt fires automatically

        _logger.LogInformation(
            "Appointment {AppId} status → {Status} by Vet {UserId}",
            id, dto.NewStatus, userId);

        return Ok(ToDto(appointment));
    }

    // ══════════════════════════════════════════════════════════════════════
    //  DELETE /api/appointments/{id}
    //  Soft-cancels an appointment (owner or vet).
    // ══════════════════════════════════════════════════════════════════════
    /// <summary>
    /// Cancels an appointment (soft-delete via status change).
    /// Accessible by the pet owner or the assigned vet.
    /// Cannot cancel an already Completed appointment.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelAppointment(Guid id, CancellationToken ct)
    {
        var userId = GetCallerUserId();

        var appointment = await _db.Appointments
            .Include(a => a.Pet)
            .Include(a => a.VetProfile)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (appointment is null)
            return NotFound(new { error = $"Appointment '{id}' not found." });

        var isOwner = appointment.Pet.OwnerId       == userId;
        var isVet   = appointment.VetProfile.UserId == userId;

        if (!isOwner && !isVet)
            return NotFound(new { error = $"Appointment '{id}' not found." });

        if (appointment.Status == AppointmentStatus.Completed)
            return BadRequest(new { error = "Cannot cancel an already completed appointment." });

        if (appointment.Status == AppointmentStatus.Cancelled)
            return BadRequest(new { error = "Appointment is already cancelled." });

        appointment.Status    = AppointmentStatus.Cancelled;
        appointment.IsDeleted = true; // soft-delete — excluded from future queries
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Appointment {AppId} cancelled by user {UserId}", id, userId);

        return NoContent();
    }
}
