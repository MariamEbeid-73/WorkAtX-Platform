using System.ComponentModel.DataAnnotations;

namespace BE.DTOs.Ai;

/// <summary>
/// Worker-reported progress on a job. Under the unified pipeline, JobType is
/// fixed at creation and never changes mid-flight — this only ever moves a
/// job to "processing". The Stage/Progress fields are owned by the Redis
/// stream consumer and are not touched here.
/// </summary>
public class AiStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
}



