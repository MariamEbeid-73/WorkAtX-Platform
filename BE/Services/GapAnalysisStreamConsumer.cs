using BE.Data;
using BE.Hubs;
using BE.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace BE.Services;

/// <summary>
/// Generic job-progress Redis Stream consumer. Listens for progress events emitted
/// by the AI Node across any processing job (not gap_analysis-only — filtering is by
/// Job.Status == "processing", never by JobType; see REDIS_STREAM_CONTRACT_ADDENDUM.md),
/// updates the database state (Stage & Progress), and broadcasts the update via SignalR
/// to connected clients.
///
/// `stage` is treated as opaque, ready-to-display text — the AI Node owns the exact
/// copy ("Analyzing your resume…", "Forming your plan…") and this consumer never
/// rewrites or translates it before it reaches the client.
/// </summary>
public class JobProgressStreamConsumer : BackgroundService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IHubContext<JobStatusHub> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<JobProgressStreamConsumer> _logger;
    private readonly string _streamName;
    private readonly string _consumerGroup;
    private readonly string _consumerName;

    public JobProgressStreamConsumer(
        IConnectionMultiplexer redis,
        IHubContext<JobStatusHub> hubContext,
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<JobProgressStreamConsumer> logger)
    {
        _redis = redis;
        _hubContext = hubContext;
        _scopeFactory = scopeFactory;
        _logger = logger;
        _streamName = configuration["Redis:ProgressStreamName"] ?? "job-progress-stream";
        _consumerGroup = configuration["Redis:ProgressConsumerGroup"] ?? "system-service-group";
        _consumerName = $"system-service-{Environment.MachineName}-{Environment.ProcessId}";
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("JobProgressStreamConsumer STARTING UP — stream={Stream} group={Group}", _streamName, _consumerGroup);

        var db = _redis.GetDatabase();

        var groupReady = false;
        while (!groupReady && !stoppingToken.IsCancellationRequested)
        {
            try
            {
                await EnsureConsumerGroupExistsAsync(db);
                groupReady = true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Redis not ready yet for consumer group setup — retrying in 5s");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }

        var lastSweep = DateTimeOffset.MinValue;
        var sweepInterval = TimeSpan.FromSeconds(30);   // how often to check for stuck entries
        var stuckThreshold = TimeSpan.FromMinutes(2);   // how long "stuck" means

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var entries = await db.StreamReadGroupAsync(
                    _streamName, _consumerGroup, _consumerName, count: 20, noAck: false);

                if (entries.Length == 0)
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(500), stoppingToken);
                }
                else
                {
                    foreach (var entry in entries)
                        await ProcessEntryAsync(db, entry, stoppingToken);
                }

                if (DateTimeOffset.UtcNow - lastSweep > sweepInterval)
                {
                    await ReclaimStuckEntriesAsync(db, stuckThreshold, stoppingToken);
                    lastSweep = DateTimeOffset.UtcNow;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading from {Stream}", _streamName);
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }
        }
    }

    private async Task ReclaimStuckEntriesAsync(IDatabase db, TimeSpan stuckThreshold, CancellationToken stoppingToken)
    {
        var pending = await db.StreamPendingMessagesAsync(
            _streamName, _consumerGroup, count: 50, consumerName: RedisValue.Null);

        var stuckIds = pending
            .Where(p => p.IdleTimeInMilliseconds > stuckThreshold.TotalMilliseconds)
            .Select(p => p.MessageId)
            .ToArray();

        if (stuckIds.Length == 0)
            return;

        _logger.LogWarning("Reclaiming {Count} stuck stream entries", stuckIds.Length);

        var claimed = await db.StreamClaimAsync(
            _streamName, _consumerGroup, _consumerName,
            minIdleTimeInMs: (long)stuckThreshold.TotalMilliseconds,
            messageIds: stuckIds);

        foreach (var entry in claimed)
            await ProcessEntryAsync(db, entry, stoppingToken);
    }

    private async Task EnsureConsumerGroupExistsAsync(IDatabase db)
    {
        try
        {
            await db.StreamCreateConsumerGroupAsync(_streamName, _consumerGroup, "0", createStream: true);
        }
        catch (RedisServerException ex) when (ex.Message.StartsWith("BUSYGROUP"))
        {
        }
    }

    private async Task ProcessEntryAsync(IDatabase db, StreamEntry entry, CancellationToken stoppingToken)
    {
        try
        {
            var fields = entry.Values.ToDictionary(f => f.Name.ToString(), f => f.Value.ToString());

            if (!fields.TryGetValue("job_id", out var jobIdRaw) || !Guid.TryParse(jobIdRaw, out var jobId))
            {
                _logger.LogWarning("Skipping entry {Id} with missing/invalid job_id", entry.Id);
                await db.StreamAcknowledgeAsync(_streamName, _consumerGroup, entry.Id);
                return;
            }

            var stage = fields.GetValueOrDefault("stage");
            int? progress = fields.TryGetValue("percent", out var pctRaw) && int.TryParse(pctRaw, out var pct)
                ? pct
                : null;

            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var job = await dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, stoppingToken);

            // WIDENED FILTER: Check if job exists and is currently processing (status-based, not type-based)
            if (job is null || job.Status != JobStatus.Processing)
            {
                await db.StreamAcknowledgeAsync(_streamName, _consumerGroup, entry.Id);
                return;
            }

            job.Stage = stage;
            job.Progress = progress;
            job.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(stoppingToken);

            // Same event name + field set as InternalAiController.BroadcastJobUpdateAsync
            // (processing/completed/failed transitions) — the frontend has one handler
            // for the whole job lifecycle regardless of which side triggered the push.
            await _hubContext.Clients.Group(JobStatusHub.GroupName(jobId)).SendAsync(
                "job_status_update",
                new
                {
                    jobId,
                    status = job.Status,
                    stage,
                    progress,
                    error = (string?)null,
                    timestamp = DateTimeOffset.UtcNow,
                },
                stoppingToken);

            await db.StreamAcknowledgeAsync(_streamName, _consumerGroup, entry.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process entry {Id}", entry.Id);
        }
    }
}