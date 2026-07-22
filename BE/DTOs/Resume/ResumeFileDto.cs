namespace BE.DTOs.Resume;

public record ResumeFileDto(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    DateTimeOffset UploadedAt
);
