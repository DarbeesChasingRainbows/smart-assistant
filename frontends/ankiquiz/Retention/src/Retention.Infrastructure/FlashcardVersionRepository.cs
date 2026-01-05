using Dapper;
using Npgsql;
using Retention.Domain.Entities;
using Retention.Domain.Repositories;

namespace Retention.Infrastructure;

public class FlashcardVersionRepository : IFlashcardVersionRepository
{
    private readonly string _connectionString;

    public FlashcardVersionRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }

    public async Task<FlashcardVersion?> GetByIdAsync(Guid id)
    {
        const string sql = @"
            SELECT id, flashcard_id as FlashcardId, question, answer, 
                   version_number as VersionNumber, edit_reason as EditReason, created_at as CreatedAt
            FROM flashcard_versions
            WHERE id = @Id";

        using var connection = await GetConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<FlashcardVersion>(sql, new { Id = id });
    }

    public async Task<IEnumerable<FlashcardVersion>> GetByFlashcardIdAsync(Guid flashcardId)
    {
        const string sql = @"
            SELECT id, flashcard_id as FlashcardId, question, answer, 
                   version_number as VersionNumber, edit_reason as EditReason, created_at as CreatedAt
            FROM flashcard_versions
            WHERE flashcard_id = @FlashcardId
            ORDER BY version_number DESC";

        using var connection = await GetConnectionAsync();
        return await connection.QueryAsync<FlashcardVersion>(sql, new { FlashcardId = flashcardId });
    }

    public async Task<FlashcardVersion?> GetLatestVersionAsync(Guid flashcardId)
    {
        const string sql = @"
            SELECT id, flashcard_id as FlashcardId, question, answer, 
                   version_number as VersionNumber, edit_reason as EditReason, created_at as CreatedAt
            FROM flashcard_versions
            WHERE flashcard_id = @FlashcardId
            ORDER BY version_number DESC
            LIMIT 1";

        using var connection = await GetConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<FlashcardVersion>(sql, new { FlashcardId = flashcardId });
    }

    public async Task<int> GetNextVersionNumberAsync(Guid flashcardId)
    {
        const string sql = @"
            SELECT COALESCE(MAX(version_number), 0) + 1
            FROM flashcard_versions
            WHERE flashcard_id = @FlashcardId";

        using var connection = await GetConnectionAsync();
        return await connection.ExecuteScalarAsync<int>(sql, new { FlashcardId = flashcardId });
    }

    public async Task AddAsync(FlashcardVersion version)
    {
        const string sql = @"
            INSERT INTO flashcard_versions (id, flashcard_id, question, answer, version_number, edit_reason, created_at)
            VALUES (@Id, @FlashcardId, @Question, @Answer, @VersionNumber, @EditReason, @CreatedAt)";

        using var connection = await GetConnectionAsync();
        await connection.ExecuteAsync(sql, new
        {
            version.Id,
            version.FlashcardId,
            version.Question,
            version.Answer,
            version.VersionNumber,
            version.EditReason,
            version.CreatedAt
        });
    }
}
