using BE.DTOs.Subscription;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BE.ServiceContracts;

namespace BE.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SubscriptionController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;

    public SubscriptionController(ISubscriptionService subscriptionService)
    {
        _subscriptionService = subscriptionService;
    }

    [HttpPost("start-trial")]
    public async Task<ActionResult<StartTrialResponse>> StartTrial()
    {
        var result = await _subscriptionService.StartTrialAsync();
        return Ok(result);
    }

    [HttpGet("status")]
    public async Task<ActionResult<SubscriptionStatusResponse>> GetStatus()
    {
        var result = await _subscriptionService.GetStatusAsync();
        return Ok(result);
    }
}