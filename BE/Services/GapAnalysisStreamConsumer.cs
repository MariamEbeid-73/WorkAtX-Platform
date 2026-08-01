using BE.Data;
using BE.Hubs;
using BE.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace BE.Services;

public class GapAnalysisStreamConsumer : BackgroundService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IHubContext<JobStatusHub> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GapAnalysisStreamConsumer> _logger;
    private readonly string _streamName;
    private readonly string _consumerGroup;
    private readonly string _consumerName;

    public GapAnalysisStreamConsumer(
        IConnectionMultiplexer redis,
        IHubContext<JobStatusHub> hubContext,
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<GapAnalysisStreamConsumer> logger)
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
        _logger.LogWarning("GapAnalysisStreamConsumer STARTING UP — stream={Stream} group={Group}", _streamName, _consumerGroup);

        var db = _redis.GetDatabase();

        // Retry instead of letting a transient startup failure (e.g. Redis not
        // reachable yet because the container came up before the redis service
        // was ready) crash the entire host via an unhandled BackgroundService
        // exception. This loop only covers group creation at startup — the
        // main read loop below already has its own try/catch for ongoing use.
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

                // Every ~30 seconds, separately check for anything left stuck in the PEL
                // (from a crash, a dropped connection, etc.) and retry it.
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

    /// <summary>
    /// Checks the consumer group's Pending Entries List for messages that were
    /// read by ANY consumer (including a now-dead one) but never acknowledged,
    /// and have been sitting that way for longer than `stuckThreshold`. Re-claims
    /// them under this consumer and runs them through the normal processing path.
    /// </summary>
    private async Task ReclaimStuckEntriesAsync(IDatabase db, TimeSpan stuckThreshold, CancellationToken stoppingToken)
    {
        // consumerName: RedisValue.Null → "show me pending entries from EVERY
        // consumer in this group", not just this one. A stuck entry is usually
        // stuck under a consumer instance that has already crashed/restarted,
        // so filtering to "just mine" would miss the entries we actually care about.
        var pending = await db.StreamPendingMessagesAsync(
            _streamName, _consumerGroup, count: 50, consumerName: RedisValue.Null);

        var stuckIds = pending
            .Where(p => p.IdleTimeInMilliseconds > stuckThreshold.TotalMilliseconds)
            .Select(p => p.MessageId)
            .ToArray();

        if (stuckIds.Length == 0)
            return; // nothing stuck — this is the normal case almost every sweep

        _logger.LogWarning("Reclaiming {Count} stuck stream entries", stuckIds.Length);

        // XCLAIM: "transfer ownership of these specific message IDs to ME, and
        // reset their idle timer." Returns the actual message content so we can
        // reprocess it immediately without a separate read.
        var claimed = await db.StreamClaimAsync(
            _streamName, _consumerGroup, _consumerName,
            minIdleTimeInMs: (long)stuckThreshold.TotalMilliseconds,
            messageIds: stuckIds);

        foreach (var entry in claimed)
            await ProcessEntryAsync(db, entry, stoppingToken); // same method from Step 4 — no duplication
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

            if (job is null || job.JobType != JobType.GapAnalysis)
            {
                // Not tracked here, or not (yet) escalated to gap_analysis — ignore defensively.
                // Note: chat_job.py's escalation event ("escalated_to_gap_analysis", percent 0)
                // fires right after the DB flip to gap_analysis, so by the time this event
                // is read, job.JobType should already say gap_analysis. If it doesn't, the
                // events arrived out of order — worth alerting on, not just skipping silently.
                await db.StreamAcknowledgeAsync(_streamName, _consumerGroup, entry.Id);
                return;
            }

            job.Stage = stage;
            job.Progress = progress;
            job.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(stoppingToken);

            await _hubContext.Clients.Group(JobStatusHub.GroupName(jobId)).SendAsync(
                "job_status_update",
                new { jobId, stage, progress, timestamp = DateTimeOffset.UtcNow },
                stoppingToken);

            await db.StreamAcknowledgeAsync(_streamName, _consumerGroup, entry.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process entry {Id}", entry.Id);
        }
    }
}