using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.Runtime;
using System.Net.Http;
using BE.ServiceContracts;

namespace BE.Services;

public class S3FileStorageService : IFileStorageService, IDisposable
{
    private readonly IAmazonS3 _s3Client;
    private readonly IAmazonS3 _presignedS3Client;
    private readonly string _bucketName;

    public S3FileStorageService(IConfiguration configuration)
    {
        var endpoint  = configuration["S3:Endpoint"];   // null for real AWS, set for MinIO
        var accessKey = configuration["S3:AccessKey"] ?? throw new InvalidOperationException("S3:AccessKey missing");
        var secretKey = configuration["S3:SecretKey"] ?? throw new InvalidOperationException("S3:SecretKey missing");
        var region    = configuration["S3:Region"]    ?? "us-east-1";
        _bucketName   = configuration["S3:BucketName"] ?? throw new InvalidOperationException("S3:BucketName missing");

        var config = new AmazonS3Config
        {
            RegionEndpoint = RegionEndpoint.GetBySystemName(region),
            UseHttp = true,
        };

        var presignedConfig = new AmazonS3Config
        {
            RegionEndpoint = RegionEndpoint.GetBySystemName(region),
            UseHttp = true,
        };

        // If a custom endpoint is configured (MinIO), override the service URL.
        // ForcePathStyle=true is required for MinIO and path-style S3 buckets.
        if (!string.IsNullOrEmpty(endpoint))
        {
            config.ServiceURL   = endpoint;
            config.ForcePathStyle = true;
            config.HttpClientFactory = new TrustAllHttpClientFactory();

            // For local dev, presigned URLs must be signed for localhost so the browser's Host header matches.
            presignedConfig.ServiceURL = endpoint.Replace("minio", "localhost");
            presignedConfig.ForcePathStyle = true;
            presignedConfig.HttpClientFactory = new TrustAllHttpClientFactory();
        }

        _s3Client = new AmazonS3Client(accessKey, secretKey, config);
        _presignedS3Client = new AmazonS3Client(accessKey, secretKey, presignedConfig);
    }

    public Task<string> GenerateUploadUrlAsync(string s3Key, string contentType, int expirySeconds = 300)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName  = _bucketName,
            Key         = s3Key,
            Verb        = HttpVerb.PUT,
            ContentType = contentType,
            Expires     = DateTime.UtcNow.AddSeconds(expirySeconds),
        };

        // GetPreSignedURL is synchronous in the AWS SDK
        var url = _presignedS3Client.GetPreSignedURL(request);
        return Task.FromResult(url);
    }

    public Task<string> GenerateDownloadUrlAsync(string s3Key, int expirySeconds = 3600)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key        = s3Key,
            Verb       = HttpVerb.GET,
            Expires    = DateTime.UtcNow.AddSeconds(expirySeconds),
        };

        var url = _presignedS3Client.GetPreSignedURL(request);
        return Task.FromResult(url);
    }

    public Task<string> GenerateInternalDownloadUrlAsync(string s3Key, int expirySeconds = 3600)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key        = s3Key,
            Verb       = HttpVerb.GET,
            Expires    = DateTime.UtcNow.AddSeconds(expirySeconds),
        };

        // Uses _s3Client which points to the internal Docker hostname (e.g. workx-minio).
        // AWS SDK always generates https:// presigned URLs even with UseHttp=true,
        // so we force http:// because MinIO in Docker runs plain HTTP.
        var url = _s3Client.GetPreSignedURL(request);
        if (url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            url = "http://" + url.Substring("https://".Length);
        return Task.FromResult(url);
    }

    public async Task DeleteFileAsync(string s3Key)
    {
        var request = new DeleteObjectRequest
        {
            BucketName = _bucketName,
            Key        = s3Key,
        };
        await _s3Client.DeleteObjectAsync(request);
    }

    public void Dispose()
    {
        _s3Client.Dispose();
        _presignedS3Client?.Dispose();
    }
}

public class TrustAllHttpClientFactory : HttpClientFactory
{
    public override HttpClient CreateHttpClient(IClientConfig clientConfig)
    {
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
        };
        return new HttpClient(handler);
    }
}
