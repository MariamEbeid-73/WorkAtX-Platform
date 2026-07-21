using BE.Common;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[Authorize]
[ApiController]
[Route("api/mock-interview")]
public class MockInterviewController : ControllerBase
{
    private readonly ICurrentUserService _currentUserService;

    public MockInterviewController(ICurrentUserService currentUserService)
    {
        _currentUserService = currentUserService;
    }

    [HttpPost("start")]
    public IActionResult Start()
    {
        if (!PlanTier.AtLeast(_currentUserService.GetPlan(), "elite"))
            return Forbid();

        return StatusCode(501, new { message = "Mock Interview is coming soon." });
    }
}