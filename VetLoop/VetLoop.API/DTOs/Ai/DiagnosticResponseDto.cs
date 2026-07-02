namespace VetLoop.API.DTOs.Ai;

public sealed record DiagnosticResponseDto(
    List<string> PossibleConditions,
    List<string> Recommendations,
    string UrgencyLevel
);
