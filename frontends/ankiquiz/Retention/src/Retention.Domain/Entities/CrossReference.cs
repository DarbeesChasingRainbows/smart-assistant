using Retention.Domain.Common;

namespace Retention.Domain.Entities;

public enum ReferenceType
{
    Related,
    Prerequisite,
    FollowsFrom,
    Contradicts,
    ExampleOf
}

public class CrossReference : Entity<Guid>
{
    public string SourceType { get; private set; } = string.Empty;
    public Guid SourceId { get; private set; }
    public string TargetType { get; private set; } = string.Empty;
    public Guid TargetId { get; private set; }
    public ReferenceType ReferenceType { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private CrossReference() { }

    public CrossReference(Guid id, string sourceType, Guid sourceId, string targetType, Guid targetId, ReferenceType referenceType)
        : base(id)
    {
        SourceType = sourceType;
        SourceId = sourceId;
        TargetType = targetType;
        TargetId = targetId;
        ReferenceType = referenceType;
        CreatedAt = DateTime.UtcNow;
    }
}
