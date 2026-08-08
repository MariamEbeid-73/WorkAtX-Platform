using System.Text.Json;
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
    private readonly IChatGateService _chatGateService;
    private readonly BE.Data.AppDbContext _db;

    public ChatSessionController(
        ICurrentUserService currentUserService,
        IUserService userService,
        IChatSessionService sessionService,
        IJobService jobService,
        IJobQueueService jobQueueService,
        IChatGateService chatGateService,
        BE.Data.AppDbContext db)
    {
        _currentUserService = currentUserService;
        _userService = userService;
        _sessionService = sessionService;
        _jobService = jobService;
        _jobQueueService = jobQueueService;
        _chatGateService = chatGateService;
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
        var session = await GetOwnedSessionAsync(user.Id, id);

        // Same CV-required + daily quota gate as ChatController.SendMessage —
        // resuming a paused study plan is still "chatting," so it must go
        // through the exact same checks. Shared via IChatGateService so the
        // two controllers can't drift out of sync.
        var gate = await _chatGateService.CheckAsync(user.Id, Response);
        if (!gate.IsAllowed)
            return gate.ErrorResult!;

        // JobId is used ONLY to verify the referenced gap-analysis job is
        // real and belongs to this session — a server-side consistency
        // check, not something the AI needs. The AI is stateless per job
        // (it replies once and the job ends — there's no "resuming" a job
        // at that layer), and it already has userId + sessionId on every
        // chat job payload, which is all it needs to pull the latest gap
        // analysis for this session via
        // GET /api/internal/ai/gap-analysis/{userId}?sessionId=... if it
        // wants the full structured data. So the original job id is never
        // forwarded into the new job's payload below.
        var original = await _jobService.GetForUserAsync(request.JobId, user.Id);
        if (original is null)
            throw new NotFoundException($"Job {request.JobId} not found.");

        if (original.SessionId != id)
            throw new BadRequestException("The specified job does not belong to this session.");

        // Turn the user's radio-button selections into a normal-language chat
        // message. This job is otherwise indistinguishable from one created
        // by ChatController.SendMessage — same payload shape, same "message
        // reaches the same AI endpoint, AI decides what to do" flow.
        var synthesizedMessage = BuildSelectionsMessage(request.Selections);

        // Same payload shape as ChatController.SendMessage — userId,
        // sessionId, message, contextSummary. No resumeFromJobId/selections:
        // the AI treats this exactly like any other chat turn.
        var job = await _jobService.CreateAsync(user.Id, JobType.Chat, new
        {
            userId = user.Id,
            sessionId = id,
            message = synthesizedMessage,
            contextSummary = session.SummaryText,
        }, id);

        // Persist the synthesized text as the user's turn — exactly like
        // ChatController.SendMessage does for a normal message. This is what
        // makes session reconstruction show what the user actually chose,
        // and what lets InternalAiController.SaveChatResultAsync's "last
        // user message for this job" lookup find a real turn (previously it
        // always fell back to an empty string here, so the rolling session
        // summary got a blank "User asked: " entry for every resumed plan).
        _db.ChatMessages.Add(new ChatMessage
        {
            SessionId = id,
            UserId = user.Id,
            Role = ChatMessageRole.User,
            Content = synthesizedMessage,
            JobId = job.Id,
        });

        session.LastMessageAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();
        await _jobQueueService.PublishAsync(job.Id);

        return Ok(new SendMessageResponse(job.Id, id));
    }

    private async Task<User> CurrentUserAsync() =>
        (HttpContext.Items["CurrentUser"] as User)
        ?? await _userService.GetOrCreateUserAsync(_currentUserService.GetClerkUserId(), _currentUserService.GetEmail());

    private async Task<ChatSession> GetOwnedSessionAsync(Guid userId, Guid sessionId)
    {
        var session = await _db.ChatSessions.FirstOrDefaultAsync(s => s.Id == sessionId)
            ?? throw new NotFoundException("Chat session not found.");
        if (session.UserId != userId)
            throw new ForbiddenException("You do not have access to this session.");
        return session;
    }

    /// <summary>
    /// Renders the flat { category: choice } selections map (see FE
    /// TechChoiceSelections) as a single readable sentence the AI service can
    /// act on like any other chat message, e.g.:
    /// "I've chosen: Containerization = Docker, Cloud Platform = AWS. Build
    /// my study plan around these choices."
    /// Falls back to a generic sentence if selections is missing, not an
    /// object, or empty — the job still needs a non-null `message`.
    /// </summary>
    private static string BuildSelectionsMessage(JsonElement selections)
    {
        const string fallback = "I've made my technology selections. Build my study plan around these choices.";

        if (selections.ValueKind != JsonValueKind.Object)
            return fallback;

        var parts = new List<string>();
        foreach (var prop in selections.EnumerateObject())
        {
            var value = prop.Value.ValueKind == JsonValueKind.String
                ? prop.Value.GetString()
                : prop.Value.ToString();

            if (!string.IsNullOrWhiteSpace(value))
                parts.Add($"{prop.Name} = {value}");
        }

        return parts.Count == 0
            ? fallback
            : $"I've chosen: {string.Join(", ", parts)}. Build my study plan around these choices.";
    }
}
