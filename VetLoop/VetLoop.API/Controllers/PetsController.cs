using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VetLoop.API.Data;
using VetLoop.API.DTOs.Pets;
using VetLoop.API.Entities;

namespace VetLoop.API.Controllers;

/// <summary>
/// B2C endpoint for managing companion animal records.
/// All write operations are scoped to the authenticated user's OwnerId.
/// Route: /api/pets
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize] // All endpoints require a valid JWT
public sealed class PetsController : ControllerBase
{
    private readonly VetLoopDbContext _db;
    private readonly ILogger<PetsController> _logger;

    public PetsController(VetLoopDbContext db, ILogger<PetsController> logger)
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

    // ── GET /api/pets ───────────────────────────────────────────────────────
    /// <summary>Returns all non-deleted pets belonging to the authenticated user.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PetResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyPets(CancellationToken ct)
    {
        var ownerId = GetCallerUserId();

        var pets = await _db.Pets
            .AsNoTracking()
            .Where(p => p.OwnerId == ownerId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PetResponseDto(
                p.Id,
                p.Name,
                p.Species,
                p.Breed,
                p.DateOfBirth,
                p.Gender,
                p.WeightKg,
                p.BloodType,
                p.Allergies,
                p.IoTCollarMacAddress,
                p.OwnerId,
                p.CreatedAt,
                p.UpdatedAt))
            .ToListAsync(ct);

        return Ok(pets);
    }

    // ── GET /api/pets/{id} ──────────────────────────────────────────────────
    /// <summary>Returns a single pet — owner-scoped for security.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PetResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPetById(Guid id, CancellationToken ct)
    {
        var ownerId = GetCallerUserId();

        var pet = await _db.Pets
            .AsNoTracking()
            .Where(p => p.Id == id && p.OwnerId == ownerId)
            .Select(p => new PetResponseDto(
                p.Id,
                p.Name,
                p.Species,
                p.Breed,
                p.DateOfBirth,
                p.Gender,
                p.WeightKg,
                p.BloodType,
                p.Allergies,
                p.IoTCollarMacAddress,
                p.OwnerId,
                p.CreatedAt,
                p.UpdatedAt))
            .FirstOrDefaultAsync(ct);

        return pet is null
            ? NotFound(new { error = $"Pet with ID '{id}' not found." })
            : Ok(pet);
    }

    // ── POST /api/pets ──────────────────────────────────────────────────────
    /// <summary>Registers a new pet for the authenticated owner.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(PetResponseDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreatePet(
        [FromBody] CreatePetRequestDto dto,
        CancellationToken ct)
    {
        var ownerId = GetCallerUserId();

        var pet = new Pet
        {
            Name                = dto.Name.Trim(),
            Species             = dto.Species.Trim(),
            Breed               = dto.Breed.Trim(),
            DateOfBirth         = dto.DateOfBirth,
            Gender              = dto.Gender.Trim(),
            WeightKg            = dto.WeightKg,
            BloodType           = dto.BloodType?.Trim(),
            Allergies           = dto.Allergies?.Trim(),
            IoTCollarMacAddress = dto.IoTCollarMacAddress?.Trim().ToUpperInvariant(),
            OwnerId             = ownerId,
        };

        _db.Pets.Add(pet);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Pet '{Name}' created for owner {OwnerId}", pet.Name, ownerId);

        var responseDto = new PetResponseDto(
            pet.Id, pet.Name, pet.Species, pet.Breed,
            pet.DateOfBirth, pet.Gender, pet.WeightKg,
            pet.BloodType, pet.Allergies, pet.IoTCollarMacAddress,
            pet.OwnerId, pet.CreatedAt, pet.UpdatedAt);

        return CreatedAtAction(nameof(GetPetById), new { id = pet.Id }, responseDto);
    }

    // ── PUT /api/pets/{id} ──────────────────────────────────────────────────
    /// <summary>
    /// Updates an existing pet's clinical and identity details.
    /// Ownership-scoped — the pet must belong to the authenticated user.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(PetResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePet(
        Guid id,
        [FromBody] UpdatePetRequestDto dto,
        CancellationToken ct)
    {
        var ownerId = GetCallerUserId();

        // Fetch a tracked entity — no AsNoTracking so EF can detect the modification.
        var pet = await _db.Pets
            .FirstOrDefaultAsync(p => p.Id == id && p.OwnerId == ownerId, ct);

        if (pet is null)
            return NotFound(new { error = $"Pet with ID '{id}' not found." });

        pet.Name                = dto.Name.Trim();
        pet.Species             = dto.Species.Trim();
        pet.Breed               = dto.Breed.Trim();
        pet.DateOfBirth         = dto.DateOfBirth;
        pet.Gender              = dto.Gender.Trim();
        pet.WeightKg            = dto.WeightKg;
        pet.BloodType           = dto.BloodType?.Trim();
        pet.Allergies           = dto.Allergies?.Trim();
        pet.IoTCollarMacAddress = dto.IoTCollarMacAddress?.Trim().ToUpperInvariant();

        await _db.SaveChangesAsync(ct);  // StampUpdatedAt fires automatically here

        _logger.LogInformation("Pet '{Name}' (ID {PetId}) updated by owner {OwnerId}", pet.Name, pet.Id, ownerId);

        var responseDto = new PetResponseDto(
            pet.Id, pet.Name, pet.Species, pet.Breed,
            pet.DateOfBirth, pet.Gender, pet.WeightKg,
            pet.BloodType, pet.Allergies, pet.IoTCollarMacAddress,
            pet.OwnerId, pet.CreatedAt, pet.UpdatedAt);

        return Ok(responseDto);
    }

    // ── DELETE /api/pets/{id} (Soft Delete) ─────────────────────────────────
    /// <summary>
    /// Soft-deletes a pet — sets IsDeleted = true.
    /// The record remains in the database for audit and IoT history purposes.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SoftDeletePet(Guid id, CancellationToken ct)
    {
        var ownerId = GetCallerUserId();

        var rowsAffected = await _db.Pets
            .Where(p => p.Id == id && p.OwnerId == ownerId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.IsDeleted,  true)
                .SetProperty(p => p.UpdatedAt,  DateTime.UtcNow),
            ct);

        return rowsAffected == 0
            ? NotFound(new { error = $"Pet with ID '{id}' not found." })
            : NoContent();
    }
}
