using System.ComponentModel.DataAnnotations;

namespace BE.DTOs.Ai;

/// <summary>
/// Final worker result for a job. Routing is owned by the backend: analysis1
/// results land in UserAnalyses, chat/gap_analysis results in Jobs.ResultJson.
/// </summary>
public class AiResultRequest
{
    /// <summary>"completed" or "failed".</summary>
    [Required]
    public string Status { get; set; } = string.Empty;

    /// <summary>Required when Status == "completed". Stored as-is.</summary>
    public string? ResultJson { get; set; }

    /// <summary>Required when Status == "failed".</summary>
    public string? Error { get; set; }
}
