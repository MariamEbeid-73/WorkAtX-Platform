namespace BE.DTOs.Ai;

/// <summary>
/// Short-lived pre-signed GET URL for downloading a resume file directly
/// from MinIO/S3 — the AI worker never needs storage credentials.
/// </summary>
public record AiDownloadUrlResponse(
    string Url,
    DateTimeOffset ExpiresAt);
