using Dapper;
using Npgsql;
using Retention.Domain;
using Retention.Domain.Entities;
using Retention.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace Retention.Infrastructure;

public class FlashcardRepository : IFlashcardRepository
{
    private readonly string _connectionString;

    public FlashcardRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }

    public async Task<Flashcard?> GetByIdAsync(Guid id)
    {
        var sql = @"
            SELECT 
                id, deck_id as DeckId, question, answer, metadata, 
                next_review_date as NextReviewDate, interval_days as Interval, 
                repetitions, ease_factor as EaseFactor,
                created_at as CreatedAt, updated_at as UpdatedAt
            FROM flashcards 
            WHERE id = @Id";

        using (var connection = await GetConnectionAsync())
        {
            var result = await connection.QueryFirstOrDefaultAsync<FlashcardDto>(sql, new { Id = id });
            return result?.ToDomain();
        }
    }

    public async Task<IEnumerable<Flashcard>> GetAllAsync()
    {
        var sql = @"
            SELECT 
                id, deck_id as DeckId, question, answer, metadata, 
                next_review_date as NextReviewDate, interval_days as Interval, 
                repetitions, ease_factor as EaseFactor,
                created_at as CreatedAt, updated_at as UpdatedAt
            FROM flashcards";

        using (var connection = await GetConnectionAsync())
        {
            var results = await connection.QueryAsync<FlashcardDto>(sql);
            return results.Select(dto => dto.ToDomain());
        }
    }

    public async Task<IEnumerable<Flashcard>> GetByDeckIdAsync(Guid deckId)
    {
        var sql = @"
            SELECT 
                id, deck_id as DeckId, question, answer, metadata, 
                next_review_date as NextReviewDate, interval_days as Interval, 
                repetitions, ease_factor as EaseFactor,
                created_at as CreatedAt, updated_at as UpdatedAt
            FROM flashcards
            WHERE deck_id = @DeckId";

        using (var connection = await GetConnectionAsync())
        {
            var results = await connection.QueryAsync<FlashcardDto>(sql, new { DeckId = deckId });
            return results.Select(dto => dto.ToDomain());
        }
    }

    public async Task<IEnumerable<Flashcard>> GetDueCardsAsync(DateTime now)
    {
        var sql = @"
            SELECT 
                id, deck_id as DeckId, question, answer, metadata, 
                next_review_date as NextReviewDate, interval_days as Interval, 
                repetitions, ease_factor as EaseFactor,
                created_at as CreatedAt, updated_at as UpdatedAt
            FROM flashcards 
            WHERE next_review_date <= @Now";

        using (var connection = await GetConnectionAsync())
        {
            var results = await connection.QueryAsync<FlashcardDto>(sql, new { Now = now });
            return results.Select(dto => dto.ToDomain());
        }
    }

    public async Task AddAsync(Flashcard flashcard)
    {
        var sql = @"
            INSERT INTO flashcards (
                id, deck_id, question, answer, metadata, 
                next_review_date, interval_days, repetitions, ease_factor,
                created_at, updated_at
            )
            VALUES (
                @Id, @DeckId, @Question, @Answer, @Metadata::jsonb, 
                @NextReviewDate, @Interval, @Repetitions, @EaseFactor,
                @CreatedAt, @UpdatedAt
            )";

        using (var connection = await GetConnectionAsync())
        {
            var dto = FlashcardDto.FromDomain(flashcard);
            await connection.ExecuteAsync(sql, dto);
        }
    }

    public async Task UpdateAsync(Flashcard flashcard)
    {
        var sql = @"
            UPDATE flashcards SET
                question = @Question,
                answer = @Answer,
                metadata = @Metadata::jsonb,
                next_review_date = @NextReviewDate,
                interval_days = @Interval,
                repetitions = @Repetitions,
                ease_factor = @EaseFactor,
                updated_at = @UpdatedAt
            WHERE id = @Id";

        using (var connection = await GetConnectionAsync())
        {
            var dto = FlashcardDto.FromDomain(flashcard);
            await connection.ExecuteAsync(sql, dto);
        }
    }

    public async Task DeleteAsync(Guid id)
    {
        var sql = "DELETE FROM flashcards WHERE id = @Id";
        using (var connection = await GetConnectionAsync())
        {
            await connection.ExecuteAsync(sql, new { Id = id });
        }
    }

    public async Task<IEnumerable<Flashcard>> FindSimilarQuestionsAsync(Guid deckId, string question, double similarityThreshold = 0.7)
    {
        // Use PostgreSQL's trigram similarity for fuzzy matching
        // Requires pg_trgm extension: CREATE EXTENSION IF NOT EXISTS pg_trgm;
        var sql = @"
            SELECT 
                id, deck_id as DeckId, question, answer, metadata, 
                next_review_date as NextReviewDate, interval_days as Interval, 
                repetitions, ease_factor as EaseFactor,
                created_at as CreatedAt, updated_at as UpdatedAt,
                similarity(LOWER(question), LOWER(@Question)) as sim_score
            FROM flashcards
            WHERE deck_id = @DeckId
              AND similarity(LOWER(question), LOWER(@Question)) >= @Threshold
            ORDER BY sim_score DESC
            LIMIT 5";

        using var connection = await GetConnectionAsync();
        
        // Try with trigram similarity first, fall back to LIKE if extension not available
        try
        {
            var results = await connection.QueryAsync<FlashcardDto>(sql, new 
            { 
                DeckId = deckId, 
                Question = question,
                Threshold = similarityThreshold 
            });
            return results.Select(dto => dto.ToDomain());
        }
        catch
        {
            // Fallback: simple LIKE-based search for exact substring matches
            var fallbackSql = @"
                SELECT 
                    id, deck_id as DeckId, question, answer, metadata, 
                    next_review_date as NextReviewDate, interval_days as Interval, 
                    repetitions, ease_factor as EaseFactor,
                    created_at as CreatedAt, updated_at as UpdatedAt
                FROM flashcards
                WHERE deck_id = @DeckId
                  AND LOWER(question) LIKE '%' || LOWER(@Question) || '%'
                LIMIT 5";

            var results = await connection.QueryAsync<FlashcardDto>(fallbackSql, new 
            { 
                DeckId = deckId, 
                Question = question 
            });
            return results.Select(dto => dto.ToDomain());
        }
    }
}

