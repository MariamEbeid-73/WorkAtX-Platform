namespace BE.DTOs.Ai;

/// <summary>
/// Full job view served to the AI worker. The Redis queue message only
/// carries the jobId, so this endpoint is the worker's entry point: the
/// payload holds the resumeFileId, s3Key, and confirmed GH/LI URLs needed
/// to start processing.
/// </summary>
public record AiJobResponse(
    Guid Id,
    string JobType,
    string Status,
    object? Payload,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
