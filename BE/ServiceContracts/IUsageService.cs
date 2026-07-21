namespace BE.ServiceContracts
{
    public interface IUsageService
    {
        Task<(bool allowed, TimeSpan? retryAfter, int remaining)> TryConsumeMessageAsync(Guid userId);
        Task<(int remaining, DateTimeOffset? resetAt)> PeekMessageUsageAsync(Guid userId);
    }
}

