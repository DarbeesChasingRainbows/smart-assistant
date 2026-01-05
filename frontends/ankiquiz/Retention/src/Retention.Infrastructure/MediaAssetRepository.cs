using Dapper;
using Npgsql;
using Retention.Domain;
using Retention.Domain.Entities;

namespace Retention.Infrastructure;

public class MediaAssetRepository : IMediaAssetRepository
{
    private readonly string _connectionString;

    public MediaAssetRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }

    public async Task<MediaAsset?> GetByIdAsync(Guid id)
    {
        const string sql = @"
            SELECT 
                id, file_name as FileName, file_path as FilePath, 
                content_type as ContentType, size as Size, 
                associated_entity_id as AssociatedEntityId, 
                associated_entity_type as AssociatedEntityType, 
                created_at as CreatedAt
            FROM media_assets 
            WHERE id = @Id";

        using var connection = await GetConnectionAsync();
        return await connection.QueryFirstOrDefaultAsync<MediaAsset>(sql, new { Id = id });
    }

    public async Task<IEnumerable<MediaAsset>> GetByEntityAsync(Guid entityId)
    {
        const string sql = @"
            SELECT 
                id, file_name as FileName, file_path as FilePath, 
                content_type as ContentType, size as Size, 
                associated_entity_id as AssociatedEntityId, 
                associated_entity_type as AssociatedEntityType, 
                created_at as CreatedAt
            FROM media_assets 
            WHERE associated_entity_id = @EntityId";

        using var connection = await GetConnectionAsync();
        return await connection.QueryAsync<MediaAsset>(sql, new { EntityId = entityId });
    }

    public async Task AddAsync(MediaAsset asset)
    {
        const string sql = @"
            INSERT INTO media_assets (
                id, file_name, file_path, content_type, size, 
                associated_entity_id, associated_entity_type, created_at
            ) VALUES (
                @Id, @FileName, @FilePath, @ContentType, @Size, 
                @AssociatedEntityId, @AssociatedEntityType, @CreatedAt
            )";

        using var connection = await GetConnectionAsync();
        await connection.ExecuteAsync(sql, asset);
    }

    public async Task DeleteAsync(Guid id)
    {
        const string sql = "DELETE FROM media_assets WHERE id = @Id";
        using var connection = await GetConnectionAsync();
        await connection.ExecuteAsync(sql, new { Id = id });
    }
}
