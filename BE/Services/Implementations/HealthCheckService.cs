using BE.DTOs.Health;
using BE.Services.Abstractions;
using Npgsql;

namespace BE.Services.Implementations;

public class HealthCheckService : IHealthCheckService
{
    private readonly IConfiguration _config;

    public HealthCheckService(IConfiguration config)
    {
        _config = config;
    }

    public async Task<HealthCheckResponse> CheckHealthAsync()
    {
        string dbStatus = "Disconnected";
        try
        {
            using var connection = new NpgsqlConnection(_config.GetConnectionString("DefaultConnection") ?? "");
            await connection.OpenAsync();
            dbStatus = "Connected OK";
        }
        catch (Exception ex)
        {
            dbStatus = $"Error: {ex.Message}";
        }

        return new HealthCheckResponse("Healthy", dbStatus);
    }
}
