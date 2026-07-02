using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VetLoop.API.Data;
using VetLoop.API.DTOs.Farms;
using VetLoop.API.Entities;

namespace VetLoop.API.Controllers;

/// <summary>
/// B2B endpoint for managing agricultural farm records.
/// Scoped to the authenticated FarmOwner user.
/// Route: /api/farms
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "FarmOwner,Admin")]
public sealed class FarmsController : ControllerBase
{
    private readonly VetLoopDbContext _db;
    private readonly ILogger<FarmsController> _logger;

    public FarmsController(VetLoopDbContext db, ILogger<FarmsController> logger)
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

    // ── GET /api/farms ──────────────────────────────────────────────────────
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<FarmResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyFarms(CancellationToken ct)
    {
        var ownerId = GetCallerUserId();

        var farms = await _db.Farms
            .AsNoTracking()
            .Where(f => f.OwnerId == ownerId)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new FarmResponseDto(
                f.Id,
                f.Name,
                f.Location,
                f.LivestockCount,
                f.FarmType,
                f.TaxNumber,
                f.ContactPersonName,
                f.PrimaryGatewayId,
                f.OwnerId,
                f.CreatedAt,
                f.UpdatedAt))
            .ToListAsync(ct);

        return Ok(farms);
    }

    // ── GET /api/farms/{id} ─────────────────────────────────────────────────
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(FarmResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFarmById(Guid id, CancellationToken ct)
    {
        var ownerId = GetCallerUserId();

        var farm = await _db.Farms
            .AsNoTracking()
            .Where(f => f.Id == id && f.OwnerId == ownerId)
            .Select(f => new FarmResponseDto(
                f.Id, f.Name, f.Location, f.LivestockCount, f.FarmType,
                f.TaxNumber, f.ContactPersonName, f.PrimaryGatewayId,
                f.OwnerId, f.CreatedAt, f.UpdatedAt))
            .FirstOrDefaultAsync(ct);

        return farm is null
            ? NotFound(new { error = $"Farm with ID '{id}' not found." })
            : Ok(farm);
    }

    // ── POST /api/farms ─────────────────────────────────────────────────────
    /// <summary>Registers a new farm for the authenticated farm owner.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(FarmResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateFarm(
        [FromBody] CreateFarmRequestDto dto,
        CancellationToken ct)
    {
        var ownerId = GetCallerUserId();

        var farm = new Farm
        {
            Name              = dto.Name.Trim(),
            Location          = dto.Location.Trim(),
            LivestockCount    = dto.LivestockCount,
            FarmType          = dto.FarmType.Trim(),
            TaxNumber         = dto.TaxNumber?.Trim(),
            ContactPersonName = dto.ContactPersonName?.Trim(),
            PrimaryGatewayId  = dto.PrimaryGatewayId?.Trim(),
            OwnerId           = ownerId,
        };

        _db.Farms.Add(farm);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Farm '{Name}' created for owner {OwnerId}", farm.Name, ownerId);

        var responseDto = new FarmResponseDto(
            farm.Id, farm.Name, farm.Location, farm.LivestockCount,
            farm.FarmType, farm.TaxNumber, farm.ContactPersonName,
            farm.PrimaryGatewayId, farm.OwnerId, farm.CreatedAt, farm.UpdatedAt);

        return CreatedAtAction(nameof(GetFarmById), new { id = farm.Id }, responseDto);
    }

    // ── DELETE /api/farms/{id} (Soft Delete) ────────────────────────────────
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SoftDeleteFarm(Guid id, CancellationToken ct)
    {
        var ownerId = GetCallerUserId();

        var rowsAffected = await _db.Farms
            .Where(f => f.Id == id && f.OwnerId == ownerId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(f => f.IsDeleted, true)
                .SetProperty(f => f.UpdatedAt, DateTime.UtcNow),
            ct);

        return rowsAffected == 0
            ? NotFound(new { error = $"Farm with ID '{id}' not found." })
            : NoContent();
    }
}
