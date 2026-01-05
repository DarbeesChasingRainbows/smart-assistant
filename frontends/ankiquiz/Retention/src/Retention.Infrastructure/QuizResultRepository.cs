using Dapper;
using Npgsql;
using Retention.Domain;
using Retention.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Retention.Infrastructure;

public class QuizResultRepository : IQuizResultRepository
{
    private readonly string _connectionString;

    public QuizResultRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }

    public async Task AddAsync(QuizResult result)
    {
        var sql = @"
            INSERT INTO quiz_results (
                id, user_id, deck_id, flashcard_id, is_correct, difficulty, answered_at, raw_answer
            )
            VALUES (
                @Id, @UserId, @DeckId, @FlashcardId, @IsCorrect, @Difficulty, @AnsweredAt, @RawAnswer
            )";

        using (var connection = await GetConnectionAsync())
        {
            await connection.ExecuteAsync(sql, new {
                result.Id,
                result.UserId,
                result.DeckId,
                result.FlashcardId,
                result.IsCorrect,
                result.Difficulty,
                result.AnsweredAt,
                result.RawAnswer
            });
        }
    }

    public async Task<IEnumerable<QuizResult>> GetByUserIdAsync(string userId, int limit = 100)
    {
        var sql = @"
            SELECT 
                id, user_id as UserId, deck_id as DeckId, flashcard_id as FlashcardId,
                is_correct as IsCorrect, difficulty as Difficulty, answered_at as AnsweredAt, raw_answer as RawAnswer
            FROM quiz_results
            WHERE user_id = @UserId
            ORDER BY answered_at DESC
            LIMIT @Limit";

        using (var connection = await GetConnectionAsync())
        {
            var dtos = await connection.QueryAsync<QuizResultDto>(sql, new { UserId = userId, Limit = limit });
            return dtos.Select(dto => dto.ToDomain());
        }
    }

    public async Task<IEnumerable<QuizResult>> GetByDeckIdAsync(Guid deckId, int limit = 100)
    {
        var sql = @"
            SELECT 
                id, user_id as UserId, deck_id as DeckId, flashcard_id as FlashcardId,
                is_correct as IsCorrect, difficulty as Difficulty, answered_at as AnsweredAt, raw_answer as RawAnswer
            FROM quiz_results
            WHERE deck_id = @DeckId
            ORDER BY answered_at DESC
            LIMIT @Limit";

        using (var connection = await GetConnectionAsync())
        {
            var dtos = await connection.QueryAsync<QuizResultDto>(sql, new { DeckId = deckId, Limit = limit });
            return dtos.Select(dto => dto.ToDomain());
        }
    }
}

public class QuizResultDto
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public Guid DeckId { get; set; }
    public Guid FlashcardId { get; set; }
    public bool IsCorrect { get; set; }
    public string Difficulty { get; set; } = string.Empty;
    public DateTime AnsweredAt { get; set; }
    public string? RawAnswer { get; set; }

    public QuizResult ToDomain()
    {
        return new QuizResult(
            Id,
            UserId,
            DeckId,
            FlashcardId,
            IsCorrect,
            Difficulty,
            AnsweredAt,
            RawAnswer
        );
    }
}
