using Retention.Domain.Entities;
using Retention.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Retention.Domain;

public interface IFlashcardService
{
    Task<Flashcard> UpdateCardReviewAsync(Guid cardId, ReviewRating rating);
}
