using Retention.Domain;
using Retention.Domain.Entities;
using Retention.Domain.Services;

namespace Retention.Infrastructure.Services;

/// <summary>
/// Implements interleaved quiz generation that mixes cards from multiple decks.
/// Uses a shuffling algorithm that prevents consecutive same-deck cards.
/// </summary>
public class InterleavedQuizService : IInterleavedQuizService
{
    private readonly IDeckRepository _deckRepository;
    private readonly IFlashcardRepository _flashcardRepository;

    public InterleavedQuizService(IDeckRepository deckRepository, IFlashcardRepository flashcardRepository)
    {
        _deckRepository = deckRepository;
        _flashcardRepository = flashcardRepository;
    }

    public async Task<InterleavedQuizSession> CreateInterleavedSessionAsync(
        IEnumerable<Guid> deckIds, 
        int cardsPerDeck = 5, 
        string difficulty = "Medium")
    {
        var deckIdList = deckIds.ToList();
        if (deckIdList.Count == 0)
            throw new ArgumentException("At least one deck must be selected", nameof(deckIds));

        var session = new InterleavedQuizSession
        {
            Difficulty = difficulty
        };

        var allCards = new List<(Flashcard Card, Deck Deck)>();

        // Gather cards from each deck
        foreach (var deckId in deckIdList)
        {
            var deck = await _deckRepository.GetByIdAsync(deckId);
            if (deck == null) continue;

            var flashcards = await _flashcardRepository.GetByDeckIdAsync(deckId);
            var selectedCards = SelectCardsByDifficulty(flashcards, difficulty, cardsPerDeck);

            session.DeckInfos[deckId] = new DeckInfo
            {
                Id = deckId,
                Name = deck.Name,
                Category = deck.Category,
                CardCount = selectedCards.Count
            };

            foreach (var card in selectedCards)
            {
                allCards.Add((card, deck));
            }
        }

        // Interleave cards to avoid consecutive same-deck cards
        var interleavedCards = InterleaveCards(allCards);

        // Build the session cards with position info
        for (int i = 0; i < interleavedCards.Count; i++)
        {
            var (card, deck) = interleavedCards[i];
            session.Cards.Add(new InterleavedCard
            {
                CardId = card.Id,
                DeckId = deck.Id,
                DeckName = deck.Name,
                DeckCategory = deck.Category,
                PositionInSession = i
            });
        }

        return session;
    }

    private List<Flashcard> SelectCardsByDifficulty(IEnumerable<Flashcard> flashcards, string difficulty, int count)
    {
        var cards = flashcards.ToList();
        var now = DateTime.UtcNow;

        // Sort by priority based on difficulty
        var prioritized = difficulty.ToLower() switch
        {
            "easy" => cards
                .OrderByDescending(c => c.Scheduling.EaseFactor) // Prefer easier cards
                .ThenBy(c => c.Scheduling.NextReviewDate)
                .ToList(),
            
            "hard" or "expert" => cards
                .OrderBy(c => c.Scheduling.EaseFactor) // Prefer harder cards
                .ThenByDescending(c => c.Scheduling.Repetitions == 0 ? 1 : 0) // New cards
                .ThenBy(c => c.Scheduling.NextReviewDate)
                .ToList(),
            
            _ => cards // Medium - balanced mix
                .OrderBy(c => c.Scheduling.NextReviewDate <= now ? 0 : 1) // Due cards first
                .ThenBy(_ => Random.Shared.Next()) // Then random
                .ToList()
        };

        return prioritized.Take(count).ToList();
    }

    /// <summary>
    /// Interleaves cards from multiple decks to avoid consecutive same-deck cards.
    /// Uses a round-robin approach with randomization within each round.
    /// </summary>
    private List<(Flashcard Card, Deck Deck)> InterleaveCards(List<(Flashcard Card, Deck Deck)> allCards)
    {
        if (allCards.Count <= 1) return allCards;

        // Group by deck
        var byDeck = allCards
            .GroupBy(c => c.Deck.Id)
            .Select(g => new Queue<(Flashcard Card, Deck Deck)>(g.OrderBy(_ => Random.Shared.Next())))
            .ToList();

        var result = new List<(Flashcard Card, Deck Deck)>();
        Guid? lastDeckId = null;

        while (byDeck.Any(q => q.Count > 0))
        {
            // Find queues that have cards and aren't the same as last deck
            var availableQueues = byDeck
                .Where(q => q.Count > 0 && (lastDeckId == null || q.Peek().Deck.Id != lastDeckId))
                .ToList();

            // If no available queues (all remaining cards are from same deck), just take any
            if (availableQueues.Count == 0)
            {
                availableQueues = byDeck.Where(q => q.Count > 0).ToList();
            }

            if (availableQueues.Count == 0) break;

            // Pick a random queue from available ones
            var selectedQueue = availableQueues[Random.Shared.Next(availableQueues.Count)];
            var card = selectedQueue.Dequeue();
            result.Add(card);
            lastDeckId = card.Deck.Id;
        }

        return result;
    }
}
