namespace LifeOS.API.DTOs;

public record HouseholdMemberDto
{
    public string Id { get; init; } = "";
    public string DisplayName { get; init; } = "";
    public string Role { get; init; } = "Child";
    public DateTime? Birthdate { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateHouseholdMemberRequest
{
    public string DisplayName { get; init; } = "";
    public string Role { get; init; } = "Child";
    public DateTime? Birthdate { get; init; }
}

public record UpdateHouseholdMemberRequest
{
    public string? DisplayName { get; init; }
    public string? Role { get; init; }
    public DateTime? Birthdate { get; init; }
    public bool? IsActive { get; init; }
}

public record ChoreDto
{
    public string Id { get; init; } = "";
    public string Title { get; init; } = "";
    public string? Description { get; init; }
    public string Category { get; init; } = "Cleaning";
    public int? EstimatedMinutes { get; init; }
    public int? DefaultPoints { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateChoreRequest
{
    public string Title { get; init; } = "";
    public string? Description { get; init; }
    public string Category { get; init; } = "Cleaning";
    public int? EstimatedMinutes { get; init; }
    public int? DefaultPoints { get; init; }
}

public record UpdateChoreRequest
{
    public string? Title { get; init; }
    public string? Description { get; init; }
    public string? Category { get; init; }
    public int? EstimatedMinutes { get; init; }
    public int? DefaultPoints { get; init; }
    public bool? IsActive { get; init; }
}

public record RecurrenceDto
{
    public DateTime DtStartUtc { get; init; }
    public string RRule { get; init; } = "";
    public List<DateTime> RDatesUtc { get; init; } = new();
    public List<DateTime> ExDatesUtc { get; init; } = new();
}

public record ChoreAssignmentDto
{
    public string Id { get; init; } = "";
    public string ChoreId { get; init; } = "";
    public string AssigneeMemberId { get; init; } = "";
    public string Window { get; init; } = "Anytime";
    public string Status { get; init; } = "Active";
    public RecurrenceDto? Recurrence { get; init; }
    public DateTime StartDateUtc { get; init; }
    public int? DueTimeMinutesLocal { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateChoreAssignmentRequest
{
    public string ChoreId { get; init; } = "";
    public string AssigneeMemberId { get; init; } = "";
    public string Window { get; init; } = "Anytime";
    public RecurrenceDto? Recurrence { get; init; }
    public DateTime StartDateUtc { get; init; }
    public int? DueTimeMinutesLocal { get; init; }
}

public record ChoreCompletionDto
{
    public string Id { get; init; } = "";
    public string AssignmentId { get; init; } = "";
    public string CompletedByMemberId { get; init; } = "";
    public DateTime CompletedAtUtc { get; init; }
    public string Outcome { get; init; } = "Done";
    public string? Notes { get; init; }
    public int? PointsAwarded { get; init; }
}

public record CreateChoreCompletionRequest
{
    public string AssignmentId { get; init; } = "";
    public string CompletedByMemberId { get; init; } = "";
    public DateTime CompletedAtUtc { get; init; }
    public string Outcome { get; init; } = "Done";
    public string? Notes { get; init; }
    public int? PointsAwarded { get; init; }
}

public record CalendarDto
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateCalendarRequest
{
    public string Name { get; init; } = "";
}

public record CalendarEventDto
{
    public string Id { get; init; } = "";
    public string CalendarId { get; init; } = "";
    public string Title { get; init; } = "";
    public string? Description { get; init; }
    public DateTime StartUtc { get; init; }
    public DateTime? EndUtc { get; init; }
    public string? Location { get; init; }
    public string Visibility { get; init; } = "Household";
    public RecurrenceDto? Recurrence { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record CreateCalendarEventRequest
{
    public string CalendarId { get; init; } = "";
    public string Title { get; init; } = "";
    public string? Description { get; init; }
    public DateTime StartUtc { get; init; }
    public DateTime? EndUtc { get; init; }
    public string? Location { get; init; }
    public string Visibility { get; init; } = "Household";
    public RecurrenceDto? Recurrence { get; init; }
}
