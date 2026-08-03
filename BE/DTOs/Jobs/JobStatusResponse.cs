namespace BE.DTOs.Jobs;


/// <summary>
/// Lightweight status view, polled frequently by the frontend.
/// JobType is fixed at creation and never changes. The frontend switches to
/// the live progress view based on Status == "processing" and the presence
/// of Stage/Progress, not on JobType.
/// </summary>
public record JobStatusResponse(
    Guid JobId,
    string JobType,
    string Status,
    string? Error,
    string? Stage,
    int? Progress,
    DateTimeOffset UpdatedAt);
