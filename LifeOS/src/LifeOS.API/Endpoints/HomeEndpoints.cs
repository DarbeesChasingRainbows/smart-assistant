using LifeOS.API.DTOs;
using LifeOS.Domain.Home;
using Microsoft.FSharp.Core;
using Microsoft.FSharp.Collections;

using Microsoft.AspNetCore.Mvc;

namespace LifeOS.API.Endpoints;

public static class HomeEndpoints
{
    public static void MapHomeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/home").WithTags("Home");

        group.MapGet("/members", GetAllMembers).WithName("GetAllHouseholdMembers");
        group.MapPost("/members", CreateMember).WithName("CreateHouseholdMember");
        group.MapPut("/members/{id:guid}", UpdateMember).WithName("UpdateHouseholdMember");
        group.MapDelete("/members/{id:guid}", DeleteMember).WithName("DeleteHouseholdMember");

        group.MapGet("/chores", GetAllChores).WithName("GetAllChores");
        group.MapPost("/chores", CreateChore).WithName("CreateChore");
        group.MapPut("/chores/{id:guid}", UpdateChore).WithName("UpdateChore");
        group.MapDelete("/chores/{id:guid}", DeleteChore).WithName("DeleteChore");

        group.MapGet("/assignments", GetAllAssignments).WithName("GetAllChoreAssignments");
        group.MapGet("/assignments/by-assignee/{memberId:guid}", GetAssignmentsByAssignee).WithName("GetChoreAssignmentsByAssignee");
        group.MapPost("/assignments", CreateAssignment).WithName("CreateChoreAssignment");

        group.MapPost("/completions", CreateCompletion).WithName("CreateChoreCompletion");
        group.MapGet("/completions/by-assignment/{assignmentId:guid}", GetCompletionsByAssignment).WithName("GetCompletionsByAssignment");

        group.MapGet("/calendars", GetAllCalendars).WithName("GetAllCalendars");
        group.MapPost("/calendars", CreateCalendar).WithName("CreateCalendar");

