namespace BE.DTOs.Resume;

/// <summary>
/// Response for POST /resumes/{id}/confirm. Includes the confirmed resume plus
/// the id of the automatically-created Analysis 1 parse job, so the frontend
/// can poll GET /api/jobs/{analysisJobId}/status for real progress.
/// analysisJobId is null when a parse is unnecessary (resume already parsed)
/// or already in flight for this exact resume.
/// </summary>
public record ConfirmUploadResponse(
    ResumeFileDto Resume,
    Guid? AnalysisJobId
);
