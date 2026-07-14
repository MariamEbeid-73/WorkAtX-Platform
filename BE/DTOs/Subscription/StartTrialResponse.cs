namespace BE.DTOs.Subscription;

public record StartTrialResponse(
    string Message,
    string PlanType,
    DateTimeOffset TrialStartDate,
    DateTimeOffset TrialEndDate,
    bool IsActive
);