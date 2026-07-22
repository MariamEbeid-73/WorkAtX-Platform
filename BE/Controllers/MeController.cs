using BE.DTOs.Me;
using BE.ServiceContracts;
using BE.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[Authorize]
[ApiController]
[Route("[controller]")]
public class MeController : ControllerBase
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserService _userService;
    private readonly IUsageService _usageService;

    public MeController(ICurrentUserService currentUserService, IUserService userService, IUsageService usageService)
    {
        _currentUserService = currentUserService;
        _userService = userService;
        _usageService = usageService;
    }

    [HttpGet]
    public async Task<ActionResult<MeResponse>> GetMe()
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email = _currentUserService.GetEmail();

        var user = await _userService.GetOrCreateUserAsync(clerkUserId, email);
        var plan = _currentUserService.GetPlan();

        int? messagesRemaining = null;
        DateTimeOffset? messagesResetAt = null;

        if (!PlanTier.AtLeast(plan, "pro")) 
        {
            var (remaining, resetAt) = await _usageService.PeekMessageUsageAsync(user.Id);
            messagesRemaining = remaining;
            messagesResetAt = resetAt;
        }

        return Ok(new MeResponse(user.Id, user.ClerkUserId, user.Email, plan, messagesRemaining, messagesResetAt));
    }
}