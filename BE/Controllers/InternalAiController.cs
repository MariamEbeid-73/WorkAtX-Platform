using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BE.Common.Exceptions;
using BE.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BE.Controllers;

/// <summary>
/// Internal, service-to-service endpoints for the AI team. NOT user-facing —
/// authentication is a shared service token header, not Clerk JWT, because
/// the AI service calls these directly and synchronously mid-processing.
/// </summary>
[ApiController]
[Route("api/internal/ai")]
public class InternalAiController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly string _serviceToken;

    public InternalAiController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _serviceToken = config["ServiceAuth:Token"]
            ?? throw new InvalidOperationException("ServiceAuth:Token is not configured.");
    }

    /// <summary>
    /// GET /api/internal/ai/context/{userId}
    /// Returns the user's stored Analysis 1 result plus core profile fields,
    /// so the AI has full context mid-processing. Single indexed PK lookup —
    /// fast, and independent of any job state.
    /// </summary>
    [HttpGet("context/{userId:guid}")]
    public async Task<IActionResult> GetContext(Guid userId)
    {
        if (!IsAuthorized(Request))
            throw new UnauthorizedAppException("Invalid or missing service token.");

        var analysis = await _db.UserAnalyses
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.UserId == userId)
            ?? throw new NotFoundException($"No Analysis 1 result found for user {userId}.");

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);

        object? analysisResult = null;
        if (!string.IsNullOrEmpty(analysis.ResultJson))
            analysisResult = JsonSerializer.Deserialize<JsonElement>(analysis.ResultJson);

        return Ok(new
        {
            userId,
            user?.Email,
            user?.GithubUrl,
            user?.LinkedinUrl,
            user?.YearsOfExperience,
            techStack = ParseJsonArray(user?.TechStackJson),
            user?.Degree,
            user?.GraduationYear,
            analysis = analysisResult,
            analyzedAt = analysis.UpdatedAt,
        });
    }

    private bool IsAuthorized(HttpRequest request)
    {
        var provided = request.Headers["X-Service-Token"].ToString();
        if (string.IsNullOrEmpty(provided)) return false;

        // Constant-time compare — avoids leaking the token via timing.
        var a = Encoding.UTF8.GetBytes(provided);
        var b = Encoding.UTF8.GetBytes(_serviceToken);
        return a.Length == b.Length
            && CryptographicOperations.FixedTimeEquals(a, b);
    }

    private static string[] ParseJsonArray(string? json)
        => string.IsNullOrWhiteSpace(json)
            ? Array.Empty<string>()
            : JsonSerializer.Deserialize<string[]>(json) ?? Array.Empty<string>();
}
