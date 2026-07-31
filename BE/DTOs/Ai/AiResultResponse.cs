namespace BE.DTOs.Ai;

/// <summary>
/// Acknowledgment returned after the worker submits a job result.
/// </summary>
public record AiResultResponse(
    Guid Id,
    string Status);
