using BE.Common;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[Authorize]
[ApiController]
[Route("api/cv-optimizer")]
public class CvOptimizerController : ControllerBase
{
    private readonly ICurrentUserService _currentUserService;

    public CvOptimizerController(ICurrentUserService currentUserService)
    {
        _currentUserService = currentUserService;
    }

    [HttpPost("analyze")]
    public IActionResult Analyze()
    {
        if (!PlanTier.AtLeast(_currentUserService.GetPlan(), "elite"))
            return Forbid();

        return StatusCode(501, new { message = "Cv Optimizer is coming soon." });
    }
}