using VetLoop.API.Entities.Base;

namespace VetLoop.API.Entities;

/// <summary>
/// B2B domain entity representing an agricultural or livestock farm.
/// Extended with ERP-grade billing fields (TaxNumber) and a primary
/// IoT gateway identifier for herd-level telemetry hub linkage.
/// </summary>
public sealed class Farm : BaseEntity
{
    // ── Core Identity ─────────────────────────────────────────────────────────
    public string Name           { get; set; } = string.Empty;
    public string Location       { get; set; } = string.Empty;
    public int    LivestockCount { get; set; }
    /// <summary>e.g. "Dairy", "Poultry", "Mixed Livestock", "Aquaculture".</summary>
    public string FarmType       { get; set; } = string.Empty;

    // ── B2B Billing & Legal ───────────────────────────────────────────────────
    /// <summary>
    /// Turkish Tax Identification Number (Vergi Kimlik No).
    /// Required for corporate invoice generation.
    /// </summary>
    public string? TaxNumber         { get; set; }

    /// <summary>Primary on-site operations contact for field veterinary dispatch.</summary>
    public string? ContactPersonName { get; set; }

    // ── IoT Integration ───────────────────────────────────────────────────────
    /// <summary>
    /// Unique identifier of the farm's central IoT hub/gateway device.
    /// Routes real-time herd sensor data streams (temperature, biometrics) to the API.
    /// </summary>
    public string? PrimaryGatewayId { get; set; }

    // ── Foreign Key ───────────────────────────────────────────────────────────
    public Guid OwnerId { get; set; }

    // ── Navigation Properties ─────────────────────────────────────────────────
    public User Owner { get; set; } = null!;
}
