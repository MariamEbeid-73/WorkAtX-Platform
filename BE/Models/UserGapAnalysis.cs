using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models;
/// <summary>
/// One row per completed gap analysis. A user can have many, one per
/// session/conversation — this is no longer a per-user singleton.
/// </summary>
public class UserGapAnalysis
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

    /// <summary>The job that produced this row.</summary>
    public Guid? JobId { get; set; }

    [Required]
    public string ResultJson { get; set; } = "{}";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
