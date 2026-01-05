using Retention.Domain.Common;

namespace Retention.Domain.Entities;

/// <summary>
/// Represents a tag that can be applied to flashcards for organization and filtering.
/// </summary>
public class Tag : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string? Color { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private Tag() { }

    public Tag(Guid id, string name, string? color = null)
        : base(id)
    {
        Name = name?.ToLowerInvariant().Trim() ?? throw new ArgumentNullException(nameof(name));
        Color = color;
        CreatedAt = DateTime.UtcNow;
    }

    public static Tag Create(string name, string? color = null)
    {
        return new Tag(Guid.CreateVersion7(), name, color);
    }

    public void UpdateColor(string? color)
    {
        Color = color;
    }
}

/// <summary>
/// Join entity for many-to-many relationship between Flashcards and Tags.
/// </summary>
public class FlashcardTag
{
    public Guid FlashcardId { get; set; }
    public Guid TagId { get; set; }
    public DateTime TaggedAt { get; set; } = DateTime.UtcNow;
}
