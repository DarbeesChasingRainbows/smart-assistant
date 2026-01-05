using Retention.Domain.Common;

namespace Retention.Domain.Entities;

/// <summary>
/// User entity for tracking quiz progress and statistics.
/// No authentication - just identification for progress tracking.
/// </summary>
public class User : Entity<Guid>
{
    /// <summary>
    /// Display name for the user.
    /// </summary>
    public string DisplayName { get; private set; }

    /// <summary>
    /// Optional email for user identification.
    /// Not used for authentication.
    /// </summary>
    public string? Email { get; private set; }

    /// <summary>
    /// When the user was created.
    /// </summary>
    public DateTime CreatedAt { get; private set; }

    /// <summary>
    /// Last activity timestamp.
    /// </summary>
    public DateTime LastActiveAt { get; private set; }

    /// <summary>
    /// Total quizzes completed.
    /// </summary>
    public int TotalQuizzesTaken { get; private set; }

    /// <summary>
    /// Total cards reviewed.
    /// </summary>
    public int TotalCardsReviewed { get; private set; }

    /// <summary>
    /// Total correct answers across all quizzes.
    /// </summary>
    public int TotalCorrectAnswers { get; private set; }

    /// <summary>
    /// Current streak (consecutive days with activity).
    /// </summary>
    public int CurrentStreak { get; private set; }

    /// <summary>
    /// Longest streak achieved.
    /// </summary>
    public int LongestStreak { get; private set; }

    /// <summary>
    /// Last date the user was active (for streak calculation).
    /// </summary>
    public DateTime? LastActivityDate { get; private set; }

    // Constructor for EF Core / Dapper / Reflection
    private User() 
    { 
        DisplayName = string.Empty;
    }

    public User(
        Guid id,
        string displayName,
        string? email = null,
        DateTime? createdAt = null
    ) : base(id)
    {
        DisplayName = displayName ?? throw new ArgumentNullException(nameof(displayName));
        Email = email;
        CreatedAt = createdAt ?? DateTime.UtcNow;
        LastActiveAt = CreatedAt;
        TotalQuizzesTaken = 0;
        TotalCardsReviewed = 0;
        TotalCorrectAnswers = 0;
        CurrentStreak = 0;
        LongestStreak = 0;
        LastActivityDate = null;
    }

    /// <summary>
    /// Creates a new user.
    /// </summary>
    public static User Create(string displayName, string? email = null)
    {
        return new User(Guid.NewGuid(), displayName, email);
    }

    /// <summary>
    /// Updates the display name.
    /// </summary>
    public void UpdateDisplayName(string displayName)
    {
        DisplayName = displayName ?? throw new ArgumentNullException(nameof(displayName));
    }

    /// <summary>
    /// Records a quiz completion and updates stats.
    /// </summary>
    public void RecordQuizCompletion(int cardsReviewed, int correctAnswers)
    {
        TotalQuizzesTaken++;
        TotalCardsReviewed += cardsReviewed;
        TotalCorrectAnswers += correctAnswers;
        UpdateActivity();
    }

    /// <summary>
    /// Records a single card review.
    /// </summary>
    public void RecordCardReview(bool isCorrect)
    {
        TotalCardsReviewed++;
        if (isCorrect) TotalCorrectAnswers++;
        UpdateActivity();
    }

    /// <summary>
    /// Updates the last activity timestamp and calculates streak.
    /// </summary>
    public void UpdateActivity()
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        LastActiveAt = now;

        if (LastActivityDate == null)
        {
            // First activity
            CurrentStreak = 1;
            LongestStreak = 1;
        }
        else
        {
            var lastDate = LastActivityDate.Value.Date;
            var daysDiff = (today - lastDate).Days;

            if (daysDiff == 0)
            {
                // Same day, no streak change
            }
            else if (daysDiff == 1)
            {
                // Consecutive day, increment streak
                CurrentStreak++;
                if (CurrentStreak > LongestStreak)
                {
                    LongestStreak = CurrentStreak;
                }
            }
            else
            {
                // Streak broken, reset to 1
                CurrentStreak = 1;
            }
        }

        LastActivityDate = today;
    }

    /// <summary>
    /// Gets the accuracy percentage.
    /// </summary>
    public double GetAccuracyPercentage()
    {
        if (TotalCardsReviewed == 0) return 0;
        return (double)TotalCorrectAnswers / TotalCardsReviewed * 100;
    }
}
