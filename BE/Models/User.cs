using System.ComponentModel.DataAnnotations;

namespace BE.Models;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(256)]
    public string ClerkUserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(320)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    // ── Profile fields (all nullable — they start empty at registration) ──────────

    /// <summary>
    /// The user's unique display handle, e.g. "@alex.dev".
    /// Populated from the Clerk display name on first login; user can edit it.
    /// </summary>
    [MaxLength(100)]
    public string? Handle { get; set; }

    /// <summary>A short bio the user writes about themselves.</summary>
    [MaxLength(500)]
    public string? Bio { get; set; }

    /// <summary>City/country or remote.</summary>
    [MaxLength(100)]
    public string? Location { get; set; }

    /// <summary>How many years of professional experience the user has.</summary>
    public int? YearsOfExperience { get; set; }

    /// <summary>
    /// Stored as a JSON array string: ["TypeScript","C#","React"].
    /// We don't use a separate TechStack table because this is a simple list
    /// that always belongs to one user and we never need to query by individual tech.
    /// </summary>
    [MaxLength(2000)]
    public string? TechStackJson { get; set; }

    /// <summary>Full GitHub profile URL: "https://github.com/alexsmith"</summary>
    [MaxLength(256)]
    public string? GithubUrl { get; set; }

    /// <summary>Full LinkedIn profile URL.</summary>
    [MaxLength(256)]
    public string? LinkedinUrl { get; set; }

    /// <summary>
    /// Whether the user is currently open to job opportunities.
    /// Defaults to false — users opt in explicitly.
    /// </summary>
    public bool IsOpenToWork { get; set; } = false;

    /// <summary>
    /// Profile completion percentage (0-100). Calculated and cached by the
    /// ProfileService whenever the profile is updated. Avoids re-computing
    /// on every GET request.
    /// </summary>
    public int ProfileCompletionPct { get; set; } = 0;


    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    public ICollection<OAuthToken> OAuthTokens { get; set; } = new List<OAuthToken>();
    public ICollection<ResumeFile> ResumeFiles { get; set; } = new List<ResumeFile>();

}