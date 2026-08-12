using BE.DTOs.Jobs;

namespace BE.DTOs.Analysis;

/// <summary>
/// Authoritative state used by the Knowledge Graph on page load. Analysis is
/// the latest non-stale persisted result; ActiveJob is the newest queued or
/// processing Analysis 1 job owned by the current user.
/// </summary>
public record AnalysisStateResponse(
    object? Analysis,
    JobStatusResponse? ActiveJob);
