using System.ComponentModel.DataAnnotations;

namespace BE.Models
{
    public class MessageUsage
    {
        [Key]
        public Guid UserId { get; set; }
        public int Count { get; set; }
        public DateTimeOffset WindowStartedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
