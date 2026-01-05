using Retention.Domain.Common;

namespace Retention.Domain.Entities;

public class MediaAsset : Entity<Guid>
{
    public string FileName { get; private set; } = string.Empty;
    public string FilePath { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long Size { get; private set; }
    public Guid? AssociatedEntityId { get; private set; }
    public string AssociatedEntityType { get; private set; } = string.Empty; // "Flashcard", "Deck", etc.
    public DateTime CreatedAt { get; private set; }

    private MediaAsset() { }

    public MediaAsset(Guid id, string fileName, string filePath, string contentType, long size, Guid? associatedEntityId, string associatedEntityType)
        : base(id)
    {
        FileName = fileName ?? throw new ArgumentNullException(nameof(fileName));
        FilePath = filePath ?? throw new ArgumentNullException(nameof(filePath));
        ContentType = contentType ?? throw new ArgumentNullException(nameof(contentType));
        Size = size;
        AssociatedEntityId = associatedEntityId;
        AssociatedEntityType = associatedEntityType ?? "Unassigned";
        CreatedAt = DateTime.UtcNow;
    }

    public static MediaAsset Create(string fileName, string filePath, string contentType, long size, Guid? entityId, string entityType)
    {
        return new MediaAsset(Guid.CreateVersion7(), fileName, filePath, contentType, size, entityId, entityType);
    }
}
