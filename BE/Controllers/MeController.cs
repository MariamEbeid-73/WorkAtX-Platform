using BE.DTOs.Me;
using BE.ServiceContracts;
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


    public MeController(ICurrentUserService currentUserService, IUserService userService)
    {
        _currentUserService = currentUserService;
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<MeResponse>> GetMe()
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email = _currentUserService.GetEmail();

        var user = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        return Ok(new MeResponse(user.Id, user.ClerkUserId, user.Email));
    }
}