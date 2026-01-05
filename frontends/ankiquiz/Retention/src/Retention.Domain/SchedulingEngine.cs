using Retention.Domain.ValueObjects;

namespace Retention.Domain;

public class SchedulingEngine : ISchedulingEngine
{
    // SM-2 Algorithm Implementation
    // Reference: https://super-memory.com/english/ol/sm2.htm

    public SchedulingData CalculateNextReview(SchedulingData currentData, ReviewRating result)
    {
        if (result == ReviewRating.Again)
        {
            return currentData with
            {
                Interval = 1,
                Repetitions = 0,
                EaseFactor = Math.Max(1.3f, currentData.EaseFactor - 0.2f),
                NextReviewDate = DateTime.UtcNow.AddDays(1)
            };
        }

        var newRepetitions = currentData.Repetitions + 1;
        var newInterval = result switch
        {
            ReviewRating.Hard => 3,
            ReviewRating.Good => 4,
            ReviewRating.Easy => 5,
            _ => 1
        };

        // Apply exponential growth for consecutive good reviews
        if (newRepetitions > 1 && result == ReviewRating.Good)
        {
            newInterval = currentData.Interval * 2;
        }

        var easeFactorAdjustment = result switch
        {
            ReviewRating.Hard => -0.15f,
            ReviewRating.Good => 0f,
            ReviewRating.Easy => 0.15f,
            _ => -0.2f
        };

        var newEaseFactor = Math.Max(1.3f, Math.Min(2.5f, currentData.EaseFactor + easeFactorAdjustment));

        return currentData with
        {
            Interval = newInterval,
            Repetitions = newRepetitions,
            EaseFactor = newEaseFactor,
            NextReviewDate = DateTime.UtcNow.AddDays(newInterval)
        };
    }
}
