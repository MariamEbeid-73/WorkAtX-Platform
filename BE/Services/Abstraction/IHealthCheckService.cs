using BE.DTOs.Health;

namespace BE.Services.Abstractions;

public interface IHealthCheckService
{
    Task<HealthCheckResponse> CheckHealthAsync();
}