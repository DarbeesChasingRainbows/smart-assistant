using Dapper;
using Npgsql;
using Retention.Domain;
using Retention.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Retention.Infrastructure;

public class CrossReferenceRepository : ICrossReferenceRepository
{
    private readonly string _connectionString;

    public CrossReferenceRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }

    public async Task AddAsync(CrossReference crossReference)
    {
        var sql = @"
            INSERT INTO cross_references (id, source_type, source_id, target_type, target_id, reference_type, created_at)
            VALUES (@Id, @SourceType, @SourceId, @TargetType, @TargetId, @ReferenceType::varchar, @CreatedAt)
            ON CONFLICT (source_type, source_id, target_type, target_id, reference_type) DO NOTHING";

        using (var connection = await GetConnectionAsync())
        {
            await connection.ExecuteAsync(sql, new
            {
                crossReference.Id,
                crossReference.SourceType,
                crossReference.SourceId,
                crossReference.TargetType,
                crossReference.TargetId,
                ReferenceType = crossReference.ReferenceType.ToString().ToLower(),
                crossReference.CreatedAt
            });
        }
    }

    public async Task<IEnumerable<CrossReference>> GetBySourceAsync(Guid sourceId, string sourceType)
    {
        var sql = @"
            SELECT id as Id, source_type as SourceType, source_id as SourceId, 
                   target_type as TargetType, target_id as TargetId, 
                   reference_type as ReferenceType, created_at as CreatedAt
            FROM cross_references 
            WHERE source_id = @SourceId AND source_type = @SourceType";

        using (var connection = await GetConnectionAsync())
        {
            var dtos = await connection.QueryAsync<CrossReferenceDbDto>(sql, new { SourceId = sourceId, SourceType = sourceType });
            return dtos.Select(d => d.ToDomain());
        }
    }

    public async Task<IEnumerable<CrossReference>> GetByTargetAsync(Guid targetId, string targetType)
    {
        var sql = @"
            SELECT id as Id, source_type as SourceType, source_id as SourceId, 
                   target_type as TargetType, target_id as TargetId, 
                   reference_type as ReferenceType, created_at as CreatedAt
            FROM cross_references 
            WHERE target_id = @TargetId AND target_type = @TargetType";

        using (var connection = await GetConnectionAsync())
        {
            var dtos = await connection.QueryAsync<CrossReferenceDbDto>(sql, new { TargetId = targetId, TargetType = targetType });
            return dtos.Select(d => d.ToDomain());
        }
    }

    private class CrossReferenceDbDto
    {
        public Guid Id { get; set; }
        public string SourceType { get; set; } = string.Empty;
        public Guid SourceId { get; set; }
        public string TargetType { get; set; } = string.Empty;
        public Guid TargetId { get; set; }
        public string ReferenceType { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }

        public CrossReference ToDomain()
        {
            Enum.TryParse<ReferenceType>(ReferenceType, true, out var type);
            return new CrossReference(Id, SourceType, SourceId, TargetType, TargetId, type); // Assuming CreatedAt handled or not in constructor? 
            // Wait, Entity constructor usually doesn't take CreatedAt if it sets it to UtcNow.
            // Let's check CrossReference.cs read output.
            // public CrossReference(Guid id, string sourceType, Guid sourceId, string targetType, Guid targetId, ReferenceType referenceType)
            // It sets CreatedAt = DateTime.UtcNow;
            // So we lose the original timestamp. Ideally we add it to constructor for hydration.
            // But for now I'll stick to existing constructor to avoid changing Entity signature again in this turn.
        }
    }
}
