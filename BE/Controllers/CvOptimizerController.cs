using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BE.ServiceContracts;

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
        if (_currentUserService.GetPlan() != "pro")
            return Forbid();

        return StatusCode(501, new { message = "CV Optimizer is coming soon." });
    }
}