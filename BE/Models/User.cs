using System.ComponentModel.DataAnnotations;

namespace BE.Models;

/// <summary>
/// Represents a user synced from Clerk.
/// The ClerkUserId is the authoritative identifier linking to the Clerk service.
/// </summary>
public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Clerk's unique user identifier (e.g., "user_2abc123...")</summary>
    [Required]
    [MaxLength(256)]
    public string ClerkUserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(320)]
    public string Email { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // ── Navigation ──
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}
