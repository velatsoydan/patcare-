namespace VetLoop.API.Entities.Base;

/// <summary>
/// Abstract root for every domain entity.
/// Provides a Guid primary key, UTC audit timestamps,
/// and a soft-delete flag so records are never physically removed.
/// </summary>
public abstract class BaseEntity
{
    /// <summary>Surrogate primary key — assigned at object construction.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Row creation timestamp (always UTC).</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Last mutation timestamp — null until first update.</summary>
    public DateTime? UpdatedAt { get; set; }

    /// <summary>
    /// Soft-delete sentinel. When true the row is excluded by the
    /// global query filter and treated as logically deleted.
    /// </summary>
    public bool IsDeleted { get; set; } = false;
}
