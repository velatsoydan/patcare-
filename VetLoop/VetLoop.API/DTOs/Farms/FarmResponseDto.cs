namespace VetLoop.API.DTOs.Farms;

/// <summary>
/// Outbound DTO for a single Farm record.
/// Mirrors the IFarm TypeScript interface on the React Native client.
/// </summary>
public sealed record FarmResponseDto(
    Guid     Id,
    string   Name,
    string   Location,
    int      LivestockCount,
    string   FarmType,
    string?  TaxNumber,
    string?  ContactPersonName,
    string?  PrimaryGatewayId,
    Guid     OwnerId,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
