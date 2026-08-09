using System.Text.Json;
using BE.Common;
using BE.Common.Exceptions;
using BE.Data;
using BE.DTOs.Analysis;
using BE.DTOs.Jobs;
using BE.Models;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BE.Controllers;

/// <summary>
/// Analysis 1 onboarding flow. The frontend calls /start once the user
/// finishes the onboarding wizard (resume uploaded + optional account
/// connects); this creates the Analysis 1 job automatically and queues it —
/// no further user action required.
/// </summary>
[Authorize]
[ApiController]
[Route("api/analysis1")]
public class AnalysisController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserService _userService;
    private readonly IJobService _jobService;
    private readonly IJobQueueService _jobQueueService;

    public AnalysisController(
        AppDbContext db,
        ICurrentUserService currentUserService,
        IUserService userService,
        IJobService jobService,
        IJobQueueService jobQueueService)
    {
        _db = db;
        _currentUserService = currentUserService;
        _userService = userService;
        _jobService = jobService;
        _jobQueueService = jobQueueService;
    }

    /// <summary>
    /// POST /api/analysis1/start
    /// Creates and queues an Analysis 1 job for the current user, returning
    /// its jobId immediately. The worker reads the CV from MinIO (via s3Key)
    /// and conditionally scrapes GitHub/LinkedIn when URLs were provided.
    /// Deduplicates in-flight jobs to prevent redundant tasks on page refresh.
    /// </summary>
    [HttpPost("start")]
    public async Task<IActionResult> Start()
    {
        var user = await _userService.GetOrCreateUserAsync(
            _currentUserService.GetClerkUserId(),
            _currentUserService.GetEmail());

        // 1. DEDUPLICATION GUARD: Re-use an existing in-flight Analysis 1 job if present
        var existingInFlightJob = await _db.Jobs
            .AsNoTracking()
            .FirstOrDefaultAsync(j => j.UserId == user.Id
                                   && j.JobType == JobType.Analysis1
                                   && (j.Status == JobStatus.Queued || j.Status == JobStatus.Processing));

        if (existingInFlightJob != null)
        {
            return Ok(new { jobId = existingInFlightJob.Id });
        }

        // The onboarding wizard requires a confirmed resume before this is called.
        var resume = await _db.ResumeFiles
            .Where(r => r.UserId == user.Id && r.IsConfirmed)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();

        if (resume == null)
            throw new ConflictException("No confirmed resume found. Upload your CV first.");

        var job = await _jobService.CreateAsync(user.Id, JobType.Analysis1, new
        {
            userId = user.Id,
            resumeFileId = resume.Id,
            s3Key = resume.S3Key,
            fileName = resume.FileName,
            contentType = resume.ContentType,
            githubUrl = user.GithubUrl,
            linkedinUrl = user.LinkedinUrl,
        });

        await _jobQueueService.PublishAsync(job.Id);

        return Ok(new { jobId = job.Id });
    }

    /// <summary>
    /// GET /api/analysis1/latest
    /// Returns the user's most recent completed Analysis 1 result straight from
    /// the DB — so a page refresh restores the last analysis WITHOUT creating a
    /// new job. data is null when no analysis exists yet, or the stored result
    /// is stale (a re-parse is in flight). Never triggers or queues a job.
    /// </summary>
    [HttpGet("latest")]
    public async Task<IActionResult> GetLatest()
    {
        var user = await _userService.GetOrCreateUserAsync(
            _currentUserService.GetClerkUserId(),
            _currentUserService.GetEmail());

        var analysis = await _db.UserAnalyses
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.UserId == user.Id);

        if (analysis is null || analysis.IsStale)
            return Ok(ApiResponse<object?>.Ok(null));

        object? result = null;
        if (!string.IsNullOrEmpty(analysis.ResultJson))
            result = JsonSerializer.Deserialize<JsonElement>(analysis.ResultJson);

        return Ok(ApiResponse<object?>.Ok(result));
    }

    /// <summary>
    /// GET /api/analysis1/state
    /// Returns both the latest usable persisted analysis and any active
    /// Analysis 1 job. This is read-only and never creates or queues work.
    /// </summary>
    [HttpGet("state")]
    public async Task<IActionResult> GetState()
    {
        var user = await _userService.GetOrCreateUserAsync(
            _currentUserService.GetClerkUserId(),
            _currentUserService.GetEmail());

        var activeJob = await _db.Jobs
            .AsNoTracking()
            .Where(j => j.UserId == user.Id
                     && j.JobType == JobType.Analysis1
                     && (j.Status == JobStatus.Queued || j.Status == JobStatus.Processing))
            .OrderByDescending(j => j.CreatedAt)
            .Select(j => new JobStatusResponse(
                j.Id,
                j.JobType,
                j.Status,
                j.Error,
                j.Stage,
                j.Progress,
                j.UpdatedAt))
            .FirstOrDefaultAsync();

        var analysis = await _db.UserAnalyses
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.UserId == user.Id && !a.IsStale);

        object? result = null;
        if (analysis is not null && !string.IsNullOrEmpty(analysis.ResultJson))
            result = JsonSerializer.Deserialize<JsonElement>(analysis.ResultJson);

        return Ok(ApiResponse<AnalysisStateResponse>.Ok(
            new AnalysisStateResponse(result, activeJob)));
    }
}
