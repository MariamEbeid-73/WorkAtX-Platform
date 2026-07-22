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

    [MaxLength(100)]
    public string? Handle { get; set; }

    [MaxLength(500)]
    public string? Bio { get; set; }

    [MaxLength(100)]
    public string? Location { get; set; }

    public int? YearsOfExperience { get; set; }

    [MaxLength(2000)]
    public string? TechStackJson { get; set; }

    [MaxLength(256)]
    public string? GithubUrl { get; set; }

    [MaxLength(256)]
    public string? LinkedinUrl { get; set; }

    public bool IsOpenToWork { get; set; } = false;

    public int ProfileCompletionPct { get; set; } = 0;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<OAuthToken> OAuthTokens { get; set; } = new List<OAuthToken>();
    public ICollection<ResumeFile> ResumeFiles { get; set; } = new List<ResumeFile>();
}