        group.MapGet("/events/by-calendar/{calendarId:guid}", GetEventsByCalendar).WithName("GetEventsByCalendar");
        group.MapPost("/events", CreateEvent).WithName("CreateCalendarEvent");
    }

    private static async Task<IResult> GetAllMembers([FromServices] IHouseholdMemberRepository repo)
    {
        var members = await repo.GetAllAsync();
        return Results.Ok(members.Select(MapMemberToDto));
    }

    private static async Task<IResult> CreateMember(CreateHouseholdMemberRequest req, [FromServices] IHouseholdMemberRepository repo)
    {
        if (string.IsNullOrWhiteSpace(req.DisplayName))
            return Results.BadRequest(new ApiErrorResponse { Error = "DisplayName is required" });

        var now = DateTime.UtcNow;
        var birthdate = req.Birthdate.HasValue
            ? FSharpOption<DateTime>.Some(req.Birthdate.Value)
            : FSharpOption<DateTime>.None;

        var member = new HouseholdMember(
            HomeId.createMemberId(),
            req.DisplayName,
            ParseMemberRole(req.Role),
            birthdate,
            true,
            now,
            now);

        var saved = await repo.AddAsync(member);
        return Results.Ok(MapMemberToDto(saved));
    }

    private static async Task<IResult> UpdateMember(Guid id, UpdateHouseholdMemberRequest req, [FromServices] IHouseholdMemberRepository repo)
    {
        var memberId = MemberId.FromGuid(id);
        var memberOpt = await repo.GetByIdAsync(memberId);
        if (memberOpt == null || FSharpOption<HouseholdMember>.get_IsNone(memberOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Member not found" });

        var member = memberOpt.Value!;

        var birthdate = req.Birthdate.HasValue
            ? FSharpOption<DateTime>.Some(req.Birthdate.Value)
            : member.Birthdate;

        var updated = new HouseholdMember(
            member.Id,
            req.DisplayName ?? member.DisplayName,
            req.Role != null ? ParseMemberRole(req.Role) : member.Role,
            birthdate,
            req.IsActive ?? member.IsActive,
            member.CreatedAt,
            DateTime.UtcNow);

        var saved = await repo.UpdateAsync(updated);
        return Results.Ok(MapMemberToDto(saved));
    }

    private static async Task<IResult> DeleteMember(Guid id, [FromServices] IHouseholdMemberRepository repo)
    {
        var memberId = MemberId.FromGuid(id);
        var ok = await repo.DeleteAsync(memberId);
        return ok ? Results.NoContent() : Results.NotFound(new ApiErrorResponse { Error = "Member not found" });
    }

    private static async Task<IResult> GetAllChores([FromServices] IChoreRepository repo)
    {
        var chores = await repo.GetAllAsync();
        return Results.Ok(chores.Select(MapChoreToDto));
    }

    private static async Task<IResult> CreateChore(CreateChoreRequest req, [FromServices] IChoreRepository repo)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return Results.BadRequest(new ApiErrorResponse { Error = "Title is required" });

        var now = DateTime.UtcNow;
        var description = string.IsNullOrEmpty(req.Description) ? FSharpOption<string>.None : FSharpOption<string>.Some(req.Description);
        var estimatedMinutes = req.EstimatedMinutes.HasValue ? FSharpOption<int>.Some(req.EstimatedMinutes.Value) : FSharpOption<int>.None;
        var defaultPoints = req.DefaultPoints.HasValue ? FSharpOption<int>.Some(req.DefaultPoints.Value) : FSharpOption<int>.None;

        var chore = new Chore(
            HomeId.createChoreId(),
            req.Title,
            description,
            ParseChoreCategory(req.Category),
            estimatedMinutes,
            defaultPoints,
            true,
            now,
            now);

        var saved = await repo.AddAsync(chore);
        return Results.Ok(MapChoreToDto(saved));
    }

    private static async Task<IResult> UpdateChore(Guid id, UpdateChoreRequest req, [FromServices] IChoreRepository repo)
    {
        var choreId = ChoreId.FromGuid(id);
        var choreOpt = await repo.GetByIdAsync(choreId);
        if (choreOpt == null || FSharpOption<Chore>.get_IsNone(choreOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Chore not found" });

        var chore = choreOpt.Value;

        var description = req.Description != null
            ? (string.IsNullOrEmpty(req.Description) ? FSharpOption<string>.None : FSharpOption<string>.Some(req.Description))
            : chore.Description;

        var estimatedMinutes = req.EstimatedMinutes.HasValue
            ? FSharpOption<int>.Some(req.EstimatedMinutes.Value)
            : chore.EstimatedMinutes;

        var defaultPoints = req.DefaultPoints.HasValue
            ? FSharpOption<int>.Some(req.DefaultPoints.Value)
            : chore.DefaultPoints;

        var updated = new Chore(
            chore.Id,
            req.Title ?? chore.Title,
            description,
            req.Category != null ? ParseChoreCategory(req.Category) : chore.Category,
            estimatedMinutes,
            defaultPoints,
            req.IsActive ?? chore.IsActive,
            chore.CreatedAt,
            DateTime.UtcNow);

        var saved = await repo.UpdateAsync(updated);
        return Results.Ok(MapChoreToDto(saved));
    }

    private static async Task<IResult> DeleteChore(Guid id, [FromServices] IChoreRepository repo)
    {
        var choreId = ChoreId.FromGuid(id);
        var ok = await repo.DeleteAsync(choreId);
        return ok ? Results.NoContent() : Results.NotFound(new ApiErrorResponse { Error = "Chore not found" });
    }

    private static async Task<IResult> GetAllAssignments([FromServices] IChoreAssignmentRepository repo)
    {
        var assignments = await repo.GetAllAsync();
        return Results.Ok(assignments.Select(MapAssignmentToDto));
    }

    private static async Task<IResult> GetAssignmentsByAssignee(Guid memberId, [FromServices] IChoreAssignmentRepository repo)
    {
        var id = MemberId.FromGuid(memberId);
        var assignments = await repo.GetByAssigneeAsync(id);
        return Results.Ok(assignments.Select(MapAssignmentToDto));
    }

    private static async Task<IResult> CreateAssignment(CreateChoreAssignmentRequest req, [FromServices] IChoreAssignmentRepository repo)
    {
        var choreId = ChoreId.FromGuid(Guid.Parse(req.ChoreId));
        var assignee = MemberId.FromGuid(Guid.Parse(req.AssigneeMemberId));
        var window = ParseAssignmentWindow(req.Window);
        var recurrence = req.Recurrence != null ? FSharpOption<Recurrence>.Some(MapRecurrenceFromDto(req.Recurrence)) : FSharpOption<Recurrence>.None;
        var dueTime = req.DueTimeMinutesLocal.HasValue ? FSharpOption<TimeSpan>.Some(TimeSpan.FromMinutes(req.DueTimeMinutesLocal.Value)) : FSharpOption<TimeSpan>.None;

        var now = DateTime.UtcNow;
        var assignment = new ChoreAssignment(
            HomeId.createChoreAssignmentId(),
            choreId,
            assignee,
            window,
            AssignmentStatus.Active,
            recurrence,
            req.StartDateUtc,
            dueTime,
            now,
            now);

        var saved = await repo.AddAsync(assignment);
        return Results.Ok(MapAssignmentToDto(saved));
    }

    private static async Task<IResult> CreateCompletion(CreateChoreCompletionRequest req, [FromServices] IChoreCompletionRepository repo)
    {
        var assignmentId = ChoreAssignmentId.FromGuid(Guid.Parse(req.AssignmentId));
        var completedBy = MemberId.FromGuid(Guid.Parse(req.CompletedByMemberId));
        var outcome = ParseCompletionOutcome(req.Outcome);

        var notes = string.IsNullOrEmpty(req.Notes) ? FSharpOption<string>.None : FSharpOption<string>.Some(req.Notes);
        var points = req.PointsAwarded.HasValue ? FSharpOption<int>.Some(req.PointsAwarded.Value) : FSharpOption<int>.None;
        var completion = new ChoreCompletion(
            HomeId.createChoreCompletionId(),
            assignmentId,
            completedBy,
            req.CompletedAtUtc,
            outcome,
            notes,
            points);

        var saved = await repo.AddAsync(completion);
        return Results.Ok(MapCompletionToDto(saved));
    }

    private static async Task<IResult> GetCompletionsByAssignment(Guid assignmentId, [FromServices] IChoreCompletionRepository repo)
    {
        var id = ChoreAssignmentId.FromGuid(assignmentId);
        var completions = await repo.GetByAssignmentAsync(id);
        return Results.Ok(completions.Select(MapCompletionToDto));
    }

    private static async Task<IResult> GetAllCalendars([FromServices] ICalendarRepository repo)
    {
        var calendars = await repo.GetAllAsync();
        return Results.Ok(calendars.Select(MapCalendarToDto));
    }

    private static async Task<IResult> CreateCalendar(CreateCalendarRequest req, [FromServices] ICalendarRepository repo)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return Results.BadRequest(new ApiErrorResponse { Error = "Name is required" });

        var now = DateTime.UtcNow;
        var calendar = new Calendar(HomeId.createCalendarId(), req.Name, now, now);
        var saved = await repo.AddAsync(calendar);
        return Results.Ok(MapCalendarToDto(saved));
    }

    private static async Task<IResult> GetEventsByCalendar(Guid calendarId, [FromServices] ICalendarEventRepository repo)
    {
        var id = CalendarId.FromGuid(calendarId);
        var events = await repo.GetByCalendarAsync(id);
        return Results.Ok(events.Select(MapEventToDto));
    }

    private static async Task<IResult> CreateEvent(CreateCalendarEventRequest req, [FromServices] ICalendarEventRepository repo)
    {
        var calendarId = CalendarId.FromGuid(Guid.Parse(req.CalendarId));
        var visibility = ParseVisibility(req.Visibility);
        var recurrence = req.Recurrence != null ? FSharpOption<Recurrence>.Some(MapRecurrenceFromDto(req.Recurrence)) : FSharpOption<Recurrence>.None;

        if (string.IsNullOrWhiteSpace(req.Title))
            return Results.BadRequest(new ApiErrorResponse { Error = "Title is required" });

        var now = DateTime.UtcNow;
        var description = string.IsNullOrEmpty(req.Description) ? FSharpOption<string>.None : FSharpOption<string>.Some(req.Description);
        var endUtc = req.EndUtc.HasValue ? FSharpOption<DateTime>.Some(req.EndUtc.Value) : FSharpOption<DateTime>.None;
        var location = string.IsNullOrEmpty(req.Location) ? FSharpOption<string>.None : FSharpOption<string>.Some(req.Location);

        var ev = new CalendarEvent(
            HomeId.createCalendarEventId(),
            calendarId,
            req.Title,
            description,
            req.StartUtc,
            endUtc,
            location,
            visibility,
            recurrence,
            now,
            now);

        var saved = await repo.AddAsync(ev);
        return Results.Ok(MapEventToDto(saved));
    }

    private static HouseholdMemberDto MapMemberToDto(HouseholdMember m) => new()
    {
        Id = HomeId.memberIdValue(m.Id).ToString(),
        DisplayName = m.DisplayName,
        Role = m.Role.ToString(),
        Birthdate = FSharpOption<DateTime>.get_IsSome(m.Birthdate) ? m.Birthdate.Value : (DateTime?)null,
        IsActive = m.IsActive,
        CreatedAt = m.CreatedAt,
        UpdatedAt = m.UpdatedAt
    };

    private static ChoreDto MapChoreToDto(Chore c) => new()
    {
        Id = HomeId.choreIdValue(c.Id).ToString(),
        Title = c.Title,
        Description = FSharpOption<string>.get_IsSome(c.Description) ? c.Description.Value! : null,
        Category = c.Category.ToString(),
        EstimatedMinutes = FSharpOption<int>.get_IsSome(c.EstimatedMinutes) ? c.EstimatedMinutes.Value : (int?)null,
        DefaultPoints = FSharpOption<int>.get_IsSome(c.DefaultPoints) ? c.DefaultPoints.Value : (int?)null,
        IsActive = c.IsActive,
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt
    };

    private static ChoreAssignmentDto MapAssignmentToDto(ChoreAssignment a) => new()
    {
        Id = HomeId.choreAssignmentIdValue(a.Id).ToString(),
        ChoreId = HomeId.choreIdValue(a.ChoreId).ToString(),
        AssigneeMemberId = HomeId.memberIdValue(a.Assignee).ToString(),
        Window = a.Window.ToString(),
        Status = a.Status.ToString(),
        Recurrence = FSharpOption<Recurrence>.get_IsSome(a.Recurrence) ? MapRecurrenceToDto(a.Recurrence.Value!) : null,
        StartDateUtc = a.StartDateUtc,
        DueTimeMinutesLocal = FSharpOption<TimeSpan>.get_IsSome(a.DueTimeLocal) ? (int?)a.DueTimeLocal.Value!.TotalMinutes : null,
        CreatedAt = a.CreatedAt,
        UpdatedAt = a.UpdatedAt
    };

    private static ChoreCompletionDto MapCompletionToDto(ChoreCompletion c) => new()
    {
        Id = HomeId.choreCompletionIdValue(c.Id).ToString(),
        AssignmentId = HomeId.choreAssignmentIdValue(c.AssignmentId).ToString(),
        CompletedByMemberId = HomeId.memberIdValue(c.CompletedBy).ToString(),
        CompletedAtUtc = c.CompletedAtUtc,
        Outcome = c.Outcome.ToString(),
        Notes = FSharpOption<string>.get_IsSome(c.Notes) ? c.Notes.Value! : null,
        PointsAwarded = FSharpOption<int>.get_IsSome(c.PointsAwarded) ? c.PointsAwarded.Value : (int?)null
    };

    private static CalendarDto MapCalendarToDto(Calendar c) => new()
    {
        Id = HomeId.calendarIdValue(c.Id).ToString(),
        Name = c.Name,
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt
    };

    private static CalendarEventDto MapEventToDto(CalendarEvent e) => new()
    {
        Id = HomeId.calendarEventIdValue(e.Id).ToString(),
        CalendarId = HomeId.calendarIdValue(e.CalendarId).ToString(),
        Title = e.Title,
        Description = FSharpOption<string>.get_IsSome(e.Description) ? e.Description.Value! : null,
        StartUtc = e.StartUtc,
        EndUtc = FSharpOption<DateTime>.get_IsSome(e.EndUtc) ? e.EndUtc.Value : (DateTime?)null,
        Location = FSharpOption<string>.get_IsSome(e.Location) ? e.Location.Value! : null,
        Visibility = e.Visibility.ToString(),
        Recurrence = FSharpOption<Recurrence>.get_IsSome(e.Recurrence) ? MapRecurrenceToDto(e.Recurrence.Value!) : null,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt
    };

    private static RecurrenceDto MapRecurrenceToDto(Recurrence r) => new()
    {
        DtStartUtc = r.DtStartUtc,
        RRule = r.RRule,
        RDatesUtc = r.RDatesUtc.ToList(),
        ExDatesUtc = r.ExDatesUtc.ToList()
    };

    private static Recurrence MapRecurrenceFromDto(RecurrenceDto dto)
    {
        return new Recurrence(
            dto.DtStartUtc,
            dto.RRule,
            ListModule.OfSeq(dto.RDatesUtc),
            ListModule.OfSeq(dto.ExDatesUtc));
    }

    private static MemberRole ParseMemberRole(string s) => s switch
    {
        "Parent" => MemberRole.Parent,
        _ => MemberRole.Child
    };

    private static ChoreCategory ParseChoreCategory(string s) => s switch
    {
        "Cleaning" => ChoreCategory.Cleaning,
        "Kitchen" => ChoreCategory.Kitchen,
        "Laundry" => ChoreCategory.Laundry,
        "Yard" => ChoreCategory.Yard,
        "Pets" => ChoreCategory.Pets,
        "School" => ChoreCategory.School,
        _ => ChoreCategory.NewOther(s)
    };

    private static AssignmentWindow ParseAssignmentWindow(string s) => s switch
    {
        "Morning" => AssignmentWindow.Morning,
        "Afternoon" => AssignmentWindow.Afternoon,
        "Evening" => AssignmentWindow.Evening,
        _ => AssignmentWindow.Anytime
    };

    private static CompletionOutcome ParseCompletionOutcome(string s) => s switch
    {
        "Skipped" => CompletionOutcome.Skipped,
        "Partial" => CompletionOutcome.Partial,
        "Failed" => CompletionOutcome.Failed,
        _ => CompletionOutcome.Done
    };

    private static EventVisibility ParseVisibility(string s) => s switch
    {
        "ParentsOnly" => EventVisibility.ParentsOnly,
        "ChildVisible" => EventVisibility.ChildVisible,
        _ => EventVisibility.Household
    };
}
