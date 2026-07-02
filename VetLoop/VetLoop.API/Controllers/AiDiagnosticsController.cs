using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VetLoop.API.Data;
using VetLoop.API.DTOs.Ai;
using VetLoop.API.Services;

namespace VetLoop.API.Controllers;

/// <summary>
/// Service controller for AI symptom analysis and triage recommendations.
/// </summary>
[ApiController]
[Route("api/ai")]
[Authorize]
public sealed class AiDiagnosticsController : ControllerBase
{
    private readonly VetLoopDbContext _db;
    private readonly IAiService _aiService;
    private readonly ILogger<AiDiagnosticsController> _logger;

    public AiDiagnosticsController(
        VetLoopDbContext db,
        IAiService aiService,
        ILogger<AiDiagnosticsController> logger)
    {
        _db = db;
        _aiService = aiService;
        _logger = logger;
    }

    private Guid GetCallerUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
               ?? User.FindFirstValue("sub")
               ?? throw new UnauthorizedAccessException("JWT 'sub' claim is missing.");
        return Guid.Parse(sub);
    }

    // ── POST /api/ai/diagnose ────────────────────────────────────────────────
    /// <summary>
    /// Evaluates animal symptoms using artificial intelligence.
    /// Access is ownership-scoped: the selected pet must belong to the caller.
    /// </summary>
    [HttpPost("diagnose")]
    [ProducesResponseType(typeof(DiagnosticResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DiagnoseSymptoms(
        [FromBody] DiagnosticRequestDto request,
        CancellationToken ct)
    {
        var ownerId = GetCallerUserId();

        // 1. Ownership & existence check for the requested Pet
        var pet = await _db.Pets
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.PetId && p.OwnerId == ownerId, ct);

        if (pet is null)
        {
            return NotFound(new { error = $"Pet with ID '{request.PetId}' was not found or access is denied." });
        }

        if (string.IsNullOrWhiteSpace(request.Symptoms))
        {
            return BadRequest(new { error = "Symptom description is required." });
        }

        if (string.IsNullOrWhiteSpace(request.Duration))
        {
            return BadRequest(new { error = "Duration is required." });
        }

        try
        {
            _logger.LogInformation("Initiating AI diagnosis for pet '{PetName}' (ID: {PetId})", pet.Name, pet.Id);

            var diagnosis = await _aiService.DiagnoseSymptomsAsync(
                pet.Name,
                pet.Species,
                pet.Breed,
                pet.Gender,
                pet.WeightKg,
                request.Symptoms.Trim(),
                request.Duration.Trim(),
                request.ExtraNotes?.Trim(),
                ct);

            return Ok(diagnosis);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "AI diagnostic configuration failure.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during AI symptom analysis.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "An error occurred while generating the AI diagnostic." });
        }
    }
}
