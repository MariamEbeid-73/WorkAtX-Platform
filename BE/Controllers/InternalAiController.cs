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

using BE.ServiceContracts;
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
    private readonly ISummarizationService _summarizationService;

    public InternalAiController(
        AppDbContext db,
        IFileStorageService fileStorage,
        IConfiguration config,
        ISummarizationService summarizationService)
    {
        _db = db;
        _fileStorage = fileStorage;
        _summarizationService = summarizationService;
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

    /// <summary>
    /// GET /api/internal/ai/gap-analysis/{userId}
    /// Returns the user's latest Gap Analysis result stored in UserGapAnalyses.
    /// Used mid-processing by the AI Node (Step 7a).
    /// </summary>
    [HttpGet("gap-analysis/{userId:guid}")]
    public async Task<IActionResult> GetGapAnalysis(Guid userId, [FromQuery] Guid? sessionId)
    {
        if (!IsAuthorized(Request))
            throw new UnauthorizedAppException("Invalid or missing service token.");

        var query = _db.UserGapAnalyses.AsNoTracking().Where(g => g.UserId == userId);
        if (sessionId.HasValue)
            query = query.Where(g => g.SessionId == sessionId.Value);

        var gapAnalysis = await query
            .OrderByDescending(g => g.CreatedAt)
            .FirstOrDefaultAsync()
            ?? throw new NotFoundException($"No gap analysis found for user {userId}" +
                (sessionId.HasValue ? $" and session {sessionId}." : "."));

        object? result = null;
        if (!string.IsNullOrEmpty(gapAnalysis.ResultJson))
            result = JsonSerializer.Deserialize<JsonElement>(gapAnalysis.ResultJson);

        return Ok(new { userId, sessionId = gapAnalysis.SessionId, gapAnalysis = result, updatedAt = gapAnalysis.UpdatedAt });
    }

    /// <summary>
    /// GET /api/internal/ai/study-plan/{userId}
    /// Returns the user's latest Study Plan result stored in UserStudyPlans.
    /// Used mid-processing by the AI Node (Step ).
    /// </summary>
    [HttpGet("plan/{userId:guid}")]
    public async Task<IActionResult> GetStudyPlan(Guid userId, [FromQuery] Guid? sessionId)
    {
        if (!IsAuthorized(Request))
            throw new UnauthorizedAppException("Invalid or missing service token.");

        var query = _db.UserStudyPlans.AsNoTracking().Where(p => p.UserId == userId);
        if (sessionId.HasValue)
            query = query.Where(p => p.SessionId == sessionId.Value);

        var plan = await query
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync()
            ?? throw new NotFoundException($"No study plan found for user {userId}" +
                (sessionId.HasValue ? $" and session {sessionId}." : "."));

        object? result = null;
        if (!string.IsNullOrEmpty(plan.ResultJson))
            result = JsonSerializer.Deserialize<JsonElement>(plan.ResultJson);

        return Ok(new { userId, sessionId = plan.SessionId, studyPlan = result, updatedAt = plan.UpdatedAt });
    }

    /// <summary>
    /// GET /api/internal/ai/jobs/{jobId}
    /// Full job + decoded payload.
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
    /// Pre-signed GET URL so the worker can download the CV directly.
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

        var url = await _fileStorage.GenerateInternalDownloadUrlAsync(resume.S3Key);

        return Ok(new AiDownloadUrlResponse(url, DateTimeOffset.UtcNow.AddHours(1)));
    }

    /// <summary>
    /// POST /api/internal/ai/jobs/{jobId}/status
    /// Worker reports it started processing. Flips Status "queued" -> "processing"
    /// exactly once, at pickup; JobType is never changed here.
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
    /// Worker's final write-back. Routes by job type & response_type:
    /// - analysis1 -> UserAnalyses
    /// - gap_analysis / study_plan payloads -> UserGapAnalyses / UserStudyPlans
    /// - all chat/gap_analysis results -> Jobs.ResultJson
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

        job.Status = request.Status;
        job.UpdatedAt = DateTimeOffset.UtcNow;

        if (job.JobType == JobType.Analysis1)
        {
            if (request.Status == JobStatus.Completed)
                SaveAnalysis1Result(job, request.ResultJson!);
        }
        else if (request.Status == JobStatus.Completed && !string.IsNullOrEmpty(request.ResultJson) && job.SessionId.HasValue)
        {
            await SaveChatResultAsync(job, request.ResultJson!);
        }

        job.ResultJson = request.Status == JobStatus.Completed ? request.ResultJson : null;
        job.Error = request.Status == JobStatus.Failed ? request.Error : null;

        await _db.SaveChangesAsync();

        return Ok(new AiResultResponse(job.Id, job.Status));
    }

    /// <summary>
    /// Routes the AI's responseType, appends the assistant ChatMessage, persists
    /// GapAnalysis/StudyPlan rows (session-scoped), and refreshes the session's
    /// rolling summary via ISummarizationService — never the career-coaching AI.
    /// </summary>
    private async Task SaveChatResultAsync(Job job, string resultJson)
    {
        string responseType;
        string displayContent;

        using (var doc = JsonDocument.Parse(resultJson))
        {
            var root = doc.RootElement;
            responseType = root.TryGetProperty("responseType", out var typeProp)
                ? typeProp.GetString() ?? AiResponseType.NormalText
                : AiResponseType.NormalText;

            displayContent = responseType switch
            {
                AiResponseType.NormalText => root.TryGetProperty("reply", out var r) ? r.GetString() ?? "" : "",
                AiResponseType.GapAnalysis => root.TryGetProperty("summary", out var s) ? s.GetString() ?? "Gap analysis ready." : "Gap analysis ready.",
                AiResponseType.StudyPlan => root.TryGetProperty("summary", out var s2) ? s2.GetString() ?? "Study plan ready." : "Study plan ready.",
                _ => ""
            };

            if (responseType == AiResponseType.GapAnalysis)
            {
                _db.UserGapAnalyses.Add(new UserGapAnalysis
                {
                    UserId = job.UserId,
                    SessionId = job.SessionId!.Value,
                    JobId = job.Id,
                    ResultJson = resultJson,
                });
            }
            else if (responseType == AiResponseType.StudyPlan)
            {
                _db.UserStudyPlans.Add(new UserStudyPlan
                {
                    UserId = job.UserId,
                    SessionId = job.SessionId!.Value,
                    JobId = job.Id,
                    ResultJson = resultJson,
                });
            }
        }

        var assistantMessage = new ChatMessage
        {
            SessionId = job.SessionId!.Value,
            UserId = job.UserId,
            Role = ChatMessageRole.Assistant,
            Content = displayContent,
            ResponseType = responseType,
            JobId = job.Id,
        };
        _db.ChatMessages.Add(assistantMessage);

        var session = await _db.ChatSessions.FirstOrDefaultAsync(s => s.Id == job.SessionId!.Value);
        if (session != null)
        {
            session.LastMessageAt = DateTimeOffset.UtcNow;

            // Pull the last user message for this job to feed the summarizer
            var userTurn = await _db.ChatMessages
                .Where(m => m.SessionId == session.Id && m.Role == ChatMessageRole.User)
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => m.Content)
                .FirstOrDefaultAsync() ?? "";

            var newTurns = new List<ChatTurn>
        {
            new(ChatMessageRole.User, userTurn),
            new(ChatMessageRole.Assistant, displayContent),
        };

            // Best-effort — never blocks or fails the job on summarizer errors
            // (ExternalAiSummarizationService already swallows its own exceptions;
            // this catch covers the extractive path or any future provider).
            try
            {
                var updatedSummary = await _summarizationService.SummarizeAsync(session.SummaryText, newTurns);
                session.SummaryText = updatedSummary;
                session.SummaryUpdatedAt = DateTimeOffset.UtcNow;
            }
            catch
            {
                // keep the previous summary; don't fail result submission over this
            }
        }
    }

    private void SaveUnifiedResultIfApplicable(Guid userId, string resultJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(resultJson);
            if (doc.RootElement.TryGetProperty("response_type", out var typeProp))
            {
                var responseType = typeProp.GetString();
                if (responseType == "gap_analysis_result")
                {
                    var existing = _db.UserGapAnalyses.FirstOrDefault(g => g.UserId == userId);
                    if (existing == null)
                    {
                        _db.UserGapAnalyses.Add(new UserGapAnalysis
                        {
                            UserId = userId,
                            ResultJson = resultJson,
                            UpdatedAt = DateTimeOffset.UtcNow
                        });
                    }
                    else
                    {
                        existing.ResultJson = resultJson;
                        existing.UpdatedAt = DateTimeOffset.UtcNow;
                    }
                }
                else if (responseType == "study_plan_result")
                {
                    var existing = _db.UserStudyPlans.FirstOrDefault(s => s.UserId == userId);
                    if (existing == null)
                    {
                        _db.UserStudyPlans.Add(new UserStudyPlan
                        {
                            UserId = userId,
                            ResultJson = resultJson,
                            UpdatedAt = DateTimeOffset.UtcNow
                        });
                    }
                    else
                    {
                        existing.ResultJson = resultJson;
                        existing.UpdatedAt = DateTimeOffset.UtcNow;
                    }
                }
            }
        }
        catch
        {
            // Ignore JSON parsing errors if payload structure differs
        }
    }

    private void SaveAnalysis1Result(Job job, string resultJson)
    {
        var analysis = _db.UserAnalyses.FirstOrDefault(a => a.UserId == job.UserId);

        if (analysis == null)
        {
            _db.UserAnalyses.Add(new UserAnalysis
            {
                UserId = job.UserId,
                ResultJson = resultJson,
                ResumeFileId = PayloadResumeFileId(job.PayloadJson),
                IsStale = false,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
        }
        else
        {
            analysis.ResultJson = resultJson;
            analysis.ResumeFileId = PayloadResumeFileId(job.PayloadJson);
            analysis.IsStale = false;
            analysis.UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    private bool IsAuthorized(HttpRequest request)
    {
        var provided = request.Headers["X-Service-Token"].ToString();
        if (string.IsNullOrEmpty(provided)) return false;

        var a = Encoding.UTF8.GetBytes(provided);
        var b = Encoding.UTF8.GetBytes(_serviceToken);
        return a.Length == b.Length
            && CryptographicOperations.FixedTimeEquals(a, b);
    }

    private static object? DecodePayload(string? payloadJson)
        => string.IsNullOrWhiteSpace(payloadJson)
            ? null
            : JsonSerializer.Deserialize<JsonElement>(payloadJson);

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

    [HttpPost("profile-scores/{userId:guid}")]
    public async Task<IActionResult> SubmitProfileScores(Guid userId, [FromBody] JsonElement scoreBreakdown)
    {
        if (!IsAuthorized(Request))
            throw new UnauthorizedAppException("Invalid or missing service token.");

        var score = await _db.ProfileScores.FirstOrDefaultAsync(s => s.UserId == userId);
        var json = scoreBreakdown.GetRawText();

        if (score is null)
            _db.ProfileScores.Add(new ProfileScore { UserId = userId, BreakdownJson = json });
        else
        {
            score.BreakdownJson = json;
            score.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(new { userId, status = "saved" });
    }
}