using BE.Common;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
        if (!PlanTier.AtLeast(_currentUserService.GetPlan(), "elite"))
            return Forbid();

        return StatusCode(501, new { message = "AI Tutor is coming soon." });
    }
}