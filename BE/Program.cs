using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAll");

app.MapGet("/health", async (IConfiguration config) =>
{
    string dbStatus = "Disconnected";
    try
    {
        string connStr = config.GetConnectionString("DefaultConnection") ?? "";
        using var connection = new SqlConnection(connStr);
        await connection.OpenAsync();
        dbStatus = "Connected OK";
    }
    catch (System.Exception ex)
    {
        dbStatus = $"Error: {ex.Message}";
    }

    return new { status = "Healthy", dbStatus = dbStatus };
});

app.Run();
