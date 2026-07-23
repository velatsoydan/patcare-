using FluentValidation;
using VetLoop.API.DTOs.Appointments;
using VetLoop.API.Entities;

namespace VetLoop.API.Validators.Appointments;

/// <summary>
/// Validates the UpdateAppointmentStatusDto for status transitions.
/// </summary>
public sealed class UpdateAppointmentStatusValidator : AbstractValidator<UpdateAppointmentStatusDto>
{
    public UpdateAppointmentStatusValidator()
    {
        RuleFor(x => x.NewStatus)
            .IsInEnum()
            .WithMessage("NewStatus must be a valid AppointmentStatus value.");

        // VetNotes are required when completing — additional business rule at controller level
        RuleFor(x => x.VetNotes)
            .MaximumLength(2000)
            .WithMessage("VetNotes must not exceed 2000 characters.")
            .When(x => x.VetNotes is not null);

        RuleFor(x => x.FinalFee)
            .GreaterThan(0)
            .WithMessage("FinalFee must be greater than 0.")
            .When(x => x.FinalFee.HasValue);
    }
}
