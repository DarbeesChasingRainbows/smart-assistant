namespace Retention.Domain.ValueObjects;

public record SchedulingData
{
    public DateTime NextReviewDate { get; init; } = DateTime.UtcNow;
    public int Interval { get; init; } = 0; // Days
    public int Repetitions { get; init; } = 0;
    public double EaseFactor { get; init; } = 2.5; // SM-2 algorithm default

    // Private constructor to enforce creation through Flashcard or specific factory
    public SchedulingData() { }

    public SchedulingData(DateTime nextReviewDate, int interval, int repetitions, double easeFactor)
    {
        NextReviewDate = nextReviewDate;
        Interval = interval;
        Repetitions = repetitions;
        EaseFactor = easeFactor;
    }

    public static SchedulingData New() => new();
}
