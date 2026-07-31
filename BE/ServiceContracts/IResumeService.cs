using BE.DTOs.Resume;

namespace BE.ServiceContracts;

public interface IResumeService
{
    Task<UploadIntentResponse> CreateUploadIntentAsync(UploadIntentRequest request);
    Task<ConfirmUploadResponse> ConfirmUploadAsync(Guid resumeId);
    Task<IEnumerable<ResumeFileDto>> ListResumesAsync();
    Task<DownloadUrlResponse> GetDownloadUrlAsync(Guid resumeId);
    Task DeleteResumeAsync(Guid resumeId);
}
