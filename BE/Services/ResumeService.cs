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

    public ResumeService(
        AppDbContext db,
        ICurrentUserService currentUserService,
        IUserService userService,
        IFileStorageService fileStorage)
    {
        _db                 = db;
        _currentUserService = currentUserService;
        _userService        = userService;
        _fileStorage        = fileStorage;
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

    public async Task<ResumeFileDto> ConfirmUploadAsync(Guid resumeId)
    {
        var resume = await GetOwnedResumeAsync(resumeId);
        resume.IsConfirmed = true;
        await _db.SaveChangesAsync();
        return ToDto(resume);
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
