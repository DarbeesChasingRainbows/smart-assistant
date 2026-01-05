namespace Retention.Domain;

public class QuizSession
{
    public Guid Id { get; init; } = Guid.CreateVersion7();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public List<Guid> CardIds { get; init; } = new();
    public QuizDifficulty Difficulty { get; init; }

    public static QuizSession Create(QuizDifficulty difficulty, IEnumerable<Guid> cardIds)
    {
        return new QuizSession
        {
            Difficulty = difficulty,
            CardIds = cardIds.ToList()
        };
    }
}

public enum QuizDifficulty
{
    Easy,
    Medium,
    Difficult,
    Expert
}
