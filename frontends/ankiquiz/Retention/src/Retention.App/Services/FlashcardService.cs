using Retention.Domain;
using Retention.Domain.Entities;
using System;
using System.Threading.Tasks;

namespace Retention.App.Services;

public class FlashcardService : IFlashcardService
{
    private readonly IFlashcardRepository _flashcardRepository;
    private readonly ISchedulingEngine _schedulingEngine;

    public FlashcardService(IFlashcardRepository flashcardRepository, ISchedulingEngine schedulingEngine)
    {
        _flashcardRepository = flashcardRepository;
        _schedulingEngine = schedulingEngine;
    }

    public async Task<Flashcard> UpdateCardReviewAsync(Guid cardId, ReviewRating rating)
    {
        // Get the current flashcard
        var flashcard = await _flashcardRepository.GetByIdAsync(cardId);
        if (flashcard == null)
        {
            throw new ArgumentException($"Flashcard with ID {cardId} not found");
        }

        // Calculate new scheduling data
        var newScheduling = _schedulingEngine.CalculateNextReview(flashcard.Scheduling, rating);

        // Update the flashcard with new scheduling
        flashcard.UpdateScheduling(newScheduling.NextReviewDate, newScheduling.Interval, newScheduling.Repetitions, newScheduling.EaseFactor);

        // Save to database
        await _flashcardRepository.UpdateAsync(flashcard);

        return flashcard;
    }
}
