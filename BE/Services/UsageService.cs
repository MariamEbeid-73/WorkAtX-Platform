using BE.Data;
using BE.Models;
using BE.ServiceContracts;
using Microsoft.EntityFrameworkCore;
namespace BE.Services
{
    public class UsageService : IUsageService
    {
        private const int FreeMessageLimit = 10;
        private static readonly TimeSpan MessageWindow = TimeSpan.FromHours(24);

        private readonly AppDbContext _db;
        public UsageService(AppDbContext db) => _db = db;

        public async Task<(int, DateTimeOffset?)> PeekMessageUsageAsync(Guid userId)
        {
            var usage = await _db.MessageUsages.FirstOrDefaultAsync(u => u.UserId == userId);
            if (usage == null)
                return (FreeMessageLimit, null); 

            var now = DateTimeOffset.UtcNow;
            if (now - usage.WindowStartedAt >= MessageWindow)
                return (FreeMessageLimit, null); 

            var remaining = Math.Max(0, FreeMessageLimit - usage.Count);
            var resetAt = usage.WindowStartedAt + MessageWindow;
            return (remaining, resetAt);
        }

        public async Task<(bool, TimeSpan?, int)> TryConsumeMessageAsync(Guid userId)
        {
            var usage = await _db.MessageUsages.FirstOrDefaultAsync(u => u.UserId == userId);
            var now = DateTimeOffset.UtcNow;

            if (usage == null)
            {
                _db.Add(new MessageUsage { UserId = userId, Count = 1, WindowStartedAt = now });
                await _db.SaveChangesAsync();
                return (true, null, FreeMessageLimit - 1);
            }

            if (now - usage.WindowStartedAt >= MessageWindow)
            {
                usage.Count = 1;
                usage.WindowStartedAt = now;
                await _db.SaveChangesAsync();
                return (true, null, FreeMessageLimit - 1);
            }

            if (usage.Count >= FreeMessageLimit)
            {
                var retryAfter = MessageWindow - (now - usage.WindowStartedAt);
                return (false, retryAfter, 0);
            }

            usage.Count++;
            await _db.SaveChangesAsync();
            return (true, null, FreeMessageLimit - usage.Count);
        }
    }
}
