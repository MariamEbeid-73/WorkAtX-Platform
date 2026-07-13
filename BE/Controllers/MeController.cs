using BE.DTOs.Me;
using BE.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[Authorize]
[ApiController]
[Route("[controller]")]
public class MeController : ControllerBase
{
    private readonly ICurrentUserService _currentUserService;

    public MeController(ICurrentUserService currentUserService)
    {
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public ActionResult<MeResponse> GetMe()
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email = _currentUserService.GetEmail();

        return Ok(new MeResponse(clerkUserId, email));
    }
}