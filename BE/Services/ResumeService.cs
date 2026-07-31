using BE.Common.Exceptions;
using BE.Data;
using BE.DTOs.Resume;
using BE.Models;
using BE.ServiceContracts;
using Microsoft.EntityFrameworkCore;

namespace BE.Services;

public class ResumeService : IResumeService
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    };

    private const long MaxSizeBytes = 10 * 1024 * 1024; // 10 MB

    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserService _userService;
    private readonly IFileStorageService _fileStorage;
    private readonly IJobService _jobService;
    private readonly IJobQueueService _jobQueueService;

    public ResumeService(
        AppDbContext db,
        ICurrentUserService currentUserService,
        IUserService userService,
        IFileStorageService fileStorage,
        IJobService jobService,
        IJobQueueService jobQueueService)
    {
        _db                 = db;
        _currentUserService = currentUserService;
        _userService        = userService;
        _fileStorage        = fileStorage;
        _jobService         = jobService;
        _jobQueueService    = jobQueueService;
    }

    public async Task<UploadIntentResponse> CreateUploadIntentAsync(UploadIntentRequest request)
    {
        // Validate content type and size before generating a URL
        if (!AllowedContentTypes.Contains(request.ContentType))
            throw new BadRequestException("Only PDF and DOCX files are allowed.");

        if (request.SizeBytes > MaxSizeBytes)
            throw new BadRequestException("File exceeds the 10 MB size limit.");

        var clerkUserId = _currentUserService.GetClerkUserId();
        var email       = _currentUserService.GetEmail();
        var user        = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        // Build the S3 key: resumes/{userId}/{newGuid}.{ext}
        var ext       = Path.GetExtension(request.FileName).TrimStart('.');
        var newId     = Guid.NewGuid();
        var s3Key     = $"resumes/{user.Id}/{newId}.{ext}";

        // Create the DB row first (IsConfirmed=false)
        var resumeFile = new ResumeFile
        {
            Id          = newId,
            UserId      = user.Id,
            FileName    = request.FileName,
            S3Key       = s3Key,
            ContentType = request.ContentType,
            SizeBytes   = request.SizeBytes,
            IsConfirmed = false,
            CreatedAt   = DateTimeOffset.UtcNow,
        };

        _db.ResumeFiles.Add(resumeFile);
        await _db.SaveChangesAsync();

        // Generate the pre-signed PUT URL (valid for 5 minutes)
        var uploadUrl = await _fileStorage.GenerateUploadUrlAsync(s3Key, request.ContentType);

        return new UploadIntentResponse(newId, uploadUrl);
    }

    public async Task<ConfirmUploadResponse> ConfirmUploadAsync(Guid resumeId)
    {
        var resume = await GetOwnedResumeAsync(resumeId);

        var clerkUserId = _currentUserService.GetClerkUserId();
        var email       = _currentUserService.GetEmail();
        var user        = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        resume.IsConfirmed = true;

        // This exact resume was already parsed and is not stale → nothing to do.
        var analysis = await _db.UserAnalyses.FirstOrDefaultAsync(a => a.UserId == user.Id);
        if (analysis is not null && analysis.ResumeFileId == resume.Id && !analysis.IsStale)
        {
            await _db.SaveChangesAsync();
            return new ConfirmUploadResponse(ToDto(resume), null);
        }

        // A parse for this exact resume is already queued/processing → reuse its jobId.
        var activeJobId = await _db.Jobs
            .Where(j => j.UserId == user.Id
                     && j.JobType == JobType.Analysis1
                     && (j.Status == JobStatus.Queued || j.Status == JobStatus.Processing)
                     && j.PayloadJson != null
                     && j.PayloadJson.Contains($"\"resumeFileId\":\"{resume.Id}\""))
            .OrderByDescending(j => j.CreatedAt)
            .Select(j => (Guid?)j.Id)
            .FirstOrDefaultAsync();

        if (activeJobId.HasValue)
        {
            await _db.SaveChangesAsync();
            return new ConfirmUploadResponse(ToDto(resume), activeJobId);
        }

        // The existing analysis belongs to an older resume → mark it stale so the
        // AI context endpoint 404s until the fresh parse lands.
        if (analysis is not null && analysis.ResumeFileId != resume.Id)
            analysis.IsStale = true;

        await _db.SaveChangesAsync();

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

        return new ConfirmUploadResponse(ToDto(resume), job.Id);
    }

    public async Task<IEnumerable<ResumeFileDto>> ListResumesAsync()
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email       = _currentUserService.GetEmail();
        var user        = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        return await _db.ResumeFiles
            .Where(r => r.UserId == user.Id && r.IsConfirmed)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => ToDto(r))
            .ToListAsync();
    }

    public async Task<DownloadUrlResponse> GetDownloadUrlAsync(Guid resumeId)
    {
        var resume = await GetOwnedResumeAsync(resumeId);
        var url    = await _fileStorage.GenerateDownloadUrlAsync(resume.S3Key);
        return new DownloadUrlResponse(url, DateTimeOffset.UtcNow.AddHours(1));
    }

    public async Task DeleteResumeAsync(Guid resumeId)
    {
        var resume = await GetOwnedResumeAsync(resumeId);
        await _fileStorage.DeleteFileAsync(resume.S3Key);
        _db.ResumeFiles.Remove(resume);
        await _db.SaveChangesAsync();
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private async Task<ResumeFile> GetOwnedResumeAsync(Guid resumeId)
    {
        var clerkUserId = _currentUserService.GetClerkUserId();
        var email       = _currentUserService.GetEmail();
        var user        = await _userService.GetOrCreateUserAsync(clerkUserId, email);

        var resume = await _db.ResumeFiles.FindAsync(resumeId)
            ?? throw new NotFoundException("Resume not found.");

        if (resume.UserId != user.Id)
            throw new ForbiddenException("Access denied.");

        return resume;
    }

    private static ResumeFileDto ToDto(ResumeFile r) =>
        new(r.Id, r.FileName, r.ContentType, r.SizeBytes, r.CreatedAt);
}
