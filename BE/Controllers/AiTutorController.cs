using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BE.ServiceContracts;

namespace BE.Controllers;

[Authorize]
[ApiController]
[Route("api/ai-tutor")]
public class AiTutorController : ControllerBase
{
    private readonly ICurrentUserService _currentUserService;

    public AiTutorController(ICurrentUserService currentUserService)
    {
        _currentUserService = currentUserService;
    }

    [HttpPost("ask")]
    public IActionResult Ask()
    {
        if (_currentUserService.GetPlan() != "pro")
            return Forbid();

        return StatusCode(501, new { message = "AI Tutor is coming soon." });
    }
}