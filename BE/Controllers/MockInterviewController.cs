using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BE.ServiceContracts;

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
        if (_currentUserService.GetPlan() != "pro")
            return Forbid();

        return StatusCode(501, new { message = "Mock Interview is coming soon." });
    }
}