namespace BE.DTOs.Jobs;

/// <summary>
/// Lightweight status view, polled frequently by the frontend.
/// The JobType field is the escalation signal — the frontend switches to the
/// live progress view when a "chat" job's JobType changes to "gap_analysis".
/// </summary>
public record JobStatusResponse(
    Guid JobId,
    string JobType,
    string Status,
    string? Error,
    string? Stage,
    int? Progress,
    DateTimeOffset UpdatedAt);
