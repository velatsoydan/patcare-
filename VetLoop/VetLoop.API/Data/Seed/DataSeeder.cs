using Bogus;
using Bogus.Extensions;
using Microsoft.EntityFrameworkCore;
using VetLoop.API.Data;
using VetLoop.API.Entities;

namespace VetLoop.API.Data.Seed;

/// <summary>
/// Development-only database seeder.
///
/// İlişki haritası:
///   2 Veteriner User → 2 VetProfile
///   3 Hayvan Sahibi User → 5-8 Pet (her sahibe 1-3 arası)
///   Petler ile VetProfile'lar arasında 3 farklı statüde Appointment'lar
///
/// Çalışma koşulu: Yalnızca Development ortamında ve Users tablosu boşsa çalışır.
/// Seed edilen hesapların ortak şifresi: VetLoop2026!
/// </summary>
public sealed class DataSeeder
{
    private readonly VetLoopDbContext _db;
    private readonly ILogger<DataSeeder> _logger;

    // ── Sabit değerler — tekrar çalıştırmalarda tutarlılık için ──────────────
    private const int Seed               = 42;          // Bogus deterministic seed
    private const string DefaultPassword = "VetLoop2026!";

    public DataSeeder(VetLoopDbContext db, ILogger<DataSeeder> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  Entry Point
    // ════════════════════════════════════════════════════════════════════════════
    public async Task SeedAsync(CancellationToken ct = default)
    {
        // Idempotent: Users tablosunda herhangi bir kayıt varsa çalışma
        if (await _db.Users.AnyAsync(ct))
        {
            _logger.LogInformation("[Seeder] Database already has data — skipping seed.");
            return;
        }

        _logger.LogInformation("[Seeder] Empty database detected — starting seed...");

        using var transaction = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(DefaultPassword, workFactor: 12);

            // ── Adım 1: Veterinerler ─────────────────────────────────────────
            var (vetUsers, vetProfiles) = CreateVeterinarians(passwordHash);
            _db.Users.AddRange(vetUsers);
            _db.VetProfiles.AddRange(vetProfiles);

            // ── Adım 2: Hayvan Sahipleri + Evcil Hayvanlar ───────────────────
            var (ownerUsers, pets) = CreatePetOwnersAndPets(passwordHash);
            _db.Users.AddRange(ownerUsers);
            _db.Pets.AddRange(pets);

            // ── SaveChanges #1: ID'ler DB'ye yazılsın (FK için gerekli) ──────
            await _db.SaveChangesAsync(ct);

            // ── Adım 3: Randevular ───────────────────────────────────────────
            var appointments = CreateAppointments(vetProfiles, pets);
            _db.Appointments.AddRange(appointments);

            // ── SaveChanges #2: Randevular yazılsın ──────────────────────────
            await _db.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);

            _logger.LogInformation(
                "[Seeder] Done. Seeded: {Vets} vets, {Owners} owners, {Pets} pets, {Appointments} appointments.",
                vetUsers.Count, ownerUsers.Count, pets.Count, appointments.Count);

            // Kullanışlı login bilgilerini loglara bas
            LogSeedCredentials(vetUsers, ownerUsers);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(ct);
            _logger.LogError(ex, "[Seeder] Seed failed — transaction rolled back.");
            throw;
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  1. VETERİNERLER
    // ════════════════════════════════════════════════════════════════════════════
    private (List<User> users, List<VetProfile> profiles) CreateVeterinarians(string passwordHash)
    {
        // Türkiye'de yaygın veteriner uzmanlık alanları
        var specialties = new[]
        {
            "Küçük Hayvanlar (Kedi & Köpek)",
            "Büyükbaş Hayvanlar & Çiftlik Sürüleri",
            "Egzotik & Yabani Hayvanlar",
            "Ortopedi & Cerrahi",
        };

        var vetUserFaker = new Faker<User>("tr")
            .UseSeed(Seed)
            .RuleFor(u => u.Id,           _ => Guid.NewGuid())
            .RuleFor(u => u.FullName,     f => $"Dr. {f.Name.FullName()}")
            .RuleFor(u => u.Email,        (f, u) => f.Internet.Email(u.FullName.Replace("Dr. ", "")))
            .RuleFor(u => u.PasswordHash, _ => passwordHash)
            .RuleFor(u => u.Role,         _ => UserRole.Veterinarian)
            .RuleFor(u => u.PhoneNumber,  f => $"+90 5{f.Random.Number(10, 99)} {f.Random.Number(100,999)} {f.Random.Number(10,99)} {f.Random.Number(10,99)}")
            .RuleFor(u => u.IsActive,     _ => true)
            .RuleFor(u => u.CreatedAt,    f => f.Date.Past(1).ToUniversalTime())
            .RuleFor(u => u.GoogleId,     _ => null);

        var vetUsers = vetUserFaker.Generate(2);

        // Non-generic Faker için global static seed kullan
        Randomizer.Seed = new Random(Seed);
        var profileFaker = new Faker("tr");

        var vetProfiles = new List<VetProfile>();
        for (int i = 0; i < vetUsers.Count; i++)
        {
            var profile = new VetProfile
            {
                Id                      = Guid.NewGuid(),
                UserId                  = vetUsers[i].Id,
                LicenseNumber           = $"TVH-{10000 + i * 1337 % 89999}",
                ClinicAddress           = $"{profileFaker.Address.StreetAddress()}, {profileFaker.PickRandom("İstanbul", "Ankara", "İzmir", "Bursa", "Antalya")}",
                Specialty               = specialties[i % specialties.Length],
                ConsultationFee         = Math.Round(profileFaker.Random.Decimal(150, 600), 2),
                IsAvailableForEmergency = i == 0,
                CreatedAt               = vetUsers[i].CreatedAt,
            };
            vetProfiles.Add(profile);
        }

        return (vetUsers, vetProfiles);
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  2. HAYVAN SAHİPLERİ + EVCİL HAYVANLAR
    // ════════════════════════════════════════════════════════════════════════════
    private (List<User> owners, List<Pet> pets) CreatePetOwnersAndPets(string passwordHash)
    {
        var ownerFaker = new Faker<User>("tr")
            .UseSeed(Seed + 100)
            .RuleFor(u => u.Id,           _ => Guid.NewGuid())
            .RuleFor(u => u.FullName,     f => f.Name.FullName())
            .RuleFor(u => u.Email,        (f, u) => f.Internet.Email(u.FullName))
            .RuleFor(u => u.PasswordHash, _ => passwordHash)
            .RuleFor(u => u.Role,         _ => UserRole.PetOwner)
            .RuleFor(u => u.PhoneNumber,  f => $"+90 5{f.Random.Number(10, 99)} {f.Random.Number(100,999)} {f.Random.Number(10,99)} {f.Random.Number(10,99)}")
            .RuleFor(u => u.IsActive,     _ => true)
            .RuleFor(u => u.CreatedAt,    f => f.Date.Past(2).ToUniversalTime())
            .RuleFor(u => u.GoogleId,     _ => null);

        var owners = ownerFaker.Generate(3);
        var allPets = new List<Pet>();

        // Gerçekçi Türkçe kedi/köpek isimleri
        var petNames = new[]
        {
            "Tarçın", "Luna", "Pisi", "Karabaş", "Pamuk",
            "Boncuk", "Maviş", "Tekir", "Zeytin", "Fındık",
            "Paşa", "Sultan", "Minnoş", "Şeytancık", "Bulut",
        };

        var dogBreeds = new[] { "Golden Retriever", "Labrador", "Husky", "Beagle", "Bulldog", "Poodle", "Rottweiler" };
        var catBreeds = new[] { "Tekir (Mackerel Tabby)", "British Shorthair", "Scottish Fold", "Maine Coon", "Van Kedisi", "Ankara Kedisi" };
        var birdBreeds = new[] { "Muhabbet Kuşu", "Papağan", "Sultan Papağanı" };

        Randomizer.Seed = new Random(Seed + 200);
        var rng = new Faker("tr");

        foreach (var (owner, idx) in owners.Select((o, i) => (o, i)))
        {
            // Her sahibe 1-3 arası hayvan
            int petCount = idx switch
            {
                0 => 3,
                1 => 2,
                _ => 1,
            };

            for (int p = 0; p < petCount; p++)
            {
                string species = rng.PickRandom("Dog", "Cat", "Bird");
                string breed   = species switch
                {
                    "Dog"  => rng.PickRandom(dogBreeds),
                    "Cat"  => rng.PickRandom(catBreeds),
                    "Bird" => rng.PickRandom(birdBreeds),
                    _      => "Bilinmiyor",
                };

                allPets.Add(new Pet
                {
                    Id          = Guid.NewGuid(),
                    OwnerId     = owner.Id,
                    Name        = rng.PickRandom(petNames),
                    Species     = species,
                    Breed       = breed,
                    DateOfBirth = rng.Date.Past(8).ToUniversalTime(),
                    Gender      = rng.PickRandom("Male", "Female"),
                    WeightKg    = species switch
                    {
                        "Dog"  => Math.Round(rng.Random.Decimal(3, 40), 1),
                        "Cat"  => Math.Round(rng.Random.Decimal(2, 7), 1),
                        "Bird" => Math.Round(rng.Random.Decimal(0.05m, 1.5m), 2),
                        _      => 1,
                    },
                    BloodType   = species == "Dog" ? rng.PickRandom("DEA 1.1+", "DEA 1.1-", "DEA 3", "DEA 4") : null,
                    Allergies   = rng.Random.Bool(0.3f) ? rng.PickRandom("Tavuk eti", "Çimen poleni", "Ev tozu akarı", "Aspirin") : null,
                    CreatedAt   = rng.Date.Past(1).ToUniversalTime(),
                });
            }
        }

        return (owners, allPets);
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  3. RANDEVULAR
    //  Zaman dağılımı:
    //    • Completed  — 30-120 gün geçmişte, VetNotes + FinalFee dolu
    //    • Confirmed  — 1-7 gün geçmişte veya 1-14 gün ileride
    //    • Pending    — 3-30 gün ileride, vet onayı bekleniyor
    //    • Cancelled  — 15-60 gün geçmişte (soft-deleted)
    // ════════════════════════════════════════════════════════════════════════════
    private List<Appointment> CreateAppointments(
        List<VetProfile> vetProfiles,
        List<Pet>        pets)
    {
        var reasons = new[]
        {
            "Yıllık aşılama ve genel sağlık kontrolü",
            "İshal ve kusma şikayeti, 2 gündür devam ediyor",
            "Arka bacaklarda topallık gözlemlendi",
            "Rutin kan tahlili ve parazit kontrolü",
            "Kulak akıntısı ve kaşıma",
            "Kilo kaybı, iştahsızlık",
            "Göz akıntısı, kızarıklık",
            "Küçük yara temizliği ve pansuman",
            "Kısırlaştırma operasyonu için ön muayene",
            "Diş tartarı temizliği",
        };

        var vetNoteTemplates = new[]
        {
            "Genel durum iyi. Aşılar güncellendi. Bir sonraki kontrol 1 yıl sonra.",
            "Akut gastroenterit tespit edildi. Probiyotik ve diyet tedavisi başlandı.",
            "Sol ön bacakta hafif burkulma. 1 hafta istirahat önerildi.",
            "Kan değerleri normal sınırlarda. Rutin kontrol tamamlandı.",
            "Otitis externa (kulak iltihabı). Antibiyotikli kulak damlası yazıldı.",
            "Tiroid fonksiyonu düşük. Hormon tedavisi başlandı.",
            "Konjonktivit teşhisi konuldu. Göz damlası ile tedavi başlandı.",
            "Yara temizlendi, sütür atıldı. 10 gün sonra kontrol.",
        };

        Randomizer.Seed = new Random(Seed + 300);
        var rng  = new Faker("tr");
        var now  = DateTime.UtcNow;
        var list = new List<Appointment>();

        // ── Her pet için 1-2 randevu oluştur ──────────────────────────────────
        foreach (var pet in pets)
        {
            var vet = rng.PickRandom(vetProfiles);

            // Geçmişte tamamlanmış randevu
            var completedDate = now.AddDays(-rng.Random.Number(30, 120));
            list.Add(new Appointment
            {
                Id              = Guid.NewGuid(),
                PetId           = pet.Id,
                VetProfileId    = vet.Id,
                ScheduledAt     = completedDate,
                DurationMinutes = rng.PickRandom(30, 45, 60),
                Status          = AppointmentStatus.Completed,
                Reason          = rng.PickRandom(reasons),
                VetNotes        = rng.PickRandom(vetNoteTemplates),
                FinalFee        = Math.Round(vet.ConsultationFee * rng.Random.Decimal(0.8m, 1.5m), 2),
                CreatedAt       = completedDate.AddDays(-rng.Random.Number(1, 7)),
                UpdatedAt       = completedDate.AddHours(1),
            });

            // Gelecekte bekleyen veya onaylanmış randevu (sadece ilk 4 pet)
            if (list.Count(a => a.Status != AppointmentStatus.Completed) < 4)
            {
                bool isFuture = rng.Random.Bool(0.6f);
                var  status   = isFuture ? rng.PickRandom(AppointmentStatus.Pending, AppointmentStatus.Confirmed)
                                         : AppointmentStatus.Confirmed;
                var  futureDate = isFuture
                    ? now.AddDays(rng.Random.Number(3, 21))
                    : now.AddDays(-rng.Random.Number(1, 3));

                list.Add(new Appointment
                {
                    Id              = Guid.NewGuid(),
                    PetId           = pet.Id,
                    VetProfileId    = rng.PickRandom(vetProfiles).Id,
                    ScheduledAt     = futureDate,
                    DurationMinutes = rng.PickRandom(30, 45),
                    Status          = status,
                    Reason          = rng.PickRandom(reasons),
                    VetNotes        = status == AppointmentStatus.Completed ? rng.PickRandom(vetNoteTemplates) : null,
                    FinalFee        = status == AppointmentStatus.Completed ? vet.ConsultationFee : null,
                    CreatedAt       = now.AddDays(-rng.Random.Number(1, 5)),
                    UpdatedAt       = null,
                });
            }
        }

        // ── 2 iptal edilmiş randevu ekle ──────────────────────────────────────
        for (int i = 0; i < 2; i++)
        {
            var pet = rng.PickRandom(pets);
            var vet = rng.PickRandom(vetProfiles);
            var cancelDate = now.AddDays(-rng.Random.Number(15, 60));

            list.Add(new Appointment
            {
                Id              = Guid.NewGuid(),
                PetId           = pet.Id,
                VetProfileId    = vet.Id,
                ScheduledAt     = cancelDate.AddDays(3),
                DurationMinutes = 30,
                Status          = AppointmentStatus.Cancelled,
                Reason          = rng.PickRandom(reasons),
                IsDeleted       = true,   // soft-delete
                CreatedAt       = cancelDate,
                UpdatedAt       = cancelDate.AddDays(1),
            });
        }

        return list;
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  Log Helper — Scalar UI'den test etmek için
    // ════════════════════════════════════════════════════════════════════════════
    private void LogSeedCredentials(List<User> vets, List<User> owners)
    {
        _logger.LogInformation("══════════════════════════════════════════════════");
        _logger.LogInformation("  VetLoop — Seed Credentials (şifre: {Pwd})", DefaultPassword);
        _logger.LogInformation("══════════════════════════════════════════════════");

        foreach (var v in vets)
            _logger.LogInformation("  [VET]   {Name} | {Email}", v.FullName, v.Email);

        foreach (var o in owners)
            _logger.LogInformation("  [OWNER] {Name} | {Email}", o.FullName, o.Email);

        _logger.LogInformation("══════════════════════════════════════════════════");
    }
}
