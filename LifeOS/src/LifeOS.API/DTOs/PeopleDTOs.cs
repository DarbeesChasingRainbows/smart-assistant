namespace LifeOS.API.DTOs;

public record PersonDto
{
    public Guid Id { get; init; }
    public string Email { get; init; } = string.Empty;
    public string Username { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreatePersonRequest
{
    public string Email { get; init; } = string.Empty;
    public string Username { get; init; } = string.Empty;
    public string Role { get; init; } = "Guest";
}

public record UpdatePersonRequest
{
    public string? Role { get; init; }
    public bool? IsActive { get; init; }
}

public record PersonListResponse
{
    public IEnumerable<PersonDto> People { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}
