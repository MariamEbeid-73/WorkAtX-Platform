using BE.Common;
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

        public ChatController(ICurrentUserService currentUserService, IUserService userService, IUsageService usageService)
        {
            _currentUserService = currentUserService;
            _userService = userService;
            _usageService = usageService;
        }

        [HttpPost("message")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            var user = await _userService.GetOrCreateUserAsync(_currentUserService.GetClerkUserId(), _currentUserService.GetEmail());
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

            return Ok(new { reply = "This is a placeholder response from Geni." });
        }
    }

    public record SendMessageRequest(string Content);
}
