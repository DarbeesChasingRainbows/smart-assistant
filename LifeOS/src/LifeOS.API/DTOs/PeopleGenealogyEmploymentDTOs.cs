namespace LifeOS.API.DTOs;

public record PeopleRelationshipDto
{
    public string Key { get; init; } = string.Empty;
    public Guid FromPersonId { get; init; }
    public Guid ToPersonId { get; init; }
    public string Type { get; init; } = string.Empty;
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public string? Notes { get; init; }
    public bool IsValid { get; init; }
    public DateTime? InvalidatedAt { get; init; }
    public string? InvalidatedReason { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record CreatePeopleRelationshipRequest
{
    public Guid ToPersonId { get; init; }
    public string Type { get; init; } = string.Empty;
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public string? Notes { get; init; }
}

public record InvalidatePeopleRelationshipRequest
{
    public string Reason { get; init; } = string.Empty;
}

public record PeopleEmploymentDto
{
    public string Key { get; init; } = string.Empty;
    public Guid PersonId { get; init; }
    public string Employer { get; init; } = string.Empty;
    public string? Title { get; init; }
    public string? EmploymentType { get; init; }
    public DateTime StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public bool IsCurrent { get; init; }
    public string? Location { get; init; }
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreatePeopleEmploymentRequest
{
    public string Employer { get; init; } = string.Empty;
    public string? Title { get; init; }
    public string? EmploymentType { get; init; }
    public DateTime StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public bool IsCurrent { get; init; }
    public string? Location { get; init; }
    public string? Notes { get; init; }
}

public record UpdatePeopleEmploymentRequest
{
    public string? Employer { get; init; }
    public string? Title { get; init; }
    public string? EmploymentType { get; init; }
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public bool? IsCurrent { get; init; }
    public string? Location { get; init; }
    public string? Notes { get; init; }
}
