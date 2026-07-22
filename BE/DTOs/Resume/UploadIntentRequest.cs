namespace BE.DTOs.Resume;

public record UploadIntentRequest(
    string FileName,
    string ContentType,
    long SizeBytes
);
