using BE.Common.Exceptions;
using BE.Data;
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
    /// </summary>
    [HttpPost("start")]
    public async Task<IActionResult> Start()
    {
        var user = await _userService.GetOrCreateUserAsync(
            _currentUserService.GetClerkUserId(),
            _currentUserService.GetEmail());

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
}
