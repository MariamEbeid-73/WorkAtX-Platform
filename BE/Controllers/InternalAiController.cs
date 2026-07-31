using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BE.Common.Exceptions;
using BE.Data;
using BE.DTOs.Ai;
using BE.Models;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BE.Controllers;

/// <summary>
/// Internal, service-to-service endpoints for the AI team. NOT user-facing —
/// authentication is a shared service token header, not Clerk JWT, because
/// the AI service calls these directly and synchronously mid-processing.
/// The backend owns all writes: the worker reports job state and returns
/// JSON over HTTP, and Task 2 stores results. The worker has no DB access.
/// </summary>
[ApiController]
[Route("api/internal/ai")]
public class InternalAiController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _fileStorage;
    private readonly string _serviceToken;

    public InternalAiController(AppDbContext db, IFileStorageService fileStorage, IConfiguration config)
    {
        _db = db;
        _fileStorage = fileStorage;
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

        if (analysis.IsStale)
            throw new NotFoundException($"Analysis 1 result for user {userId} is stale — a re-parse is in progress.");

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

    /// <summary>
    /// GET /api/internal/ai/jobs/{jobId}
    /// Full job + decoded payload. The worker receives only the jobId from
    /// the queue, so this endpoint is its entry point for everything it needs
    /// to start: userId, resumeFileId, s3Key, confirmed GH/LI URLs, message.
    /// </summary>
    [HttpGet("jobs/{jobId:guid}")]
    public async Task<IActionResult> GetJob(Guid jobId)
    {
        if (!IsAuthorized(Request))
            throw new UnauthorizedAppException("Invalid or missing service token.");

        var job = await _db.Jobs
            .AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == jobId)
            ?? throw new NotFoundException($"Job {jobId} not found.");

        return Ok(new AiJobResponse(
            job.Id,
            job.JobType,
            job.Status,
            DecodePayload(job.PayloadJson),
            job.CreatedAt,
            job.UpdatedAt));
    }

    /// <summary>
    /// GET /api/internal/ai/resume/{resumeFileId}/download-url
    /// Pre-signed GET URL so the worker can download the CV directly from
    /// MinIO/S3. 404 if the resume file no longer exists.
    /// </summary>
    [HttpGet("resume/{resumeFileId:guid}/download-url")]
    public async Task<IActionResult> GetResumeDownloadUrl(Guid resumeFileId)
    {
        if (!IsAuthorized(Request))
            throw new UnauthorizedAppException("Invalid or missing service token.");

        var resume = await _db.ResumeFiles
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == resumeFileId)
            ?? throw new NotFoundException($"Resume {resumeFileId} not found.");

        var url = await _fileStorage.GenerateDownloadUrlAsync(resume.S3Key);

        return Ok(new AiDownloadUrlResponse(url, DateTimeOffset.UtcNow.AddHours(1)));
    }

    /// <summary>
    /// POST /api/internal/ai/jobs/{jobId}/status
    /// Worker reports it started processing, and optionally escalates a chat
    /// job to gap_analysis. Stage/Progress are owned by the Redis stream
    /// consumer and are not modified here.
    /// </summary>
    [HttpPost("jobs/{jobId:guid}/status")]
    public async Task<IActionResult> ReportStatus(Guid jobId, [FromBody] AiStatusRequest request)
    {
        if (!IsAuthorized(Request))
            throw new UnauthorizedAppException("Invalid or missing service token.");

        if (request.Status != JobStatus.Processing)
            throw new BadRequestException($"Only '{JobStatus.Processing}' is supported here.");

        var job = await _db.Jobs.FirstOrDefaultAsync(j => j.Id == jobId)
            ?? throw new NotFoundException($"Job {jobId} not found.");

        if (job.Status is JobStatus.Completed or JobStatus.Failed)
            throw new ConflictException($"Job {jobId} is already {job.Status}.");

        job.Status = JobStatus.Processing;

        if (!string.IsNullOrEmpty(request.JobType))
        {
            if (job.JobType != JobType.Chat)
                throw new BadRequestException($"Only '{JobType.Chat}' jobs can be escalated; this one is '{job.JobType}'.");
            if (request.JobType != JobType.GapAnalysis)
                throw new BadRequestException($"Invalid escalation job type '{request.JobType}'.");
            job.JobType = JobType.GapAnalysis;
        }

        job.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new AiJobResponse(
            job.Id,
            job.JobType,
            job.Status,
            DecodePayload(job.PayloadJson),
            job.CreatedAt,
            job.UpdatedAt));
    }

    /// <summary>
    /// POST /api/internal/ai/jobs/{jobId}/result
    /// Worker's final write-back. The backend owns all writes and routes by
    /// job type: analysis1 → UserAnalyses (parsed CV JSON), chat/gap_analysis
    /// → Jobs.ResultJson. Rejects double-submits on terminal jobs.
    /// </summary>
    [HttpPost("jobs/{jobId:guid}/result")]
    public async Task<IActionResult> SubmitResult(Guid jobId, [FromBody] AiResultRequest request)
    {
        if (!IsAuthorized(Request))
            throw new UnauthorizedAppException("Invalid or missing service token.");

        if (request.Status is not (JobStatus.Completed or JobStatus.Failed))
            throw new BadRequestException($"Result status must be '{JobStatus.Completed}' or '{JobStatus.Failed}'.");

        if (request.Status == JobStatus.Completed && string.IsNullOrEmpty(request.ResultJson))
            throw new BadRequestException("A completed result requires resultJson.");

        if (request.Status == JobStatus.Failed && string.IsNullOrEmpty(request.Error))
            throw new BadRequestException("A failed result requires an error message.");

        var job = await _db.Jobs.FirstOrDefaultAsync(j => j.Id == jobId)
            ?? throw new NotFoundException($"Job {jobId} not found.");

        if (job.Status is JobStatus.Completed or JobStatus.Failed)
            throw new ConflictException($"Job {jobId} is already {job.Status} — refusing a double-submit.");

        job.Status    = request.Status;
        job.UpdatedAt = DateTimeOffset.UtcNow;

        if (job.JobType == JobType.Analysis1)
        {
            if (request.Status == JobStatus.Completed)
                SaveAnalysis1Result(job, request.ResultJson!);
            else
                job.Error = request.Error;
        }
        else
        {
            // chat / gap_analysis → the result lives on the job itself.
            job.ResultJson = request.Status == JobStatus.Completed ? request.ResultJson : null;
            job.Error      = request.Status == JobStatus.Failed ? request.Error : null;
        }

        await _db.SaveChangesAsync();

        return Ok(new AiResultResponse(job.Id, job.Status));
    }

    private void SaveAnalysis1Result(Job job, string resultJson)
    {
        var analysis = _db.UserAnalyses.FirstOrDefault(a => a.UserId == job.UserId);

        if (analysis == null)
        {
            _db.UserAnalyses.Add(new UserAnalysis
            {
                UserId       = job.UserId,
                ResultJson   = resultJson,
                ResumeFileId = PayloadResumeFileId(job.PayloadJson),
                IsStale      = false,
                UpdatedAt    = DateTimeOffset.UtcNow,
            });
        }
        else
        {
            analysis.ResultJson   = resultJson;
            analysis.ResumeFileId = PayloadResumeFileId(job.PayloadJson);
            analysis.IsStale      = false;
            analysis.UpdatedAt    = DateTimeOffset.UtcNow;
        }
    }

    private static object? DecodePayload(string? payloadJson)
        => string.IsNullOrWhiteSpace(payloadJson)
            ? null
            : JsonSerializer.Deserialize<JsonElement>(payloadJson);

    /// <summary>
    /// Re-reads resumeFileId from the analysis1 payload so the UserAnalysis
    /// tracks which resume it was parsed from — keeps re-parse dedup working
    /// after the worker completes.
    /// </summary>
    private static Guid? PayloadResumeFileId(string? payloadJson)
    {
        if (string.IsNullOrWhiteSpace(payloadJson)) return null;

        using var doc = JsonDocument.Parse(payloadJson);
        return doc.RootElement.TryGetProperty("resumeFileId", out var prop)
            && Guid.TryParse(prop.GetString(), out var id)
                ? id
                : null;
    }

    private static string[] ParseJsonArray(string? json)
        => string.IsNullOrWhiteSpace(json)
            ? Array.Empty<string>()
            : JsonSerializer.Deserialize<string[]>(json) ?? Array.Empty<string>();
}
