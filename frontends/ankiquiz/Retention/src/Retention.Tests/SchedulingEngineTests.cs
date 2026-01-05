using Retention.Domain;
using Retention.Domain.ValueObjects;
using Xunit;

namespace Retention.Tests;

public class SchedulingEngineTests
{
    private readonly SchedulingEngine _sut = new();

    [Fact]
    public void CalculateNextReview_ShouldResetToDayOne_WhenResultIsAgain()
    {
        // Arrange
        var current = new SchedulingData(
            interval: 5,
            repetitions: 3,
            easeFactor: 2.5f,
            nextReviewDate: DateTime.UtcNow.AddDays(5)
        );

        // Act
        var result = _sut.CalculateNextReview(current, ReviewRating.Again);

        // Assert
        Assert.Equal(1, result.Interval);
        Assert.Equal(0, result.Repetitions);
        Assert.True(result.EaseFactor < 2.5f);
        Assert.Equal(DateTime.UtcNow.AddDays(1).Date, result.NextReviewDate.Date);
    }

    [Fact]
    public void CalculateNextReview_ShouldIncreaseInterval_WhenResultIsGood()
    {
        // Arrange
        var current = new SchedulingData(
            interval: 1,
            repetitions: 0,
            easeFactor: 2.5f,
            nextReviewDate: DateTime.UtcNow.AddDays(1)
        );

        // Act
        var result = _sut.CalculateNextReview(current, ReviewRating.Good);

        // Assert
        Assert.True(result.Interval > current.Interval);
        Assert.True(result.Repetitions > current.Repetitions);
        Assert.Equal(current.EaseFactor, result.EaseFactor);
    }

    [Fact]
    public void CalculateNextReview_ShouldDecreaseEaseFactor_WhenResultIsAgain()
    {
        // Arrange
        var current = new SchedulingData(
            interval: 5,
            repetitions: 3,
            easeFactor: 2.5f,
            nextReviewDate: DateTime.UtcNow.AddDays(5)
        );

        // Act
        var result = _sut.CalculateNextReview(current, ReviewRating.Again);

        // Assert
        Assert.True(result.EaseFactor < current.EaseFactor);
        Assert.Equal(1, result.Interval);
        Assert.Equal(0, result.Repetitions);
    }
}
