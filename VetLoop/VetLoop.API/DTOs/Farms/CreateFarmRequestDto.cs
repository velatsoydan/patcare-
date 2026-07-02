namespace VetLoop.API.DTOs.Farms;

/// <summary>
/// Payload for creating a new farm record.
/// Mirrors the ICreateFarmRequest TypeScript interface on the React Native client.
/// </summary>
public sealed record CreateFarmRequestDto(
    string  Name,
    string  Location,
    int     LivestockCount,
    string  FarmType,
    string? TaxNumber,
    string? ContactPersonName,
    string? PrimaryGatewayId
);
