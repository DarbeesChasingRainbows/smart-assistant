using Microsoft.AspNetCore.Mvc;
using Retention.Domain.Entities;
using Retention.Domain.Repositories;
using Retention.App.Services;

namespace Retention.App.Controllers;

/// <summary>
/// API controller for user management and stats tracking.
/// </summary>
[ApiController]
[Route("api/v1/users")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IUserRepository userRepository, ILogger<UsersController> logger)
    {
        _userRepository = userRepository;
        _logger = logger;
    }

    /// <summary>
    /// Gets all users.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAll()
    {
        var users = await _userRepository.GetAllAsync();
        return Ok(users.Select(UserDto.FromDomain));
    }

    /// <summary>
    /// Gets a user by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserDto>> GetById(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }
        return Ok(UserDto.FromDomain(user));
    }

    /// <summary>
    /// Gets or creates a user by display name (simple identification).
    /// </summary>
    [HttpPost("identify")]
    public async Task<ActionResult<UserDto>> Identify([FromBody] IdentifyUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return BadRequest("Display name is required");
        }

        var user = await _userRepository.GetOrCreateAsync(request.DisplayName, request.Email);
        TelemetryConfiguration.UsersCreated.Add(1);
        
        _logger.LogInformation("User identified: {UserId} ({DisplayName})", user.Id, user.DisplayName);
        return Ok(UserDto.FromDomain(user));
    }

    /// <summary>
    /// Creates a new user.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return BadRequest("Display name is required");
        }

        var user = Retention.Domain.Entities.User.Create(request.DisplayName, request.Email);
        await _userRepository.AddAsync(user);
        
        TelemetryConfiguration.UsersCreated.Add(1);
        _logger.LogInformation("User created: {UserId} ({DisplayName})", user.Id, user.DisplayName);
        
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, UserDto.FromDomain(user));
    }

    /// <summary>
    /// Updates a user's display name.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserDto>> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.DisplayName))
        {
            user.UpdateDisplayName(request.DisplayName);
        }

        await _userRepository.UpdateAsync(user);
        return Ok(UserDto.FromDomain(user));
    }

    /// <summary>
    /// Records a quiz completion for a user.
    /// </summary>
    [HttpPost("{id:guid}/quiz-completed")]
    public async Task<ActionResult<UserDto>> RecordQuizCompletion(Guid id, [FromBody] QuizCompletionRequest request)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        user.RecordQuizCompletion(request.CardsReviewed, request.CorrectAnswers);
        await _userRepository.UpdateAsync(user);

        _logger.LogInformation(
            "Quiz completed for user {UserId}: {CardsReviewed} cards, {CorrectAnswers} correct",
            id, request.CardsReviewed, request.CorrectAnswers);

        return Ok(UserDto.FromDomain(user));
    }

    /// <summary>
    /// Records a single card review for a user.
    /// </summary>
    [HttpPost("{id:guid}/card-reviewed")]
    public async Task<ActionResult<UserDto>> RecordCardReview(Guid id, [FromBody] CardReviewRequest request)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        user.RecordCardReview(request.IsCorrect);
        await _userRepository.UpdateAsync(user);

        TelemetryConfiguration.RecordCardReview(request.IsCorrect, request.Difficulty ?? "unknown");

        return Ok(UserDto.FromDomain(user));
    }

    /// <summary>
    /// Gets the leaderboard by streak.
    /// </summary>
    [HttpGet("leaderboard/streak")]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetLeaderboardByStreak([FromQuery] int count = 10)
    {
        var users = await _userRepository.GetTopByStreakAsync(count);
        return Ok(users.Select(UserDto.FromDomain));
    }

    /// <summary>
    /// Gets the leaderboard by quiz count.
    /// </summary>
    [HttpGet("leaderboard/quizzes")]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetLeaderboardByQuizzes([FromQuery] int count = 10)
    {
        var users = await _userRepository.GetTopByQuizCountAsync(count);
        return Ok(users.Select(UserDto.FromDomain));
    }

    /// <summary>
    /// Gets the leaderboard by accuracy.
    /// </summary>
    [HttpGet("leaderboard/accuracy")]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetLeaderboardByAccuracy(
        [FromQuery] int count = 10,
        [FromQuery] int minCards = 50)
    {
        var users = await _userRepository.GetTopByAccuracyAsync(count, minCards);
        return Ok(users.Select(UserDto.FromDomain));
    }

    /// <summary>
    /// Deletes a user.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        await _userRepository.DeleteAsync(id);
        return NoContent();
    }
}

// --- DTOs ---

public record UserDto(
    Guid Id,
    string DisplayName,
    string? Email,
    DateTime CreatedAt,
    DateTime LastActiveAt,
    int TotalQuizzesTaken,
    int TotalCardsReviewed,
    int TotalCorrectAnswers,
    int CurrentStreak,
    int LongestStreak,
    double AccuracyPercentage)
{
    public static UserDto FromDomain(User user) => new(
        user.Id,
        user.DisplayName,
        user.Email,
        user.CreatedAt,
        user.LastActiveAt,
        user.TotalQuizzesTaken,
        user.TotalCardsReviewed,
        user.TotalCorrectAnswers,
        user.CurrentStreak,
        user.LongestStreak,
        user.GetAccuracyPercentage()
    );
}

public record IdentifyUserRequest(string DisplayName, string? Email = null);
public record CreateUserRequest(string DisplayName, string? Email = null);
public record UpdateUserRequest(string? DisplayName);
public record QuizCompletionRequest(int CardsReviewed, int CorrectAnswers);
public record CardReviewRequest(bool IsCorrect, string? Difficulty = null);
