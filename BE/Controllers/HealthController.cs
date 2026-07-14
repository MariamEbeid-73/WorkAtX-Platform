using BE.DTOs.Health;
using Microsoft.AspNetCore.Mvc;

using BE.ServiceContracts;
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