using Retention.Domain.Common;

namespace Retention.Domain.Entities;

public class QuizResult : Entity<Guid>
{
    public string UserId { get; private set; } = string.Empty;
    public Guid DeckId { get; private set; }
    public Guid FlashcardId { get; private set; }
    public bool IsCorrect { get; private set; }
    public string Difficulty { get; private set; } = string.Empty;
    public DateTime AnsweredAt { get; private set; }
    public string? RawAnswer { get; private set; }

    // Constructor for EF Core / Dapper / Reflection
    private QuizResult() { }

    public QuizResult(
        Guid id,
        string userId,
        Guid deckId,
        Guid flashcardId,
        bool isCorrect,
        string difficulty,
        DateTime? answeredAt = null,
        string? rawAnswer = null
    ) : base(id)
    {
        UserId = userId ?? throw new ArgumentNullException(nameof(userId));
        DeckId = deckId;
        FlashcardId = flashcardId;
        IsCorrect = isCorrect;
        Difficulty = difficulty ?? throw new ArgumentNullException(nameof(difficulty));
        AnsweredAt = answeredAt ?? DateTime.UtcNow;
        RawAnswer = rawAnswer;
    }

    public static QuizResult Create(
        string userId,
        Guid deckId,
        Guid flashcardId,
        bool isCorrect,
        string difficulty,
        string? rawAnswer = null
    )
    {
        return new QuizResult(
            Guid.NewGuid(),
            userId,
            deckId,
            flashcardId,
            isCorrect,
            difficulty,
            DateTime.UtcNow,
            rawAnswer
        );
    }
}
