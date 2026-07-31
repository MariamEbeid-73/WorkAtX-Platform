namespace BE.DTOs.Jobs;

/// <summary>
/// Full result view, fetched once a job completes. The Result payload is
/// polymorphic: a plain string for chat replies, or a full gap-analysis /
/// study-plan object for gap_analysis jobs.
/// </summary>
public record JobResultResponse(
    Guid JobId,
    string JobType,
    string Status,
    object? Result,
    string? Error);
