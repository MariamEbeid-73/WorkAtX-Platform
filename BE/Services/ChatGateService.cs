using BE.Common;
using BE.Data;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    public class ChatGateService : IChatGateService
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IUsageService _usageService;
        private readonly AppDbContext _db;

        public ChatGateService(
            ICurrentUserService currentUserService,
            IUsageService usageService,
            AppDbContext db)
        {
            _currentUserService = currentUserService;
            _usageService = usageService;
            _db = db;
        }

        public async Task<ChatGateResult> CheckAsync(Guid userId, HttpResponse response)
        {
            // CV-required gate: no chat turn — new or resumed — should be
            // reachable before the user has a confirmed resume on file.
            var hasConfirmedResume = await _db.ResumeFiles.AnyAsync(r => r.UserId == userId && r.IsConfirmed);
            if (!hasConfirmedResume)
            {
                return ChatGateResult.Deny(new ObjectResult(new
                {
                    message = "Upload and confirm your CV before starting a chat.",
                    code = "CV_REQUIRED"
                })
                { StatusCode = StatusCodes.Status412PreconditionFailed });
            }

            // Daily free-tier quota gate. Pro+ plans are unmetered.
            var plan = _currentUserService.GetPlan();
            if (!PlanTier.AtLeast(plan, "pro"))
            {
                var (allowed, retryAfter, remaining) = await _usageService.TryConsumeMessageAsync(userId);
                if (!allowed)
                {
                    return ChatGateResult.Deny(new ObjectResult(new
                    {
                        message = "Daily free message limit reached. Upgrade to Pro for unlimited messages.",
                        retryAfterSeconds = (int)retryAfter!.Value.TotalSeconds
                    })
                    { StatusCode = StatusCodes.Status429TooManyRequests });
                }
                response.Headers["X-Messages-Remaining"] = remaining.ToString();
            }

            return ChatGateResult.Allow();
        }
    }
}
