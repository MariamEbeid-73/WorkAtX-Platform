using BE.DTOs.Resume;
using BE.ServiceContracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BE.Controllers;

[Authorize]
[ApiController]
[Route("resumes")]
public class ResumeController : ControllerBase
{
    private readonly IResumeService _resumeService;

    public ResumeController(IResumeService resumeService)
    {
        _resumeService = resumeService;
    }

    /// <summary>
    /// Step 1 of 2 for upload.
    /// Returns a pre-signed PUT URL. The browser then PUTs the file bytes
    /// directly to MinIO using that URL — the file never passes through this API.
    /// </summary>
    [HttpPost("upload-intent")]
    public async Task<IActionResult> CreateUploadIntent([FromBody] UploadIntentRequest request)
    {
        var result = await _resumeService.CreateUploadIntentAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// Step 2 of 2. Call this after the browser finishes uploading to MinIO.
    /// Marks the ResumeFile record as confirmed so it appears in listings,
    /// and automatically creates + queues the Analysis 1 parse job. The
    /// response's analysisJobId lets the frontend poll real parse progress.
    /// </summary>
    [HttpPost("{id:guid}/confirm")]
    public async Task<IActionResult> ConfirmUpload(Guid id)
    {
        var result = await _resumeService.ConfirmUploadAsync(id);
        return Ok(result);
    }

    /// <summary>Returns all confirmed resumes for the current user.</summary>
    [HttpGet]
    public async Task<IActionResult> ListResumes()
    {
        var resumes = await _resumeService.ListResumesAsync();
        return Ok(resumes);
    }

    /// <summary>Returns a short-lived pre-signed download URL for a resume.</summary>
    [HttpGet("{id:guid}/download-url")]
    public async Task<IActionResult> GetDownloadUrl(Guid id)
    {
        var result = await _resumeService.GetDownloadUrlAsync(id);
        return Ok(result);
    }

    /// <summary>Deletes the resume from S3 and removes the DB record.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteResume(Guid id)
    {
        await _resumeService.DeleteResumeAsync(id);
        return NoContent();
    }
}
