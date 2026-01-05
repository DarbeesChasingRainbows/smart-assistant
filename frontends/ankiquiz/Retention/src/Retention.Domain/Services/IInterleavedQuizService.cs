using Retention.Domain.Entities;

namespace Retention.Domain.Services;

/// <summary>
/// Service for generating interleaved quiz sessions that pull cards from multiple decks.
/// Interleaving improves learning by mixing subjects and preventing consecutive same-deck cards.
/// </summary>
public interface IInterleavedQuizService
{
    /// <summary>
    /// Creates an interleaved quiz session from multiple decks.
    /// </summary>
    /// <param name="deckIds">List of deck IDs to include in the session</param>
    /// <param name="cardsPerDeck">Maximum cards to pull from each deck</param>
    /// <param name="difficulty">Difficulty level for card selection</param>
    /// <returns>Quiz session with interleaved cards from all selected decks</returns>
    Task<InterleavedQuizSession> CreateInterleavedSessionAsync(
        IEnumerable<Guid> deckIds, 
        int cardsPerDeck = 5, 
        string difficulty = "Medium");
}

/// <summary>
/// Represents an interleaved quiz session with cards from multiple decks.
/// </summary>
public class InterleavedQuizSession
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public List<InterleavedCard> Cards { get; set; } = new();
    public Dictionary<Guid, DeckInfo> DeckInfos { get; set; } = new();
    public string Difficulty { get; set; } = "Medium";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int TotalCards => Cards.Count;
}

/// <summary>
/// A card in an interleaved session with deck context.
/// </summary>
public class InterleavedCard
{
    public Guid CardId { get; set; }
    public Guid DeckId { get; set; }
    public string DeckName { get; set; } = string.Empty;
    public string DeckCategory { get; set; } = string.Empty;
    public int PositionInSession { get; set; }
}

/// <summary>
/// Summary info about a deck in an interleaved session.
/// </summary>
public class DeckInfo
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int CardCount { get; set; }
}
