using BE.DTOs.Health;
using BE.Services.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    private readonly IHealthCheckService _healthCheckService;

    public HealthController(IHealthCheckService healthCheckService)
    {
        _healthCheckService = healthCheckService;
    }

    [HttpGet]
    public async Task<ActionResult<HealthCheckResponse>> Get()
    {
        var health = await _healthCheckService.CheckHealthAsync();
        return Ok(health);
    }
}