using BE.Models;

namespace BE.ServiceContracts;

public interface IJobService
{
    /// <summary>
    /// Creates a queued job record. Does NOT publish to the queue — callers
    /// call <see cref="IJobQueueService.PublishAsync"/> separately so the
    /// record always exists before the worker can pick the message up.
    /// </summary>
    Task<Job> CreateAsync(Guid userId, string jobType, object? payload);

    /// <summary>
    /// Fetches a job, enforcing ownership: returns null if the job exists
    /// but belongs to a different user.
    /// </summary>
    Task<Job?> GetForUserAsync(Guid jobId, Guid userId);

    /// <summary>
    /// Fetches a job without an ownership filter — lets callers distinguish
    /// "job not found" (404) from "job belongs to someone else" (403).
    /// </summary>
    Task<Job?> GetAsync(Guid jobId);
}
