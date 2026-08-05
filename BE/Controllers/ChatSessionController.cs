using BE.DTOs.Chat;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[Authorize]
[ApiController]
[Route("api/chat/sessions")]
public class ChatSessionController : ControllerBase
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserService _userService;
    private readonly IChatSessionService _sessionService;

    public ChatSessionController(
        ICurrentUserService currentUserService,
        IUserService userService,
        IChatSessionService sessionService)
    {
        _currentUserService = currentUserService;
        _userService = userService;
        _sessionService = sessionService;
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

    private Task<Models.User> CurrentUserAsync() =>
        _userService.GetOrCreateUserAsync(_currentUserService.GetClerkUserId(), _currentUserService.GetEmail());
}