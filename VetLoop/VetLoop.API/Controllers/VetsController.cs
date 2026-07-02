using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VetLoop.API.Data;
using VetLoop.API.DTOs.Vets;
using VetLoop.API.Entities;

namespace VetLoop.API.Controllers;

/// <summary>
/// Service-provider endpoint for managing veterinarian extended profiles.
/// Route: /api/vets
/// Restricted to users whose Role == Veterinarian or Admin.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Veterinarian,Admin")]
public sealed class VetsController : ControllerBase
{
    private readonly VetLoopDbContext         _db;
    private readonly ILogger<VetsController>  _logger;

    public VetsController(VetLoopDbContext db, ILogger<VetsController> logger)
    {
        _db     = db;
        _logger = logger;
    }

    private Guid GetCallerUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
               ?? User.FindFirstValue("sub")
               ?? throw new UnauthorizedAccessException("JWT 'sub' claim is missing.");
        return Guid.Parse(sub);
    }

    // ── GET /api/vets/profile ────────────────────────────────────────────────
    /// <summary>
    /// Returns the extended profile for the currently authenticated veterinarian.
    /// Returns 404 if the vet has not yet completed the onboarding wizard.
    /// The mobile client uses this 404 signal to display the Setup Wizard screen.
    /// </summary>
    [HttpGet("profile")]
    [ProducesResponseType(typeof(VetProfileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyProfile(CancellationToken ct)
    {
        var userId = GetCallerUserId();

        var profile = await _db.VetProfiles
            .AsNoTracking()
            .Where(v => v.UserId == userId)
            .Select(v => new VetProfileResponseDto(
                v.Id,
                v.LicenseNumber,
                v.ClinicAddress,
                v.Specialty,
                v.ConsultationFee,
                v.IsAvailableForEmergency,
                v.UserId,
                v.CreatedAt,
                v.UpdatedAt))
            .FirstOrDefaultAsync(ct);

        return profile is null
            ? NotFound(new { error = "Vet profile not found. Please complete the onboarding setup." })
            : Ok(profile);
    }

    // ── POST /api/vets/profile ───────────────────────────────────────────────
    /// <summary>
    /// Upserts the veterinarian's extended profile.
    /// • First call: creates a new VetProfile record → 201 Created.
    /// • Subsequent calls: updates the existing profile → 200 OK.
    ///
    /// LicenseNumber uniqueness is validated against other users' profiles.
    /// A vet may update their own license number to itself without conflict.
    /// </summary>
    [HttpPost("profile")]
    [ProducesResponseType(typeof(VetProfileResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(VetProfileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpsertProfile(
        [FromBody] CreateVetProfileRequestDto dto,
        CancellationToken ct)
    {
        var userId = GetCallerUserId();

        // ── Uniqueness guard: ensure no other vet holds this license number ──
        var licenseConflict = await _db.VetProfiles
            .AnyAsync(v => v.LicenseNumber == dto.LicenseNumber.Trim()
                        && v.UserId != userId, ct);

        if (licenseConflict)
            return Conflict(new { error = $"License number '{dto.LicenseNumber}' is already registered to another veterinarian." });

        // ── Try to find an existing profile (tracked, so EF detects changes) ─
        var existing = await _db.VetProfiles
            .FirstOrDefaultAsync(v => v.UserId == userId, ct);

        VetProfileResponseDto responseDto;

        if (existing is null)
        {
            // ── CREATE ────────────────────────────────────────────────────────
            var profile = new VetProfile
            {
                LicenseNumber          = dto.LicenseNumber.Trim(),
                ClinicAddress          = dto.ClinicAddress.Trim(),
                Specialty              = dto.Specialty.Trim(),
                ConsultationFee        = dto.ConsultationFee,
                IsAvailableForEmergency = dto.IsAvailableForEmergency,
                UserId                 = userId,
            };

            _db.VetProfiles.Add(profile);
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation(
                "VetProfile created for user {UserId} (License: {License})",
                userId, profile.LicenseNumber);

            responseDto = new VetProfileResponseDto(
                profile.Id, profile.LicenseNumber, profile.ClinicAddress,
                profile.Specialty, profile.ConsultationFee,
                profile.IsAvailableForEmergency, profile.UserId,
                profile.CreatedAt, profile.UpdatedAt);

            return CreatedAtAction(nameof(GetMyProfile), responseDto);
        }
        else
        {
            // ── UPDATE ────────────────────────────────────────────────────────
            existing.LicenseNumber           = dto.LicenseNumber.Trim();
            existing.ClinicAddress           = dto.ClinicAddress.Trim();
            existing.Specialty               = dto.Specialty.Trim();
            existing.ConsultationFee         = dto.ConsultationFee;
            existing.IsAvailableForEmergency = dto.IsAvailableForEmergency;

            await _db.SaveChangesAsync(ct);  // StampUpdatedAt fires here

            _logger.LogInformation(
                "VetProfile updated for user {UserId} (License: {License})",
                userId, existing.LicenseNumber);

            responseDto = new VetProfileResponseDto(
                existing.Id, existing.LicenseNumber, existing.ClinicAddress,
                existing.Specialty, existing.ConsultationFee,
                existing.IsAvailableForEmergency, existing.UserId,
                existing.CreatedAt, existing.UpdatedAt);

            return Ok(responseDto);
        }
    }
}
