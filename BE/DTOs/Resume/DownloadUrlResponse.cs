namespace BE.DTOs.Resume;

public record DownloadUrlResponse(
    string DownloadUrl,
    DateTimeOffset ExpiresAt
);
