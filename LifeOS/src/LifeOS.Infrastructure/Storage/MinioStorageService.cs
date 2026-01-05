using Minio;
using Minio.DataModel.Args;
using Minio.Exceptions;

namespace LifeOS.Infrastructure.Storage;

/// <summary>
/// Service for interacting with MinIO S3-compatible object storage
/// </summary>
public class MinioStorageService : IAsyncDisposable
{
    private readonly IMinioClient _client;
    private readonly MinioSettings _settings;

    public MinioStorageService(MinioSettings settings)
    {
        _settings = settings;

        var builder = new MinioClient()
            .WithEndpoint(settings.Endpoint)
            .WithCredentials(settings.AccessKey, settings.SecretKey);

        if (settings.UseSSL)
            builder = builder.WithSSL();

        _client = builder.Build();
    }

    public IMinioClient Client => _client;

    /// <summary>
    /// Ensures the receipts bucket exists, creating it if necessary
    /// </summary>
    public async Task EnsureReceiptsBucketExistsAsync(CancellationToken ct = default)
    {
        await EnsureBucketExistsAsync(_settings.ReceiptsBucket, ct);
    }

    /// <summary>
    /// Ensures a bucket exists, creating it if necessary
    /// </summary>
    public async Task EnsureBucketExistsAsync(string bucketName, CancellationToken ct = default)
    {
        var beArgs = new BucketExistsArgs().WithBucket(bucketName);
        bool found = await _client.BucketExistsAsync(beArgs, ct).ConfigureAwait(false);

        if (!found)
        {
            var mbArgs = new MakeBucketArgs().WithBucket(bucketName);
            await _client.MakeBucketAsync(mbArgs, ct).ConfigureAwait(false);
        }
    }

    /// <summary>
    /// Uploads a file to the receipts bucket
    /// </summary>
    public async Task<string> UploadReceiptAsync(
        Stream fileStream,
        string objectName,
        string contentType,
        CancellationToken ct = default)
    {
        await EnsureReceiptsBucketExistsAsync(ct);

        var putArgs = new PutObjectArgs()
            .WithBucket(_settings.ReceiptsBucket)
            .WithObject(objectName)
            .WithStreamData(fileStream)
            .WithObjectSize(fileStream.Length)
            .WithContentType(contentType);

        await _client.PutObjectAsync(putArgs, ct).ConfigureAwait(false);

        return objectName;
    }

    /// <summary>
    /// Uploads a file from a local path to the receipts bucket
    /// </summary>
    public async Task<string> UploadReceiptFromFileAsync(
        string filePath,
        string objectName,
        string contentType,
        CancellationToken ct = default)
    {
        await EnsureReceiptsBucketExistsAsync(ct);

        var putArgs = new PutObjectArgs()
            .WithBucket(_settings.ReceiptsBucket)
            .WithObject(objectName)
            .WithFileName(filePath)
            .WithContentType(contentType);

        await _client.PutObjectAsync(putArgs, ct).ConfigureAwait(false);

        return objectName;
    }

    /// <summary>
    /// Gets a presigned URL for downloading a receipt
    /// </summary>
    public async Task<string> GetReceiptDownloadUrlAsync(
        string objectName,
        int expirySeconds = 3600,
        CancellationToken ct = default)
    {
        var args = new PresignedGetObjectArgs()
            .WithBucket(_settings.ReceiptsBucket)
            .WithObject(objectName)
            .WithExpiry(expirySeconds);

        return await _client.PresignedGetObjectAsync(args).ConfigureAwait(false);
    }

    /// <summary>
    /// Gets a presigned URL for uploading a receipt directly
    /// </summary>
    public async Task<string> GetReceiptUploadUrlAsync(
        string objectName,
        int expirySeconds = 3600,
        CancellationToken ct = default)
    {
        var args = new PresignedPutObjectArgs()
            .WithBucket(_settings.ReceiptsBucket)
            .WithObject(objectName)
            .WithExpiry(expirySeconds);

        return await _client.PresignedPutObjectAsync(args).ConfigureAwait(false);
    }

    /// <summary>
    /// Deletes a receipt from storage
    /// </summary>
    public async Task DeleteReceiptAsync(string objectName, CancellationToken ct = default)
    {
        var args = new RemoveObjectArgs()
            .WithBucket(_settings.ReceiptsBucket)
            .WithObject(objectName);

        await _client.RemoveObjectAsync(args, ct).ConfigureAwait(false);
    }

    /// <summary>
    /// Checks if a receipt exists
    /// </summary>
    public async Task<bool> ReceiptExistsAsync(string objectName, CancellationToken ct = default)
    {
        try
        {
            var args = new StatObjectArgs()
                .WithBucket(_settings.ReceiptsBucket)
                .WithObject(objectName);

            await _client.StatObjectAsync(args, ct).ConfigureAwait(false);
            return true;
        }
        catch (ObjectNotFoundException)
        {
            return false;
        }
    }

    public ValueTask DisposeAsync()
    {
        // MinioClient doesn't implement IDisposable in newer versions
        return ValueTask.CompletedTask;
    }
}
