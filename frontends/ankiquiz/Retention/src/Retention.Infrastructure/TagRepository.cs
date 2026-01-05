using Dapper;
using Npgsql;
using Retention.Domain.Entities;
using Retention.Domain.Repositories;

namespace Retention.Infrastructure;

public class TagRepository : ITagRepository
{
    private readonly string _connectionString;

    public TagRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }

    public async Task<Tag?> GetByIdAsync(Guid id)
    {
        const string sql = @"
            SELECT id, name, color, created_at as CreatedAt
            FROM tags
            WHERE id = @Id";

        using var connection = await GetConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Tag>(sql, new { Id = id });
    }

    public async Task<Tag?> GetByNameAsync(string name)
    {
        const string sql = @"
            SELECT id, name, color, created_at as CreatedAt
            FROM tags
            WHERE name = @Name";

        using var connection = await GetConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<Tag>(sql, new { Name = name.ToLowerInvariant().Trim() });
    }

    public async Task<IEnumerable<Tag>> GetAllAsync()
    {
        const string sql = @"
            SELECT id, name, color, created_at as CreatedAt
            FROM tags
            ORDER BY name";

        using var connection = await GetConnectionAsync();
        return await connection.QueryAsync<Tag>(sql);
    }

    public async Task<IEnumerable<Tag>> GetByFlashcardIdAsync(Guid flashcardId)
    {
        const string sql = @"
            SELECT t.id, t.name, t.color, t.created_at as CreatedAt
            FROM tags t
            INNER JOIN flashcard_tags ft ON t.id = ft.tag_id
            WHERE ft.flashcard_id = @FlashcardId
            ORDER BY t.name";

        using var connection = await GetConnectionAsync();
        return await connection.QueryAsync<Tag>(sql, new { FlashcardId = flashcardId });
    }

    public async Task AddAsync(Tag tag)
    {
        const string sql = @"
            INSERT INTO tags (id, name, color, created_at)
            VALUES (@Id, @Name, @Color, @CreatedAt)
            ON CONFLICT (name) DO NOTHING";

        using var connection = await GetConnectionAsync();
        await connection.ExecuteAsync(sql, new
        {
            tag.Id,
            tag.Name,
            tag.Color,
            tag.CreatedAt
        });
    }

    public async Task DeleteAsync(Guid id)
    {
        const string sql = "DELETE FROM tags WHERE id = @Id";

        using var connection = await GetConnectionAsync();
        await connection.ExecuteAsync(sql, new { Id = id });
    }

    public async Task AddTagToFlashcardAsync(Guid flashcardId, Guid tagId)
    {
        const string sql = @"
            INSERT INTO flashcard_tags (flashcard_id, tag_id, tagged_at)
            VALUES (@FlashcardId, @TagId, @TaggedAt)
            ON CONFLICT (flashcard_id, tag_id) DO NOTHING";

        using var connection = await GetConnectionAsync();
        await connection.ExecuteAsync(sql, new
        {
            FlashcardId = flashcardId,
            TagId = tagId,
            TaggedAt = DateTime.UtcNow
        });
    }

    public async Task RemoveTagFromFlashcardAsync(Guid flashcardId, Guid tagId)
    {
        const string sql = @"
            DELETE FROM flashcard_tags
            WHERE flashcard_id = @FlashcardId AND tag_id = @TagId";

        using var connection = await GetConnectionAsync();
        await connection.ExecuteAsync(sql, new { FlashcardId = flashcardId, TagId = tagId });
    }

    public async Task<IEnumerable<Guid>> GetFlashcardIdsByTagAsync(Guid tagId)
    {
        const string sql = @"
            SELECT flashcard_id
            FROM flashcard_tags
            WHERE tag_id = @TagId";

        using var connection = await GetConnectionAsync();
        return await connection.QueryAsync<Guid>(sql, new { TagId = tagId });
    }
}
