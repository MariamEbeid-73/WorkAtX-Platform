using System.Text.Json;
using BE.Data;
using BE.Models;
using BE.ServiceContracts;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class JobService : IJobService
{
    // Payload/result columns hold JSON text. Camel-case keys to match the
    // rest of the API (the chat endpoint body is camelCase too).
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly AppDbContext _db;
    private readonly ILogger<JobService> _logger;

    public JobService(AppDbContext db, ILogger<JobService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<Job> CreateAsync(Guid userId, string jobType, object? payload, Guid? sessionId = null)
    {
        var job = new Job
        {
            UserId = userId,
            SessionId = sessionId,
            JobType = jobType,
            Status = JobStatus.Queued,
            PayloadJson = payload is null
                ? null
                : JsonSerializer.Serialize(payload, JsonOptions),
        };

        _db.Jobs.Add(job);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Job {JobId} enqueued: type={JobType}, user={UserId}",
            job.Id, jobType, userId);

        return job;
    }

    public Task<Job?> GetForUserAsync(Guid jobId, Guid userId)
        => _db.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && j.UserId == userId);

    public Task<Job?> GetAsync(Guid jobId)
        => _db.Jobs.FirstOrDefaultAsync(j => j.Id == jobId);
}
