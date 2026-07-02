using VetLoop.API.DTOs.Ai;

namespace VetLoop.API.Services;

public interface IAiService
{
    Task<DiagnosticResponseDto> DiagnoseSymptomsAsync(
        string petName,
        string species,
        string breed,
        string gender,
        decimal weightKg,
        string symptoms,
        string duration,
        string? extraNotes,
        CancellationToken ct);
}
