using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models;

/// <summary>
/// JobType values. Stored as a plain string (not a DB enum). Under the
/// unified chat pipeline, every chat message creates a "chat" job and
/// JobType is fixed for the lifetime of the job — nothing flips it after
/// creation. The AI Node itself decides whether the result is a plain
/// reply, a gap analysis, or a study plan (see ResultJson's response_type).
/// GapAnalysis is kept only as a historical value for old rows created
/// before the unification; new jobs never use it. Analysis1 remains a
/// distinct, unrelated job type for CV parsing.
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

    public Guid? SessionId { get; set; }
    [ForeignKey(nameof(SessionId))] public ChatSession? Session { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    /// <summary>
    /// "chat" or "analysis1". Fixed at creation — never changes afterward.
    /// The frontend reads Job.Stage/Progress and ResultJson.response_type
    /// to decide how to render the outcome, not JobType.
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