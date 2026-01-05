using Dapper;
using Npgsql;
using Retention.Domain;
using Retention.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Retention.Infrastructure;

public class GlossaryRepository : IGlossaryRepository
{
    private readonly string _connectionString;

    public GlossaryRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }

    public async Task<GlossaryTerm?> GetByIdAsync(Guid id)
    {
        using (var connection = await GetConnectionAsync())
        {
            return await connection.QueryFirstOrDefaultAsync<GlossaryTerm>(
                "SELECT * FROM glossary_terms WHERE id = @Id", new { Id = id });
        }
    }

    public async Task<GlossaryTerm?> GetByTermAsync(string term)
    {
        using (var connection = await GetConnectionAsync())
        {
            return await connection.QueryFirstOrDefaultAsync<GlossaryTerm>(
                "SELECT * FROM glossary_terms WHERE lower(term) = lower(@Term)", new { Term = term });
        }
    }

    public async Task<IEnumerable<GlossaryTerm>> SearchTermsAsync(string searchText)
    {
        var sql = @"
            SELECT * FROM glossary_terms 
            WHERE term ILIKE @SearchText 
            OR definition ILIKE @SearchText
            ORDER BY term
            LIMIT 20";

        using (var connection = await GetConnectionAsync())
        {
            return await connection.QueryAsync<GlossaryTerm>(sql, new { SearchText = $"%{searchText}%" });
        }
    }

    public async Task<IEnumerable<GlossaryTerm>> GetByCategoryAsync(string category)
    {
        using (var connection = await GetConnectionAsync())
        {
            return await connection.QueryAsync<GlossaryTerm>(
                "SELECT * FROM glossary_terms WHERE category = @Category", new { Category = category });
        }
    }

    public async Task<IEnumerable<GlossaryTerm>> GetForFlashcardAsync(Guid flashcardId)
    {
        var sql = @"
            SELECT g.* 
            FROM glossary_terms g
            JOIN flashcard_glossary_terms fgt ON g.id = fgt.glossary_term_id
            WHERE fgt.flashcard_id = @FlashcardId";

        using (var connection = await GetConnectionAsync())
        {
            return await connection.QueryAsync<GlossaryTerm>(sql, new { FlashcardId = flashcardId });
        }
    }

    public async Task AddAsync(GlossaryTerm term)
    {
        var sql = @"
            INSERT INTO glossary_terms (id, term, pronunciation, definition, etymology, category, created_at)
            VALUES (@Id, @Term, @Pronunciation, @Definition, @Etymology, @Category, @CreatedAt)";

        using (var connection = await GetConnectionAsync())
        {
            await connection.ExecuteAsync(sql, term);
        }
    }

    public async Task UpdateAsync(GlossaryTerm term)
    {
        var sql = @"
            UPDATE glossary_terms 
            SET term = @Term, pronunciation = @Pronunciation, definition = @Definition, 
                etymology = @Etymology, category = @Category
            WHERE id = @Id";

        using (var connection = await GetConnectionAsync())
        {
            await connection.ExecuteAsync(sql, term);
        }
    }

    public async Task DeleteAsync(Guid id)
    {
        using (var connection = await GetConnectionAsync())
        {
            await connection.ExecuteAsync("DELETE FROM glossary_terms WHERE id = @Id", new { Id = id });
        }
    }
}
