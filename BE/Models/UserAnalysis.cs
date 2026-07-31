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

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
