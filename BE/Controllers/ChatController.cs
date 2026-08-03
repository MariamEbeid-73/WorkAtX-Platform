using BE.Common;
using BE.Models;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

        public ChatController(
            ICurrentUserService currentUserService,
            IUserService userService,
            IUsageService usageService,
            IJobService jobService,
            IJobQueueService jobQueueService)
        {
            _currentUserService = currentUserService;
            _userService = userService;
            _usageService = usageService;
            _jobService = jobService;
            _jobQueueService = jobQueueService;
        }

        /// <summary>
        /// Sends a chat message. This returns immediately with a jobId — the
        /// reply arrives later via the job status/result endpoints. Every
        /// message becomes the same "chat" job type and goes through the same
        /// single AI process call; the AI Node itself decides whether the
        /// result is a plain reply, a gap analysis, or a study plan.
        /// </summary>
        [HttpPost("message")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            // 1. Validate before doing anything else
            if (string.IsNullOrWhiteSpace(request.Content))
                return BadRequest(new { message = "Message content is required." });

            var user = await _userService.GetOrCreateUserAsync(_currentUserService.GetClerkUserId(), _currentUserService.GetEmail());
            var plan = _currentUserService.GetPlan();

            // 2. Keep the existing free-tier usage gate
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

            // 3. Create the tracked job with the raw payload attached
            var job = await _jobService.CreateAsync(user.Id, JobType.Chat, new
            {
                userId = user.Id,
                message = request.Content,
            });

            // 4. Push it onto the queue for the Celery worker — don't wait on any AI response
            await _jobQueueService.PublishAsync(job.Id);

            return Ok(new { jobId = job.Id });
        }
    }

    public record SendMessageRequest(string Content);
}