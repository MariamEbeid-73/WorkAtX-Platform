using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models;

public static class ChatSessionStatus
{
    public const string Active = "active";
    public const string Archived = "archived";
}

public class ChatSession
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    /// <summary>Auto-derived from the first user message; user-renameable later.</summary>
    [MaxLength(200)]
    public string? Title { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = ChatSessionStatus.Active;

    /// <summary>
    /// Rolling summary of everything said in this session so far, produced by
    /// ISummarizationService. Sent as
    /// `contextSummary` on every subsequent chat job payload for this session.
    /// </summary>
    public string? SummaryText { get; set; }

    public DateTimeOffset? SummaryUpdatedAt { get; set; }

    /// <summary>Drives "recent sessions" ordering in the sidebar.</summary>
    public DateTimeOffset? LastMessageAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}