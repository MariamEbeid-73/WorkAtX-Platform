using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models;

public class OAuthToken
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    /// <summary>"github" or "linkedin"</summary>
    [Required]
    [MaxLength(50)]
    public string Provider { get; set; } = string.Empty;

    /// <summary>AES-256 encrypted access token — never store plaintext.</summary>
    [Required]
    public string EncryptedAccessToken { get; set; } = string.Empty;

    /// <summary>AES-256 encrypted refresh token (nullable — not all providers issue one).</summary>
    public string? EncryptedRefreshToken { get; set; }

    /// <summary>When the access token expires. Null means non-expiring.</summary>
    public DateTimeOffset? ExpiresAt { get; set; }

    /// <summary>GitHub/LinkedIn username or profile ID fetched at connect time.</summary>
    [MaxLength(256)]
    public string? ProviderUsername { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
