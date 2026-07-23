using Microsoft.EntityFrameworkCore;
using VetLoop.API.Entities;
using VetLoop.API.Entities.Base;

namespace VetLoop.API.Data;

/// <summary>
/// Primary EF Core database context for the VetLoop platform.
///
/// Design principles applied:
///   • All mapping via Fluent API — zero Data Annotations on domain models.
///   • snake_case column / table names (PostgreSQL convention).
///   • Global soft-delete query filters on every entity inheriting BaseEntity.
///   • UUID primary keys defaulted to gen_random_uuid() at the DB level.
///   • UpdatedAt is handled via SaveChanges interception (see override below).
/// </summary>
public sealed class VetLoopDbContext : DbContext
{
    public VetLoopDbContext(DbContextOptions<VetLoopDbContext> options)
        : base(options) { }

    // ── DbSets ─────────────────────────────────────────────────────────────
    public DbSet<User>        Users        { get; set; } = null!;
    public DbSet<Pet>         Pets         { get; set; } = null!;
    public DbSet<Farm>        Farms        { get; set; } = null!;
    public DbSet<VetProfile>  VetProfiles  { get; set; } = null!;
    public DbSet<Appointment> Appointments { get; set; } = null!;

    // ── SaveChanges intercept — auto-stamp UpdatedAt ────────────────────────
    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        StampUpdatedAt();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        StampUpdatedAt();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void StampUpdatedAt()
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>()
                     .Where(e => e.State is EntityState.Modified))
        {
            entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
    }

    // ── Model Configuration ─────────────────────────────────────────────────
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ════════════════════════════════════════════════════════════════════
        //  GLOBAL SOFT-DELETE QUERY FILTERS
        //  Applied to every entity — consumers never see IsDeleted = true rows
        //  unless they explicitly call .IgnoreQueryFilters().
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
        modelBuilder.Entity<Pet>().HasQueryFilter(p => !p.IsDeleted);
        modelBuilder.Entity<Farm>().HasQueryFilter(f => !f.IsDeleted);
        modelBuilder.Entity<VetProfile>().HasQueryFilter(v => !v.IsDeleted);
        modelBuilder.Entity<Appointment>().HasQueryFilter(a => !a.IsDeleted);

        // ════════════════════════════════════════════════════════════════════
        //  USER
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");

            // ── Base fields ────────────────────────────────────────────────
            entity.HasKey(u => u.Id);

            entity.Property(u => u.Id)
                  .HasColumnName("id")
                  .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(u => u.CreatedAt)
                  .HasColumnName("created_at")
                  .HasDefaultValueSql("now()")
                  .IsRequired();

            entity.Property(u => u.UpdatedAt)
                  .HasColumnName("updated_at");

            entity.Property(u => u.IsDeleted)
                  .HasColumnName("is_deleted")
                  .HasDefaultValue(false)
                  .IsRequired();

            // ── Identity fields ────────────────────────────────────────────
            entity.Property(u => u.FullName)
                  .HasColumnName("full_name")
                  .HasMaxLength(150)
                  .IsRequired();

            entity.Property(u => u.Email)
                  .HasColumnName("email")
                  .HasMaxLength(100)      // strict max per spec
                  .IsRequired();

            // Unique constraint on email (case-sensitive at DB level)
            entity.HasIndex(u => u.Email)
                  .IsUnique()
                  .HasDatabaseName("ix_users_email_unique");

            entity.Property(u => u.PasswordHash)
                  .HasColumnName("password_hash")
                  .HasMaxLength(512)
                  .IsRequired();

            entity.Property(u => u.PhoneNumber)
                  .HasColumnName("phone_number")
                  .HasMaxLength(20);

            entity.Property(u => u.Role)
                  .HasColumnName("role")
                  .HasConversion<string>()   // stored as "PetOwner", "Veterinarian" etc.
                  .HasMaxLength(32)
                  .IsRequired();

            entity.Property(u => u.IsActive)
                  .HasColumnName("is_active")
                  .HasDefaultValue(true)
                  .IsRequired();

            entity.Property(u => u.LastLoginDate)
                  .HasColumnName("last_login_date");

            entity.Property(u => u.StripeCustomerId)
                  .HasColumnName("stripe_customer_id")
                  .HasMaxLength(64);

            // ── SSO fields ────────────────────────────────────────────────────
            entity.Property(u => u.GoogleId)
                  .HasColumnName("google_id")
                  .HasMaxLength(128);  // Google `sub` claim (~21 chars; 128 for safety)

            // Sparse unique index: ensures one Google account → one VetLoop account.
            // Filter excludes NULLs so email-only users don't collide on this index.
            entity.HasIndex(u => u.GoogleId)
                  .IsUnique()
                  .HasFilter("google_id IS NOT NULL")
                  .HasDatabaseName("ix_users_google_id_unique");
        });

        // ════════════════════════════════════════════════════════════════════
        //  PET  (B2C)
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<Pet>(entity =>
        {
            entity.ToTable("pets");

            entity.HasKey(p => p.Id);

            entity.Property(p => p.Id)
                  .HasColumnName("id")
                  .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(p => p.CreatedAt)
                  .HasColumnName("created_at")
                  .HasDefaultValueSql("now()")
                  .IsRequired();

            entity.Property(p => p.UpdatedAt)
                  .HasColumnName("updated_at");

            entity.Property(p => p.IsDeleted)
                  .HasColumnName("is_deleted")
                  .HasDefaultValue(false)
                  .IsRequired();

            // ── Domain fields ──────────────────────────────────────────────
            entity.Property(p => p.Name)
                  .HasColumnName("name")
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(p => p.Species)
                  .HasColumnName("species")
                  .HasMaxLength(60)
                  .IsRequired();

            entity.Property(p => p.Breed)
                  .HasColumnName("breed")
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(p => p.DateOfBirth)
                  .HasColumnName("date_of_birth")
                  .IsRequired();

            entity.Property(p => p.Gender)
                  .HasColumnName("gender")
                  .HasMaxLength(16)
                  .IsRequired();

            entity.Property(p => p.WeightKg)
                  .HasColumnName("weight_kg")
                  .HasPrecision(6, 2)    // up to 9999.99 kg
                  .IsRequired();

            entity.Property(p => p.BloodType)
                  .HasColumnName("blood_type")
                  .HasMaxLength(16);

            entity.Property(p => p.Allergies)
                  .HasColumnName("allergies")
                  .HasMaxLength(500);

            entity.Property(p => p.IoTCollarMacAddress)
                  .HasColumnName("iot_collar_mac_address")
                  .HasMaxLength(17);  // "AA:BB:CC:DD:EE:FF" = 17 chars

            entity.Property(p => p.OwnerId)
                  .HasColumnName("owner_id")
                  .IsRequired();

            // ── Relationship: One User → Many Pets ────────────────────────
            entity.HasOne(p => p.Owner)
                  .WithMany(u => u.Pets)
                  .HasForeignKey(p => p.OwnerId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("fk_pets_owner_id");
        });

        // ════════════════════════════════════════════════════════════════════
        //  FARM  (B2B)
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<Farm>(entity =>
        {
            entity.ToTable("farms");

            entity.HasKey(f => f.Id);

            entity.Property(f => f.Id)
                  .HasColumnName("id")
                  .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(f => f.CreatedAt)
                  .HasColumnName("created_at")
                  .HasDefaultValueSql("now()")
                  .IsRequired();

            entity.Property(f => f.UpdatedAt)
                  .HasColumnName("updated_at");

            entity.Property(f => f.IsDeleted)
                  .HasColumnName("is_deleted")
                  .HasDefaultValue(false)
                  .IsRequired();

            // ── Domain fields ──────────────────────────────────────────────
            entity.Property(f => f.Name)
                  .HasColumnName("name")
                  .HasMaxLength(200)
                  .IsRequired();

            entity.Property(f => f.Location)
                  .HasColumnName("location")
                  .HasMaxLength(300)
                  .IsRequired();

            entity.Property(f => f.LivestockCount)
                  .HasColumnName("livestock_count")
                  .HasDefaultValue(0)
                  .IsRequired();

            entity.Property(f => f.FarmType)
                  .HasColumnName("farm_type")
                  .HasMaxLength(60)
                  .IsRequired();

            entity.Property(f => f.TaxNumber)
                  .HasColumnName("tax_number")
                  .HasMaxLength(20);

            entity.Property(f => f.ContactPersonName)
                  .HasColumnName("contact_person_name")
                  .HasMaxLength(150);

            entity.Property(f => f.PrimaryGatewayId)
                  .HasColumnName("primary_gateway_id")
                  .HasMaxLength(64);

            entity.Property(f => f.OwnerId)
                  .HasColumnName("owner_id")
                  .IsRequired();

            // ── Relationship: One User → Many Farms ───────────────────────
            entity.HasOne(f => f.Owner)
                  .WithMany(u => u.Farms)
                  .HasForeignKey(f => f.OwnerId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("fk_farms_owner_id");
        });

        // ════════════════════════════════════════════════════════════════════
        //  VET PROFILE  (Service Provider Domain)
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<VetProfile>(entity =>
        {
            entity.ToTable("vet_profiles");

            entity.HasKey(v => v.Id);

            entity.Property(v => v.Id)
                  .HasColumnName("id")
                  .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(v => v.CreatedAt)
                  .HasColumnName("created_at")
                  .HasDefaultValueSql("now()")
                  .IsRequired();

            entity.Property(v => v.UpdatedAt)
                  .HasColumnName("updated_at");

            entity.Property(v => v.IsDeleted)
                  .HasColumnName("is_deleted")
                  .HasDefaultValue(false)
                  .IsRequired();

            // ── Domain fields ──────────────────────────────────────────────
            entity.Property(v => v.LicenseNumber)
                  .HasColumnName("license_number")
                  .HasMaxLength(50)
                  .IsRequired();

            // Unique index to prevent duplicate license registrations
            entity.HasIndex(v => v.LicenseNumber)
                  .IsUnique()
                  .HasDatabaseName("ix_vet_profiles_license_number_unique");

            entity.Property(v => v.ClinicAddress)
                  .HasColumnName("clinic_address")
                  .HasMaxLength(300)
                  .IsRequired();

            entity.Property(v => v.Specialty)
                  .HasColumnName("specialty")
                  .HasMaxLength(100)
                  .IsRequired();

            entity.Property(v => v.ConsultationFee)
                  .HasColumnName("consultation_fee")
                  .HasPrecision(10, 2)   // ₺99,999,999.99 max
                  .IsRequired();

            entity.Property(v => v.IsAvailableForEmergency)
                  .HasColumnName("is_available_for_emergency")
                  .HasDefaultValue(false)
                  .IsRequired();

            entity.Property(v => v.UserId)
                  .HasColumnName("user_id")
                  .IsRequired();

            // ── Relationship: One-to-One User ↔ VetProfile ────────────────
            entity.HasOne(v => v.User)
                  .WithOne(u => u.VetProfile)
                  .HasForeignKey<VetProfile>(v => v.UserId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("fk_vet_profiles_user_id");
        });

        // ════════════════════════════════════════════════════════════════════
        //  APPOINTMENT  (Scheduling Domain)
        //
        //  Relationships:
        //    Pet        (1) ──── (N) Appointment  [FK: pet_id]
        //    VetProfile (1) ──── (N) Appointment  [FK: vet_profile_id]
        // ════════════════════════════════════════════════════════════════════
        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.ToTable("appointments");

            // ── Base fields ────────────────────────────────────────────────
            entity.HasKey(a => a.Id);

            entity.Property(a => a.Id)
                  .HasColumnName("id")
                  .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(a => a.CreatedAt)
                  .HasColumnName("created_at")
                  .HasDefaultValueSql("now()")
                  .IsRequired();

            entity.Property(a => a.UpdatedAt)
                  .HasColumnName("updated_at");

            entity.Property(a => a.IsDeleted)
                  .HasColumnName("is_deleted")
                  .HasDefaultValue(false)
                  .IsRequired();

            // ── Foreign Keys ───────────────────────────────────────────────
            entity.Property(a => a.PetId)
                  .HasColumnName("pet_id")
                  .IsRequired();

            entity.Property(a => a.VetProfileId)
                  .HasColumnName("vet_profile_id")
                  .IsRequired();

            // ── Scheduling fields ──────────────────────────────────────────
            entity.Property(a => a.ScheduledAt)
                  .HasColumnName("scheduled_at")
                  .IsRequired();

            entity.Property(a => a.DurationMinutes)
                  .HasColumnName("duration_minutes")
                  .HasDefaultValue(30)
                  .IsRequired();

            // ── Status ─────────────────────────────────────────────────────
            entity.Property(a => a.Status)
                  .HasColumnName("status")
                  .HasConversion<string>()   // stored as "Pending", "Confirmed" etc.
                  .HasMaxLength(16)
                  .HasDefaultValue(AppointmentStatus.Pending)
                  .IsRequired();

            // Index for fast status-based queries (e.g. "all Pending for vet X")
            entity.HasIndex(a => a.Status)
                  .HasDatabaseName("ix_appointments_status");

            // ── Clinical fields ────────────────────────────────────────────
            entity.Property(a => a.Reason)
                  .HasColumnName("reason")
                  .HasMaxLength(1000);

            entity.Property(a => a.VetNotes)
                  .HasColumnName("vet_notes")
                  .HasMaxLength(2000);

            // ── Billing fields ─────────────────────────────────────────────
            entity.Property(a => a.FinalFee)
                  .HasColumnName("final_fee")
                  .HasPrecision(10, 2);   // ₺99,999,999.99 max

            // ── Relationship: Pet (1) ──── (N) Appointment ─────────────────
            //  DeleteBehavior.Restrict: bir evcil hayvan silindiğinde
            //  randevular otomatik silinmez — önce iş kuralı çalışmalı.
            entity.HasOne(a => a.Pet)
                  .WithMany(p => p.Appointments)
                  .HasForeignKey(a => a.PetId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("fk_appointments_pet_id");

            // ── Relationship: VetProfile (1) ──── (N) Appointment ──────────
            entity.HasOne(a => a.VetProfile)
                  .WithMany(v => v.Appointments)
                  .HasForeignKey(a => a.VetProfileId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("fk_appointments_vet_profile_id");

            // Composite index: veterinerin takvim sorgularını hızlandırır
            // ("X veterinerinin Y tarihindeki randevuları")
            entity.HasIndex(a => new { a.VetProfileId, a.ScheduledAt })
                  .HasDatabaseName("ix_appointments_vet_scheduled");
        });
    }
}
