using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models;

/// <summary>
/// Stores the user's score breakdown (overall / dev / aiml tabs) computed by
/// the AI worker after Analysis 1. One row per user. The frontend dashboard's
/// ScoreBreakdownCard reads it via GET /api/profile/scores.
/// </summary>
public class ProfileScore
{
    [Key]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    /// <summary>
    /// JSON matching the frontend's ScoreBreakdown shape:
    /// { overall, dev, aiml } → { overallShowoff, resume, github } → ScoreMetric.
    /// Written by the worker (Task C), read by the dashboard.
    /// </summary>
    [Required]
    public string BreakdownJson { get; set; } = "{}";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
