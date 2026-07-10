using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models;

/// <summary>
/// Tracks a user's subscription / trial state.
/// Designed for Stripe integration: StripeCustomerId and StripeSubscriptionId
/// are nullable placeholders to be populated once Stripe webhooks are connected.
/// </summary>
public class Subscription
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    /// <summary>Plan type — e.g., FREE_TRIAL, PRO, ENTERPRISE</summary>
    [Required]
    [MaxLength(50)]
    public string PlanType { get; set; } = "FREE_TRIAL";

    public DateTimeOffset TrialStartDate { get; set; }
    public DateTimeOffset TrialEndDate { get; set; }

    public bool IsActive { get; set; } = true;

    // ── Stripe Placeholders ──
    [MaxLength(256)]
    public string? StripeCustomerId { get; set; }

    [MaxLength(256)]
    public string? StripeSubscriptionId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
