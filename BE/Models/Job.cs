using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models;

/// <summary>
/// JobType values. Stored as a plain string (not a DB enum) because the
/// value is MUTABLE at runtime — a job created as "chat" is flipped to
/// "gap_analysis" by the worker once it detects escalation.
/// </summary>
public static class JobType
{
    public const string Chat = "chat";
    public const string GapAnalysis = "gap_analysis";
    public const string Analysis1 = "analysis1";
}

/// <summary>Lifecycle of any job in the queue.</summary>
public static class JobStatus
{
    public const string Queued = "queued";
    public const string Processing = "processing";
    public const string Completed = "completed";
    public const string Failed = "failed";
}

public class Job
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    /// <summary>
    /// "chat", "gap_analysis", or "analysis1". Mutable — the worker upgrades
    /// a "chat" job to "gap_analysis" mid-flight. The frontend reads this
    /// field to decide whether to switch to the live progress view.
    /// </summary>
    [Required]
    [MaxLength(32)]
    public string JobType { get; set; } = Models.JobType.Chat;

    /// <summary>"queued", "processing", "completed", "failed".</summary>
    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = JobStatus.Queued;

    /// <summary>
    /// Raw input attached at creation, e.g. { "userId": "...", "message": "..." }
    /// for chat jobs, or { "userId": "...", "s3Key": "...", "githubUrl": "..." }
    /// for Analysis 1 jobs.
    /// </summary>
    public string? PayloadJson { get; set; }

    /// <summary>
    /// Polymorphic output — a plain reply string for chat jobs, or a full
    /// gap-analysis / study-plan object for gap_analysis jobs. One column
    /// holding either shape, so there's no per-job-type result schema.
    /// </summary>
    public string? ResultJson { get; set; }

    /// <summary>Current live stage label for gap_analysis jobs (e.g. "checking", "forming plan"). Written by the Redis stream consumer.</summary>
    [MaxLength(128)]
    public string? Stage { get; set; }

    /// <summary>Live progress percentage for gap_analysis jobs. Written by the Redis stream consumer.</summary>
    public int? Progress { get; set; }

    /// <summary>Failure reason when Status == "failed" — gives the frontend something concrete to react to.</summary>
    public string? Error { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
