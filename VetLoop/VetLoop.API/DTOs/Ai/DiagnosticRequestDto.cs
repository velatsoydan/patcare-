namespace VetLoop.API.DTOs.Ai;

public sealed record DiagnosticRequestDto(
    Guid PetId,
    string Symptoms,
    string Duration,
    string? ExtraNotes
);
