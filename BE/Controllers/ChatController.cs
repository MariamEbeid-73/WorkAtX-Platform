using BE.Common;
using BE.Models;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BE.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/chat")]
    public class ChatController : ControllerBase
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IUserService _userService;
        private readonly IUsageService _usageService;
        private readonly IJobService _jobService;
        private readonly IJobQueueService _jobQueueService;
        private readonly IChatSessionService _sessionService;
        private readonly BE.Data.AppDbContext _db;

        public ChatController(
            ICurrentUserService currentUserService,
            IUserService userService,
            IUsageService usageService,
            IJobService jobService,
            IJobQueueService jobQueueService,
            IChatSessionService sessionService,
            BE.Data.AppDbContext db)
        {
            _currentUserService = currentUserService;
            _userService = userService;
            _usageService = usageService;
            _jobService = jobService;
            _jobQueueService = jobQueueService;
            _sessionService = sessionService;
            _db = db;
        }

        [HttpPost("message")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Content))
                return BadRequest(new { message = "Message content is required." });

            var user = (HttpContext.Items["CurrentUser"] as User)
                ?? await _userService.GetOrCreateUserAsync(_currentUserService.GetClerkUserId(), _currentUserService.GetEmail());
            // NEW — enforce CV upload before any chat can start.
            var hasConfirmedResume = await _db.ResumeFiles.AnyAsync(r => r.UserId == user.Id && r.IsConfirmed);
            if (!hasConfirmedResume)
            {
                return StatusCode(412, new { message = "Upload and confirm your CV before starting a chat.", code = "CV_REQUIRED" });
            }

            var plan = _currentUserService.GetPlan();

            if (!PlanTier.AtLeast(plan, "pro"))
            {
                var (allowed, retryAfter, remaining) = await _usageService.TryConsumeMessageAsync(user.Id);
                if (!allowed)
                {
                    return StatusCode(429, new
                    {
                        message = "Daily free message limit reached. Upgrade to Pro for unlimited messages.",
                        retryAfterSeconds = (int)retryAfter!.Value.TotalSeconds
                    });
                }
                Response.Headers["X-Messages-Remaining"] = remaining.ToString();
            }

            // 1. Resolve or create the session
            var session = await _sessionService.GetOrCreateForMessageAsync(user.Id, request.SessionId, request.Content);

            // 2. RETRIEVE the existing session summary (generation happens after
            //    the AI replies — see InternalAiController.SubmitResult).
            var contextSummary = session.SummaryText;

            // 3. Create the job with the expanded payload
            var job = await _jobService.CreateAsync(user.Id, JobType.Chat, new
            {
                userId = user.Id,
                sessionId = session.Id,
                message = request.Content,
                contextSummary,
            }, session.Id);

            // 4. Persist the user's message immediately — durable transcript
            //    regardless of what happens to the job afterward. Tagged with
            //    JobId so the worker's result callback can find the *exact*
            //    user turn that triggered this job later, instead of just
            //    "whichever user message is newest" (see ChatMessage.JobId).
            _db.ChatMessages.Add(new ChatMessage
            {
                SessionId = session.Id,
                UserId = user.Id,
                Role = ChatMessageRole.User,
                Content = request.Content,
                JobId = job.Id,
            });
            session.LastMessageAt = DateTimeOffset.UtcNow;

            await _db.SaveChangesAsync();
            await _jobQueueService.PublishAsync(job.Id);

            return Ok(new { jobId = job.Id, sessionId = session.Id });
        }
    }

    public record SendMessageRequest(string Content, Guid? SessionId);
}