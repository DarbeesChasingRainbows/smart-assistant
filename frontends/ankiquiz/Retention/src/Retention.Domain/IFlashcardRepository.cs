using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Retention.Domain.Entities;

namespace Retention.Domain;

public interface IFlashcardRepository
{
    Task<Flashcard?> GetByIdAsync(Guid id);
    Task<IEnumerable<Flashcard>> GetAllAsync();
    Task<IEnumerable<Flashcard>> GetDueCardsAsync(DateTime now);
    Task<IEnumerable<Flashcard>> GetByDeckIdAsync(Guid deckId);
    Task<IEnumerable<Flashcard>> FindSimilarQuestionsAsync(Guid deckId, string question, double similarityThreshold = 0.7);
    Task AddAsync(Flashcard flashcard);
    Task UpdateAsync(Flashcard flashcard);
    Task DeleteAsync(Guid id);
}
