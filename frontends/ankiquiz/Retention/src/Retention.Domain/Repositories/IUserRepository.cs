using Retention.Domain.Entities;

namespace Retention.Domain.Repositories;

/// <summary>
/// Repository interface for User entity operations.
/// </summary>
public interface IUserRepository
{
    /// <summary>
    /// Gets a user by their ID.
    /// </summary>
    Task<User?> GetByIdAsync(Guid id);

    /// <summary>
    /// Gets a user by their email.
    /// </summary>
    Task<User?> GetByEmailAsync(string email);

    /// <summary>
    /// Gets all users.
    /// </summary>
    Task<IEnumerable<User>> GetAllAsync();

    /// <summary>
    /// Gets users with the highest streaks (leaderboard).
    /// </summary>
    Task<IEnumerable<User>> GetTopByStreakAsync(int count = 10);

    /// <summary>
    /// Gets users with the most quizzes taken (leaderboard).
    /// </summary>
    Task<IEnumerable<User>> GetTopByQuizCountAsync(int count = 10);

    /// <summary>
    /// Gets users with the highest accuracy (leaderboard).
    /// </summary>
    Task<IEnumerable<User>> GetTopByAccuracyAsync(int count = 10, int minCardsReviewed = 50);

    /// <summary>
    /// Adds a new user.
    /// </summary>
    Task AddAsync(User user);

    /// <summary>
    /// Updates an existing user.
    /// </summary>
    Task UpdateAsync(User user);

    /// <summary>
    /// Deletes a user.
    /// </summary>
    Task DeleteAsync(Guid id);

    /// <summary>
    /// Gets or creates a user by display name (simple identification).
    /// </summary>
    Task<User> GetOrCreateAsync(string displayName, string? email = null);
}
