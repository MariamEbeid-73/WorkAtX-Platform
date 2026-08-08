using BE.Common;
using BE.DTOs.Chat;
using BE.Models;
using BE.ServiceContracts;
using BE.Common.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BE.Controllers;

[Authorize]
[ApiController]
[Route("api/chat/sessions")]
public class ChatSessionController : ControllerBase
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserService _userService;
    private readonly IChatSessionService _sessionService;
    private readonly IJobService _jobService;
    private readonly IJobQueueService _jobQueueService;
    private readonly IUsageService _usageService;
    private readonly BE.Data.AppDbContext _db;

    public ChatSessionController(
        ICurrentUserService currentUserService,
        IUserService userService,
        IChatSessionService sessionService,
        IJobService jobService,
        IJobQueueService jobQueueService,
        IUsageService usageService,
        BE.Data.AppDbContext db)
    {
        _currentUserService = currentUserService;
        _userService = userService;
        _sessionService = sessionService;
        _jobService = jobService;
        _jobQueueService = jobQueueService;
        _usageService = usageService;
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSessionRequest request)
    {
        var user = await CurrentUserAsync();
        var session = await _sessionService.CreateAsync(user.Id, request.Title);
        return Ok(session);
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var user = await CurrentUserAsync();
        var sessions = await _sessionService.ListAsync(user.Id);
        return Ok(sessions);
    }

    [HttpGet("{id:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid id)
    {
        var user = await CurrentUserAsync();
        var messages = await _sessionService.GetMessagesAsync(user.Id, id);
        return Ok(messages);
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Rename(Guid id, [FromBody] RenameSessionRequest request)
    {
        var user = await CurrentUserAsync();
        var session = await _sessionService.RenameAsync(user.Id, id, request.Title);
        return Ok(session);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var user = await CurrentUserAsync();
        await _sessionService.ArchiveAsync(user.Id, id);
        return NoContent();
    }

    [HttpPost("{id:guid}/tech-choices")]
    public async Task<IActionResult> SubmitTechChoices(Guid id, [FromBody] SubmitTechChoicesRequest request)
    {
        var user = await CurrentUserAsync();

        // Validate session ownership (throws if not owned)
        await _sessionService.GetMessagesAsync(user.Id, id);

        // Same CV-required gate as ChatController.SendMessage — resuming a
        // paused study plan is still "chatting," so it shouldn't be reachable
        // by a user who hasn't confirmed a resume upload.
        var hasConfirmedResume = await _db.ResumeFiles.AnyAsync(r => r.UserId == user.Id && r.IsConfirmed);
        if (!hasConfirmedResume)
        {
            return StatusCode(412, new { message = "Upload and confirm your CV before starting a chat.", code = "CV_REQUIRED" });
        }

        // Same daily free-tier quota gate as ChatController.SendMessage.
        // Without this, a free-tier user who's exhausted their quota could
        // keep creating jobs indefinitely via this endpoint instead.
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

        // Ensure the original job exists and belongs to the user
        var original = await _jobService.GetForUserAsync(request.JobId, user.Id);
        if (original is null)
            throw new NotFoundException($"Job {request.JobId} not found.");

        if (original.SessionId != id)
            throw new BadRequestException("The specified job does not belong to this session.");

        // Create a resume job that the worker will pick up. Payload includes
        // the original job id and the user's selections.
        var job = await _jobService.CreateAsync(user.Id, JobType.Chat, new
        {
            userId = user.Id,
            sessionId = id,
            resumeFromJobId = request.JobId,
            selections = request.Selections,
        }, id);

        await _jobQueueService.PublishAsync(job.Id);

        return Ok(new SendMessageResponse(job.Id, id));
    }

    private async Task<User> CurrentUserAsync() =>
        (HttpContext.Items["CurrentUser"] as User)
        ?? await _userService.GetOrCreateUserAsync(_currentUserService.GetClerkUserId(), _currentUserService.GetEmail());
}