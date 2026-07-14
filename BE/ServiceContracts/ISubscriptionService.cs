using BE.DTOs.Subscription;

namespace BE.ServiceContracts;

public interface ISubscriptionService
{
    Task<StartTrialResponse> StartTrialAsync();
    Task<SubscriptionStatusResponse> GetStatusAsync();
}