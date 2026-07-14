using BE.DTOs.Health;

namespace BE.ServiceContracts;

public interface IHealthCheckService
{
    Task<HealthCheckResponse> CheckHealthAsync();
}