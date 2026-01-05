using Retention.Domain.Entities;

namespace Retention.Domain;

public interface IQuizGenerator
{
    Task<QuizSession> GenerateQuizAsync(QuizDifficulty difficulty, int cardCount = 10, Guid? deckId = null);
}

public class QuizGenerator : IQuizGenerator
{
    private readonly IFlashcardRepository _repository;

    public QuizGenerator(IFlashcardRepository repository)
    {
        _repository = repository;
    }

    public async Task<QuizSession> GenerateQuizAsync(QuizDifficulty difficulty, int cardCount = 10, Guid? deckId = null)
    {
        // 1. Fetch candidate cards
        IEnumerable<Flashcard> candidateCards;
        if (deckId.HasValue)
        {
            candidateCards = await _repository.GetByDeckIdAsync(deckId.Value);
        }
        else
        {
            candidateCards = await _repository.GetDueCardsAsync(DateTime.UtcNow);
        }

        var cards = candidateCards.ToList();
        
        // If we don't have enough cards, take what we have
        if (cards.Count == 0)
        {
            return QuizSession.Create(difficulty, new List<Guid>());
        }
        
        // 2. Apply Logic based on Difficulty (Heuristic Selection)
        IEnumerable<Flashcard> selectedCards;
        
        switch (difficulty)
        {
            case QuizDifficulty.Easy:
                // Prioritize cards with higher EaseFactor (> 2.5) or longer intervals
                selectedCards = cards.OrderByDescending(c => c.Scheduling.EaseFactor).Take(cardCount);
                break;
                
            case QuizDifficulty.Medium:
                // Random mix
                selectedCards = cards.OrderBy(_ => Random.Shared.Next()).Take(cardCount);
                break;
                
            case QuizDifficulty.Difficult:
                // Prioritize cards with lower EaseFactor (< 2.5) or short intervals
                selectedCards = cards.OrderBy(c => c.Scheduling.EaseFactor).Take(cardCount);
                break;
                
            case QuizDifficulty.Expert:
                // Hardest cards + Random "New" (simulated by just taking random due if we lack explicit "New")
                // Focus on low EaseFactor
                selectedCards = cards.OrderBy(c => c.Scheduling.EaseFactor).ThenBy(c => c.Scheduling.Interval).Take(cardCount);
                break;
                
            default:
                selectedCards = cards.Take(cardCount);
                break;
        }

        var cardIds = selectedCards.Select(c => c.Id).ToList();
        
        // 3. Create Session
        return QuizSession.Create(difficulty, cardIds);
    }
}
