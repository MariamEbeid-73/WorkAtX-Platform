using BE.DTOs.Subscription;

namespace BE.Services.Abstractions;

public interface ISubscriptionService
{
    Task<StartTrialResponse> StartTrialAsync();
    Task<SubscriptionStatusResponse> GetStatusAsync();
}