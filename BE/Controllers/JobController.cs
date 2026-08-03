using System.Text.Json;
using BE.Common.Exceptions;
using BE.DTOs.Jobs;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

/// <summary>
/// Generic job status/result endpoints — identical shape for chat and
/// Analysis 1 jobs; only the content differs. Both endpoints verify the
/// requesting user owns the job before returning anything.
/// </summary>
[Authorize]
[ApiController]
[Route("api/jobs")]
public class JobController : ControllerBase
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserService _userService;
    private readonly IJobService _jobService;

    public JobController(
        ICurrentUserService currentUserService,
        IUserService userService,
        IJobService jobService)
    {
        _currentUserService = currentUserService;
        _userService = userService;
        _jobService = jobService;
    }

    /// <summary>
    /// GET /api/jobs/{jobId}/status
    /// Lightweight poll target. The frontend polls this every second or two;
    /// when it sees Status == "completed" it fetches /result and stops.
    /// Stage/Progress are populated for any job that's "processing" — the
    /// frontend can switch to a live progress view for any job, not just a
    /// specific job type.
    /// </summary>
    [HttpGet("{jobId:guid}/status")]
    public async Task<ActionResult<JobStatusResponse>> GetStatus(Guid jobId)
    {
        var job = await GetOwnedJobAsync(jobId);

        return Ok(new JobStatusResponse(
            job.Id,
            job.JobType,
            job.Status,
            job.Error,
            job.Stage,
            job.Progress,
            job.UpdatedAt));
    }

    /// <summary>
    /// GET /api/jobs/{jobId}/result
    /// Returns the full result payload once the job is complete.
    /// </summary>
    [HttpGet("{jobId:guid}/result")]
    public async Task<ActionResult<JobResultResponse>> GetResult(Guid jobId)
    {
        var job = await GetOwnedJobAsync(jobId);

        object? result = null;
        if (!string.IsNullOrEmpty(job.ResultJson))
            result = JsonSerializer.Deserialize<JsonElement>(job.ResultJson);

        return Ok(new JobResultResponse(job.Id, job.JobType, job.Status, result, job.Error));
    }

    /// <summary>Fetches a job and enforces that the caller owns it.</summary>
    private async Task<BE.Models.Job> GetOwnedJobAsync(Guid jobId)
    {
        var user = await _userService.GetOrCreateUserAsync(
            _currentUserService.GetClerkUserId(),
            _currentUserService.GetEmail());

        var job = await _jobService.GetAsync(jobId)
            ?? throw new NotFoundException($"Job {jobId} not found.");

        if (job.UserId != user.Id)
            throw new ForbiddenException("You do not have access to this job.");

        return job;
    }
}