public class FlashcardDto
{
    public Guid Id { get; set; }
    public Guid DeckId { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public string Metadata { get; set; } = string.Empty; // JSON string
    public DateTime NextReviewDate { get; set; }
    public int Interval { get; set; }
    public int Repetitions { get; set; }
    public double EaseFactor { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Flashcard ToDomain()
    {
        var schedulingData = new SchedulingData(NextReviewDate, Interval, Repetitions, EaseFactor);
        
        QuestionMetadata? questionMetadata = null;
        if (!string.IsNullOrEmpty(Metadata))
        {
            try 
            {
                questionMetadata = JsonSerializer.Deserialize<QuestionMetadata>(Metadata);
            }
            catch { /* Log or ignore */ }
        }

        return new Flashcard(Id, DeckId, Question, Answer, questionMetadata ?? QuestionMetadata.Simple(), schedulingData);
    }

    public static FlashcardDto FromDomain(Flashcard flashcard)
    {
        return new FlashcardDto
        {
            Id = flashcard.Id,
            DeckId = flashcard.DeckId,
            Question = flashcard.Question,
            Answer = flashcard.Answer,
            Metadata = JsonSerializer.Serialize(flashcard.Metadata),
            NextReviewDate = flashcard.Scheduling.NextReviewDate,
            Interval = flashcard.Scheduling.Interval,
            Repetitions = flashcard.Scheduling.Repetitions,
            EaseFactor = flashcard.Scheduling.EaseFactor,
            CreatedAt = flashcard.CreatedAt,
            UpdatedAt = flashcard.UpdatedAt
        };
    }
}
