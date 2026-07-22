namespace BE.ServiceContracts;

public interface IFileStorageService
{
    /// <summary>
    /// Returns a pre-signed PUT URL. The browser uses this URL to upload a file
    /// directly to MinIO/S3 without the file passing through the API.
    /// </summary>
    Task<string> GenerateUploadUrlAsync(string s3Key, string contentType, int expirySeconds = 300);

    /// <summary>
    /// Returns a pre-signed GET URL for downloading/viewing a file.
    /// </summary>
    Task<string> GenerateDownloadUrlAsync(string s3Key, int expirySeconds = 3600);

    /// <summary>
    /// Permanently deletes a file from the bucket.
    /// </summary>
    Task DeleteFileAsync(string s3Key);
}
