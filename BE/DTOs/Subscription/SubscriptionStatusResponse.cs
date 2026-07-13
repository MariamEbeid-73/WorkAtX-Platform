namespace BE.DTOs.Subscription;

public record SubscriptionStatusResponse(
    string PlanType,
    bool IsActive,
    DateTimeOffset TrialStartDate,
    DateTimeOffset TrialEndDate,
    int DaysRemaining,
    string? StripeCustomerId,
    string? StripeSubscriptionId
);