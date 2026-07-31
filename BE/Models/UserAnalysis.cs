using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models;

/// <summary>
/// Stores the combined Analysis 1 result (CV analysis + GitHub scrape +
/// LinkedIn scrape) for a user. One row per user. The AI-facing context
/// endpoint reads from here, so the AI service gets full user context
/// mid-processing without depending on any job still being in progress.
/// </summary>
public class UserAnalysis
{
    [Key]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    /// <summary>
    /// Serialized JSON of the extracted profile fields, in whatever shape the
    /// AI team's contract expects. Over-inclusive by design for now.
    /// </summary>
    [Required]
    public string ResultJson { get; set; } = "{}";

    /// <summary>
    /// The resume this analysis was parsed from. Lets the system detect when
    /// the user uploads a newer CV: the new confirmation marks this row stale
    /// and queues a re-parse, so the AI never reads a superseded result.
    /// Null when the row predates this column.
    /// </summary>
    public Guid? ResumeFileId { get; set; }

    [ForeignKey(nameof(ResumeFileId))]
    public ResumeFile? ResumeFile { get; set; }

    /// <summary>
    /// True once a newer resume has been confirmed while this analysis was in
    /// flight — the AI context endpoint treats a stale row as "no analysis".
    /// Reset to false when the re-parse lands.
    /// </summary>
    public bool IsStale { get; set; } = false;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
