using Retention.Domain.ValueObjects;

namespace Retention.Domain;

public interface ISchedulingEngine
{
    SchedulingData CalculateNextReview(SchedulingData currentData, ReviewRating result);
}

public enum ReviewRating
{
    Again,
    Hard,
    Good,
    Easy
}
