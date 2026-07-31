using System.ComponentModel.DataAnnotations;

namespace BE.DTOs.Ai;

/// <summary>
/// Worker-reported progress on a job. Optionally escalates a "chat" job to
/// "gap_analysis" once the worker detects the escalation mid-flight. The
/// Stage/Progress fields are owned by the Redis stream consumer and are not
/// touched here.
/// </summary>
public class AiStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;

    /// <summary>When set on a chat job, flips it to "gap_analysis".</summary>
    public string? JobType { get; set; }
}
