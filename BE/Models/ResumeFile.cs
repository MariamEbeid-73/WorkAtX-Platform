using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models;

public class ResumeFile
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    /// <summary>Original filename shown in the UI (e.g. "John_CV.pdf").</summary>
    [Required]
    [MaxLength(512)]
    public string FileName { get; set; } = string.Empty;

    /// <summary>The key in the S3/MinIO bucket (e.g. "resumes/{userId}/{guid}.pdf").</summary>
    [Required]
    [MaxLength(1024)]
    public string S3Key { get; set; } = string.Empty;

    /// <summary>"application/pdf" or "application/vnd.openxmlformats-officedocument.wordprocessingml.document"</summary>
    [Required]
    [MaxLength(128)]
    public string ContentType { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    /// <summary>
    /// False until the browser confirms the direct-to-MinIO upload completed.
    /// Rows where IsConfirmed=false for more than 1 hour can be cleaned up.
    /// </summary>
    public bool IsConfirmed { get; set; } = false;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
