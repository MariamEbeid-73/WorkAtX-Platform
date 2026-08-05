using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models;

public static class ChatMessageRole
{
    public const string User = "user";
    public const string Assistant = "assistant";
}

/// <summary>
/// The AI's assistant-role payload now carries an explicit responseType:
/// normal_text | gap_analysis | study_plan.
/// </summary>
public static class AiResponseType
{
    public const string NormalText = "normal_text";
    public const string GapAnalysis = "gap_analysis";
    public const string StudyPlan = "study_plan";
}

public class ChatMessage
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid SessionId { get; set; }

    [ForeignKey(nameof(SessionId))]
    public ChatSession Session { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Raw user text, the assistant's display text (normal_text), or a short
    /// human-readable summary line (gap_analysis/study_plan) — the full
    /// structured object lives in GapAnalyses/StudyPlans, not duplicated here.
    /// </summary>
    [Required]
    public string Content { get; set; } = string.Empty;

    /// <summary>Only set on assistant rows.</summary>
    [MaxLength(30)]
    public string? ResponseType { get; set; }

    /// <summary>Links an assistant message back to the job that produced it.</summary>
    public Guid? JobId { get; set; }

    [ForeignKey(nameof(JobId))]
    public Job? Job { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}