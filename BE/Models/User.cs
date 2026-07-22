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

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

}