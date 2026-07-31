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

    public JobService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Job> CreateAsync(Guid userId, string jobType, object? payload)
    {
        var job = new Job
        {
            UserId  = userId,
            JobType = jobType,
            Status  = JobStatus.Queued,
            PayloadJson = payload is null
                ? null
                : JsonSerializer.Serialize(payload, JsonOptions),
        };

        _db.Jobs.Add(job);
        await _db.SaveChangesAsync();

        return job;
    }

    public Task<Job?> GetForUserAsync(Guid jobId, Guid userId)
        => _db.Jobs.FirstOrDefaultAsync(j => j.Id == jobId && j.UserId == userId);

    public Task<Job?> GetAsync(Guid jobId)
        => _db.Jobs.FirstOrDefaultAsync(j => j.Id == jobId);
}
