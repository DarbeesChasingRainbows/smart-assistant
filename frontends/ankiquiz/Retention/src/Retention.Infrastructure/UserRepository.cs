using Dapper;
using Npgsql;
using Retention.Domain.Entities;
using Retention.Domain.Repositories;

namespace Retention.Infrastructure;

/// <summary>
/// Dapper-based repository for User entity.
/// </summary>
public class UserRepository : IUserRepository
{
    private readonly string _connectionString;

    public UserRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<User?> GetByIdAsync(Guid id)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        const string sql = @"
            SELECT id, display_name as DisplayName, email, created_at as CreatedAt, 
                   last_active_at as LastActiveAt, total_quizzes_taken as TotalQuizzesTaken,
                   total_cards_reviewed as TotalCardsReviewed, total_correct_answers as TotalCorrectAnswers,
                   current_streak as CurrentStreak, longest_streak as LongestStreak,
                   last_activity_date as LastActivityDate
            FROM users 
            WHERE id = @Id";
        return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Id = id });
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        const string sql = @"
            SELECT id, display_name as DisplayName, email, created_at as CreatedAt, 
                   last_active_at as LastActiveAt, total_quizzes_taken as TotalQuizzesTaken,
                   total_cards_reviewed as TotalCardsReviewed, total_correct_answers as TotalCorrectAnswers,
                   current_streak as CurrentStreak, longest_streak as LongestStreak,
                   last_activity_date as LastActivityDate
            FROM users 
            WHERE LOWER(email) = LOWER(@Email)";
        return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Email = email });
    }

    public async Task<IEnumerable<User>> GetAllAsync()
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        const string sql = @"
            SELECT id, display_name as DisplayName, email, created_at as CreatedAt, 
                   last_active_at as LastActiveAt, total_quizzes_taken as TotalQuizzesTaken,
                   total_cards_reviewed as TotalCardsReviewed, total_correct_answers as TotalCorrectAnswers,
                   current_streak as CurrentStreak, longest_streak as LongestStreak,
                   last_activity_date as LastActivityDate
            FROM users 
            ORDER BY created_at DESC";
        return await connection.QueryAsync<User>(sql);
    }

    public async Task<IEnumerable<User>> GetTopByStreakAsync(int count = 10)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        const string sql = @"
            SELECT id, display_name as DisplayName, email, created_at as CreatedAt, 
                   last_active_at as LastActiveAt, total_quizzes_taken as TotalQuizzesTaken,
                   total_cards_reviewed as TotalCardsReviewed, total_correct_answers as TotalCorrectAnswers,
                   current_streak as CurrentStreak, longest_streak as LongestStreak,
                   last_activity_date as LastActivityDate
            FROM users 
            ORDER BY longest_streak DESC, current_streak DESC
            LIMIT @Count";
        return await connection.QueryAsync<User>(sql, new { Count = count });
    }

    public async Task<IEnumerable<User>> GetTopByQuizCountAsync(int count = 10)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        const string sql = @"
            SELECT id, display_name as DisplayName, email, created_at as CreatedAt, 
                   last_active_at as LastActiveAt, total_quizzes_taken as TotalQuizzesTaken,
                   total_cards_reviewed as TotalCardsReviewed, total_correct_answers as TotalCorrectAnswers,
                   current_streak as CurrentStreak, longest_streak as LongestStreak,
                   last_activity_date as LastActivityDate
            FROM users 
            ORDER BY total_quizzes_taken DESC
            LIMIT @Count";
        return await connection.QueryAsync<User>(sql, new { Count = count });
    }

    public async Task<IEnumerable<User>> GetTopByAccuracyAsync(int count = 10, int minCardsReviewed = 50)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        const string sql = @"
            SELECT id, display_name as DisplayName, email, created_at as CreatedAt, 
                   last_active_at as LastActiveAt, total_quizzes_taken as TotalQuizzesTaken,
                   total_cards_reviewed as TotalCardsReviewed, total_correct_answers as TotalCorrectAnswers,
                   current_streak as CurrentStreak, longest_streak as LongestStreak,
                   last_activity_date as LastActivityDate
            FROM users 
            WHERE total_cards_reviewed >= @MinCards
            ORDER BY (total_correct_answers::float / NULLIF(total_cards_reviewed, 0)) DESC
            LIMIT @Count";
        return await connection.QueryAsync<User>(sql, new { Count = count, MinCards = minCardsReviewed });
    }

    public async Task AddAsync(User user)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        const string sql = @"
            INSERT INTO users (id, display_name, email, created_at, last_active_at, 
                              total_quizzes_taken, total_cards_reviewed, total_correct_answers,
                              current_streak, longest_streak, last_activity_date)
            VALUES (@Id, @DisplayName, @Email, @CreatedAt, @LastActiveAt,
                    @TotalQuizzesTaken, @TotalCardsReviewed, @TotalCorrectAnswers,
                    @CurrentStreak, @LongestStreak, @LastActivityDate)";
        await connection.ExecuteAsync(sql, user);
    }

    public async Task UpdateAsync(User user)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        const string sql = @"
            UPDATE users 
            SET display_name = @DisplayName,
                email = @Email,
                last_active_at = @LastActiveAt,
                total_quizzes_taken = @TotalQuizzesTaken,
                total_cards_reviewed = @TotalCardsReviewed,
                total_correct_answers = @TotalCorrectAnswers,
                current_streak = @CurrentStreak,
                longest_streak = @LongestStreak,
                last_activity_date = @LastActivityDate
            WHERE id = @Id";
        await connection.ExecuteAsync(sql, user);
    }

    public async Task DeleteAsync(Guid id)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        const string sql = "DELETE FROM users WHERE id = @Id";
        await connection.ExecuteAsync(sql, new { Id = id });
    }

    public async Task<User> GetOrCreateAsync(string displayName, string? email = null)
    {
        // Try to find by email first if provided
        if (!string.IsNullOrEmpty(email))
        {
            var existingByEmail = await GetByEmailAsync(email);
            if (existingByEmail != null)
            {
                return existingByEmail;
            }
        }

        // Try to find by display name
        await using var connection = new NpgsqlConnection(_connectionString);
        const string findSql = @"
            SELECT id, display_name as DisplayName, email, created_at as CreatedAt, 
                   last_active_at as LastActiveAt, total_quizzes_taken as TotalQuizzesTaken,
                   total_cards_reviewed as TotalCardsReviewed, total_correct_answers as TotalCorrectAnswers,
                   current_streak as CurrentStreak, longest_streak as LongestStreak,
                   last_activity_date as LastActivityDate
            FROM users 
            WHERE LOWER(display_name) = LOWER(@DisplayName)
            LIMIT 1";
        
        var existing = await connection.QuerySingleOrDefaultAsync<User>(findSql, new { DisplayName = displayName });
        if (existing != null)
        {
            return existing;
        }

        // Create new user
        var newUser = User.Create(displayName, email);
        await AddAsync(newUser);
        return newUser;
    }
}
