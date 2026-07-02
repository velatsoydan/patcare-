using VetLoop.API.Entities.Base;

namespace VetLoop.API.Entities;

/// <summary>
/// Core platform identity record.
/// Represents every registered participant — pet owner, farm operator,
/// veterinarian, or platform admin.
/// </summary>
public sealed class User : BaseEntity
{
    // ── Identity ────────────────────────────────────────────────────────────
    public string   FullName          { get; set; } = string.Empty;
    public string   Email             { get; set; } = string.Empty;
    public string   PasswordHash      { get; set; } = string.Empty;
    public string?  PhoneNumber       { get; set; }
    public UserRole Role              { get; set; } = UserRole.PetOwner;

    // ── SSO / OAuth Identity ──────────────────────────────────────────────────
    /// <summary>
    /// Google's stable subject identifier (the `sub` claim from the ID token).
    /// Null for users who registered with email + password.
    /// Unique constraint prevents one Google account linking to multiple VetLoop accounts.
    /// </summary>
    public string? GoogleId { get; set; }

    // ── Account State ────────────────────────────────────────────────────────
    public bool      IsActive         { get; set; } = true;
    public DateTime? LastLoginDate    { get; set; }

    // ── Billing Integration (Stripe) ─────────────────────────────────────────
    /// <summary>
    /// Stripe Customer ID (e.g. "cus_Abc123").
    /// Null until the user initiates a paid subscription or transaction.
    /// </summary>
    public string? StripeCustomerId   { get; set; }

    // ── Navigation Properties ─────────────────────────────────────────────────
    /// <summary>B2C companion animals registered by this user.</summary>
    public ICollection<Pet>    Pets       { get; set; } = [];

    /// <summary>B2B agricultural farms registered by this user.</summary>
    public ICollection<Farm>   Farms      { get; set; } = [];

    /// <summary>
    /// Extended veterinarian profile — only populated when Role == Veterinarian.
    /// One-to-one, owned by this User row.
    /// </summary>
    public VetProfile? VetProfile { get; set; }
}
