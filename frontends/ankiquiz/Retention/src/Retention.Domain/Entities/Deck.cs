using Retention.Domain.Common;

namespace Retention.Domain.Entities;

public enum DifficultyLevel
{
    Beginner,
    Intermediate,
    Advanced,
    Expert
}

public class Deck : Entity<Guid>
{
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string Category { get; private set; } = string.Empty;
    public string Subcategory { get; private set; } = string.Empty;
    public DifficultyLevel DifficultyLevel { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    
    /// <summary>
    /// Unique token for sharing this deck publicly. Null if not shared.
    /// </summary>
    public string? ShareToken { get; private set; }

    private readonly List<Flashcard> _flashcards = new();
    public IReadOnlyList<Flashcard> Flashcards => _flashcards.AsReadOnly();

    // Constructor for EF Core / Dapper / Reflection
    private Deck() { }

    public Deck(Guid id, string name, string description, string category, string subcategory, DifficultyLevel difficultyLevel, DateTime? createdAt = null, DateTime? updatedAt = null) 
        : base(id)
    {
        Name = name ?? throw new ArgumentNullException(nameof(name));
        Description = description;
        Category = category;
        Subcategory = subcategory;
        DifficultyLevel = difficultyLevel;
        CreatedAt = createdAt ?? DateTime.UtcNow;
        UpdatedAt = updatedAt ?? DateTime.UtcNow;
    }

    public void AddFlashcard(Flashcard flashcard)
    {
        if (flashcard == null) throw new ArgumentNullException(nameof(flashcard));
        _flashcards.Add(flashcard);
        UpdatedAt = DateTime.UtcNow;
    }

    public void Update(string name, string description, string category, string subcategory, DifficultyLevel difficultyLevel)
    {
        Name = name ?? throw new ArgumentNullException(nameof(name));
        Description = description;
        Category = category;
        Subcategory = subcategory;
        DifficultyLevel = difficultyLevel;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Generates a new share token for this deck, enabling public access.
    /// </summary>
    public string GenerateShareToken()
    {
        ShareToken = Convert.ToBase64String(Guid.CreateVersion7().ToByteArray())
            .Replace("/", "_")
            .Replace("+", "-")
            .TrimEnd('=')[..12];
        UpdatedAt = DateTime.UtcNow;
        return ShareToken;
    }

    /// <summary>
    /// Revokes the share token, disabling public access.
    /// </summary>
    public void RevokeShareToken()
    {
        ShareToken = null;
        UpdatedAt = DateTime.UtcNow;
    }
}
