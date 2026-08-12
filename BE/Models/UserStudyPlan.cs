using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models;


public class UserStudyPlan
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [Required]
    public Guid SessionId { get; set; }

    [ForeignKey(nameof(SessionId))]
    public ChatSession Session { get; set; } = null!;

    public Guid? JobId { get; set; }

    [Required]
    public string ResultJson { get; set; } = "{}";

    /// <summary>
    /// User-owned completion state for the generated plan. Stored separately
    /// from the immutable AI result so checking off work never rewrites the
    /// generated plan payload.
    /// </summary>
    [Required]
    public string ProgressJson { get; set; } = "{}";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
