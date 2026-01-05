using Dapper;
using Npgsql;
using Retention.Domain;
using Retention.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Retention.Infrastructure;

public class DeckRepository : IDeckRepository
{
    private readonly string _connectionString;

    public DeckRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }

    public async Task<Deck?> GetByIdAsync(Guid id)
    {
        var sql = @"
            SELECT 
                d.id, d.name, d.description, d.category, d.subcategory, d.difficulty_level as DifficultyLevel, d.created_at as CreatedAt, d.updated_at as UpdatedAt,
                f.id, f.deck_id as DeckId, f.question, f.answer, f.metadata, 
                f.next_review_date as NextReviewDate, f.interval_days as Interval, 
                f.repetitions, f.ease_factor as EaseFactor,
                f.created_at as CreatedAt, f.updated_at as UpdatedAt
            FROM decks d
            LEFT JOIN flashcards f ON d.id = f.deck_id
            WHERE d.id = @Id";

        using (var connection = await GetConnectionAsync())
        {
            var deckDictionary = new Dictionary<Guid, Deck>();

            var result = await connection.QueryAsync<DeckDto, FlashcardDto, Deck>(
                sql,
                (deckDto, flashcardDto) =>
                {
                    if (!deckDictionary.TryGetValue(deckDto.Id, out var currentDeck))
                    {
                        currentDeck = deckDto.ToDomain();
                        deckDictionary.Add(currentDeck.Id, currentDeck);
                    }

                    if (flashcardDto != null)
                    {
                        currentDeck.AddFlashcard(flashcardDto.ToDomain());
                    }

                    return currentDeck;
                },
                new { Id = id },
                splitOn: "id"
            );

            return deckDictionary.Values.FirstOrDefault();
        }
    }

    public async Task<IEnumerable<Deck>> GetByCategoryAsync(string category, string? subcategory = null)
    {
        var sql = @"
            SELECT 
                d.id, d.name, d.description, d.category, d.subcategory, d.difficulty_level as DifficultyLevel, d.created_at as CreatedAt, d.updated_at as UpdatedAt,
                f.id, f.deck_id as DeckId, f.question, f.answer, f.metadata, 
                f.next_review_date as NextReviewDate, f.interval_days as Interval, 
                f.repetitions, f.ease_factor as EaseFactor,
                f.created_at as CreatedAt, f.updated_at as UpdatedAt
            FROM decks d
            LEFT JOIN flashcards f ON d.id = f.deck_id
            WHERE d.category = @Category
              AND (@Subcategory IS NULL OR d.subcategory = @Subcategory)";

        using (var connection = await GetConnectionAsync())
        {
            var deckDictionary = new Dictionary<Guid, Deck>();

            var result = await connection.QueryAsync<DeckDto, FlashcardDto, Deck>(
                sql,
                (deckDto, flashcardDto) =>
                {
                    if (!deckDictionary.TryGetValue(deckDto.Id, out var currentDeck))
                    {
                        currentDeck = deckDto.ToDomain();
                        deckDictionary.Add(currentDeck.Id, currentDeck);
                    }

                    if (flashcardDto != null)
                    {
                        currentDeck.AddFlashcard(flashcardDto.ToDomain());
                    }

                    return currentDeck;
                },
                new { Category = category, Subcategory = subcategory },
                splitOn: "id"
            );

            return deckDictionary.Values;
        }
    }

    public async Task<IEnumerable<Deck>> GetAllAsync()
    {
        var sql = @"
            SELECT 
                d.id, d.name, d.description, d.category, d.subcategory, d.difficulty_level as DifficultyLevel, d.created_at as CreatedAt, d.updated_at as UpdatedAt,
                f.id, f.deck_id as DeckId, f.question, f.answer, f.metadata, 
                f.next_review_date as NextReviewDate, f.interval_days as Interval, 
                f.repetitions, f.ease_factor as EaseFactor,
                f.created_at as CreatedAt, f.updated_at as UpdatedAt
            FROM decks d
            LEFT JOIN flashcards f ON d.id = f.deck_id";

        using (var connection = await GetConnectionAsync())
        {
            var deckDictionary = new Dictionary<Guid, Deck>();

            var result = await connection.QueryAsync<DeckDto, FlashcardDto, Deck>(
                sql,
                (deckDto, flashcardDto) =>
                {
                    if (!deckDictionary.TryGetValue(deckDto.Id, out var currentDeck))
                    {
                        currentDeck = deckDto.ToDomain();
                        deckDictionary.Add(currentDeck.Id, currentDeck);
                    }

                    if (flashcardDto != null)
                    {
                        currentDeck.AddFlashcard(flashcardDto.ToDomain());
                    }

                    return currentDeck;
                },
                splitOn: "id"
            );

            return deckDictionary.Values;
        }
    }

    public async Task AddAsync(Deck deck)
    {
        var sql = @"
            INSERT INTO decks (id, name, description, category, subcategory, difficulty_level, share_token, created_at, updated_at)
            VALUES (@Id, @Name, @Description, @Category, @Subcategory, @DifficultyLevel, @ShareToken, @CreatedAt, @UpdatedAt)";

        using (var connection = await GetConnectionAsync())
        {
            await connection.ExecuteAsync(sql, new {
                deck.Id, 
                deck.Name, 
                deck.Description, 
                deck.Category, 
                deck.Subcategory,
                DifficultyLevel = deck.DifficultyLevel.ToString().ToLower(),
                deck.ShareToken,
                deck.CreatedAt, 
                deck.UpdatedAt
            });
        }
    }

    public async Task UpdateAsync(Deck deck)
    {
        var sql = @"
            UPDATE decks 
            SET name = @Name, description = @Description, category = @Category, 
                subcategory = @Subcategory, difficulty_level = @DifficultyLevel, 
                share_token = @ShareToken, updated_at = @UpdatedAt
            WHERE id = @Id";

        using (var connection = await GetConnectionAsync())
        {
            await connection.ExecuteAsync(sql, new {
                deck.Id, 
                deck.Name, 
                deck.Description, 
                deck.Category, 
                deck.Subcategory,
                DifficultyLevel = deck.DifficultyLevel.ToString().ToLower(),
                deck.ShareToken,
                deck.UpdatedAt
            });
        }
    }

    public async Task DeleteAsync(Guid id)
    {
        using (var connection = await GetConnectionAsync())
        {
            await connection.ExecuteAsync("DELETE FROM decks WHERE id = @Id", new { Id = id });
        }
    }

    public async Task<Deck?> GetByShareTokenAsync(string shareToken)
    {
        var sql = @"
            SELECT 
                d.id, d.name, d.description, d.category, d.subcategory, d.difficulty_level as DifficultyLevel, 
                d.share_token as ShareToken, d.created_at as CreatedAt, d.updated_at as UpdatedAt,
                f.id, f.deck_id as DeckId, f.question, f.answer, f.metadata, 
                f.next_review_date as NextReviewDate, f.interval_days as Interval, 
                f.repetitions, f.ease_factor as EaseFactor,
                f.created_at as CreatedAt, f.updated_at as UpdatedAt
            FROM decks d
            LEFT JOIN flashcards f ON d.id = f.deck_id
            WHERE d.share_token = @ShareToken";

        using (var connection = await GetConnectionAsync())
        {
            var deckDictionary = new Dictionary<Guid, Deck>();

            var result = await connection.QueryAsync<DeckDto, FlashcardDto, Deck>(
                sql,
                (deckDto, flashcardDto) =>
                {
                    if (!deckDictionary.TryGetValue(deckDto.Id, out var currentDeck))
                    {
                        currentDeck = deckDto.ToDomain();
                        deckDictionary.Add(currentDeck.Id, currentDeck);
                    }

                    if (flashcardDto != null)
                    {
                        currentDeck.AddFlashcard(flashcardDto.ToDomain());
                    }

                    return currentDeck;
                },
                new { ShareToken = shareToken },
                splitOn: "id"
            );

            return deckDictionary.Values.FirstOrDefault();
        }
    }
}

public class DeckDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Subcategory { get; set; } = string.Empty;
    public string DifficultyLevel { get; set; } = string.Empty;
    public string? ShareToken { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Deck ToDomain()
    {
        Enum.TryParse<DifficultyLevel>(DifficultyLevel, true, out var diff);
        var deck = new Deck(Id, Name, Description, Category, Subcategory, diff, CreatedAt, UpdatedAt);
        // Note: ShareToken is set via reflection or a separate method since it's private set
        return deck;
    }
}
