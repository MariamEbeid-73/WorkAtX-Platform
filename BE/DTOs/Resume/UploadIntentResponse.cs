namespace BE.DTOs.Resume;

public record UploadIntentResponse(
    Guid ResumeId,
    string UploadUrl    // pre-signed PUT URL — browser uploads directly here
);
