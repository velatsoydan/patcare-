using FluentValidation;
using VetLoop.API.DTOs.Appointments;

namespace VetLoop.API.Validators.Appointments;

/// <summary>
/// Validates the CreateAppointmentRequestDto before it reaches the controller body.
/// FluentValidation automatically returns a 400 Bad Request with field-level errors
/// if any rule fails — no manual ModelState.IsValid checks needed.
/// </summary>
public sealed class CreateAppointmentRequestValidator : AbstractValidator<CreateAppointmentRequestDto>
{
    public CreateAppointmentRequestValidator()
    {
        RuleFor(x => x.PetId)
            .NotEmpty()
            .WithMessage("PetId is required.");

        RuleFor(x => x.VetProfileId)
            .NotEmpty()
            .WithMessage("VetProfileId is required.");

        RuleFor(x => x.ScheduledAt)
            .NotEmpty()
            .WithMessage("ScheduledAt is required.")
            .GreaterThan(DateTime.UtcNow)
            .WithMessage("ScheduledAt must be a future date-time.");

        RuleFor(x => x.DurationMinutes)
            .InclusiveBetween(15, 240)
            .WithMessage("DurationMinutes must be between 15 and 240.");

        RuleFor(x => x.Reason)
            .MaximumLength(1000)
            .WithMessage("Reason must not exceed 1000 characters.")
            .When(x => x.Reason is not null);
    }
}
