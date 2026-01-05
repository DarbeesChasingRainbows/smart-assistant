namespace LifeOS.Infrastructure.Storage;

/// <summary>
/// Configuration settings for MinIO S3-compatible object storage
/// </summary>
public class MinioSettings
{
    public string Endpoint { get; set; } = "localhost:9000";
    public string AccessKey { get; set; } = "minioadmin";
    public string SecretKey { get; set; } = "minioadmin123";
    public bool UseSSL { get; set; } = false;
    public string ReceiptsBucket { get; set; } = "receipts";
}
