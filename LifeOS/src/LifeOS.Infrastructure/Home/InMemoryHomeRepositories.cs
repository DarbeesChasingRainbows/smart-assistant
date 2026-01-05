using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LifeOS.Domain.Home;
using Microsoft.FSharp.Core;

namespace LifeOS.Infrastructure.Home;

/// <summary>
/// In-memory implementation of household repository for testing and development.
/// Provides thread-safe CRUD operations using ConcurrentDictionary.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository is designed for in-memory storage without persistence.
/// It uses ConcurrentDictionary for thread safety and returns completed tasks
/// for synchronous operations. Ideal for unit testing and development scenarios.
/// </remarks>
public sealed class InMemoryHouseholdRepository : IHouseholdRepository
{
    private readonly ConcurrentDictionary<Guid, Household> _store = new();

    /// <summary>
    /// Retrieves a household by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the household.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{Household}"/> with the household if found,
    /// or <see cref="FSharpOption{Household}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Uses the household's GUID as the dictionary key for efficient lookup.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    public Task<FSharpOption<Household>> GetByIdAsync(HouseholdId id)
    {
        var key = HomeId.householdIdValue(id);
        return Task.FromResult<FSharpOption<Household>>(
            _store.TryGetValue(key, out var v)
                ? FSharpOption<Household>.Some(v)
                : FSharpOption<Household>.None
        );
    }

    /// <summary>
    /// Retrieves all households from the in-memory store.
    /// </summary>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{Household}"/> with all households.
    /// Returns an empty collection if no households exist.
    /// </returns>
    /// <remarks>
    /// Returns a snapshot of the current values as a list.
    /// Use with caution on large datasets as it loads all households into memory.
    /// </remarks>
    public Task<IEnumerable<Household>> GetAllAsync() =>
        Task.FromResult<IEnumerable<Household>>(_store.Values.ToList());

    /// <summary>
    /// Adds a new household to the in-memory store.
    /// </summary>
    /// <param name="household">The household to add.</param>
    /// <returns>A task containing the added household.</returns>
    /// <remarks>
    /// Uses the household's ID as the dictionary key.
    /// If a household with the same ID already exists, it will be overwritten.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when household is null.</exception>
    public Task<Household> AddAsync(Household household)
    {
        if (household == null)
            throw new ArgumentNullException(nameof(household));
        var key = HomeId.householdIdValue(household.Id);
        _store[key] = household;
        return Task.FromResult(household);
    }

    /// <summary>
    /// Updates an existing household in the in-memory store.
    /// </summary>
    /// <param name="household">The household with updated values.</param>
    /// <returns>A task containing the updated household.</returns>
    /// <remarks>
    /// Uses the household's ID as the dictionary key for the update operation.
    /// If the household doesn't exist, it will be added as a new entry.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when household is null.</exception>
    public Task<Household> UpdateAsync(Household household)
    {
        if (household == null)
            throw new ArgumentNullException(nameof(household));
        var key = HomeId.householdIdValue(household.Id);
        _store[key] = household;
        return Task.FromResult(household);
    }
}

/// <summary>
/// In-memory implementation of household member repository for testing and development.
/// Provides thread-safe CRUD operations using ConcurrentDictionary.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository is designed for in-memory storage without persistence.
/// It supports member management operations including deletion.
/// Ideal for unit testing and development scenarios.
/// </remarks>
public sealed class InMemoryHouseholdMemberRepository : IHouseholdMemberRepository
{
    private readonly ConcurrentDictionary<Guid, HouseholdMember> _store = new();

    /// <summary>
    /// Retrieves a household member by their unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the member.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{HouseholdMember}"/> with the member if found,
    /// or <see cref="FSharpOption{HouseholdMember}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Uses the member's GUID as the dictionary key for efficient lookup.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    public Task<FSharpOption<HouseholdMember>> GetByIdAsync(MemberId id)
    {
        var key = HomeId.memberIdValue(id);
        return Task.FromResult<FSharpOption<HouseholdMember>>(
            _store.TryGetValue(key, out var v)
                ? FSharpOption<HouseholdMember>.Some(v)
                : FSharpOption<HouseholdMember>.None
        );
    }

    /// <summary>
    /// Retrieves all household members from the in-memory store.
    /// </summary>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{HouseholdMember}"/> with all members.
    /// Returns an empty collection if no members exist.
    /// </returns>
    /// <remarks>
    /// Returns a snapshot of the current values as a list.
    /// Use with caution on large datasets as it loads all members into memory.
    /// </remarks>
    public Task<IEnumerable<HouseholdMember>> GetAllAsync() =>
        Task.FromResult<IEnumerable<HouseholdMember>>(_store.Values.ToList());

    /// <summary>
    /// Adds a new household member to the in-memory store.
    /// </summary>
    /// <param name="member">The household member to add.</param>
    /// <returns>A task containing the added member.</returns>
    /// <remarks>
    /// Uses the member's ID as the dictionary key.
    /// If a member with the same ID already exists, it will be overwritten.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when member is null.</exception>
    public Task<HouseholdMember> AddAsync(HouseholdMember member)
    {
        if (member == null)
            throw new ArgumentNullException(nameof(member));
        var key = HomeId.memberIdValue(member.Id);
        _store[key] = member;
        return Task.FromResult(member);
    }

    /// <summary>
    /// Updates an existing household member in the in-memory store.
    /// </summary>
    /// <param name="member">The household member with updated values.</param>
    /// <returns>A task containing the updated member.</returns>
    /// <remarks>
    /// Uses the member's ID as the dictionary key for the update operation.
    /// If the member doesn't exist, it will be added as a new entry.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when member is null.</exception>
    public Task<HouseholdMember> UpdateAsync(HouseholdMember member)
    {
        if (member == null)
            throw new ArgumentNullException(nameof(member));
        var key = HomeId.memberIdValue(member.Id);
        _store[key] = member;
        return Task.FromResult(member);
    }

    /// <summary>
    /// Deletes a household member from the in-memory store.
    /// </summary>
    /// <param name="id">The unique identifier of the member to delete.</param>
    /// <returns>
    /// A task containing <see langword="true"/> if the member was successfully deleted;
    /// <see langword="false"/> if the member was not found.
    /// </returns>
    /// <remarks>
    /// Uses the TryRemove method for safe deletion.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    public Task<bool> DeleteAsync(MemberId id)
    {
        var key = HomeId.memberIdValue(id);
        return Task.FromResult(_store.TryRemove(key, out _));
    }
}

/// <summary>
/// In-memory implementation of chore repository for testing and development.
/// Provides thread-safe CRUD operations using ConcurrentDictionary.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository is designed for in-memory storage without persistence.
/// It supports chore management operations including deletion.
/// Ideal for unit testing and development scenarios.
/// </remarks>
public sealed class InMemoryChoreRepository : IChoreRepository
{
    private readonly ConcurrentDictionary<Guid, Chore> _store = new();

    /// <summary>
    /// Retrieves a chore by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the chore.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{Chore}"/> with the chore if found,
    /// or <see cref="FSharpOption{Chore}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Uses the chore's GUID as the dictionary key for efficient lookup.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    public Task<FSharpOption<Chore>> GetByIdAsync(ChoreId id)
    {
        var key = HomeId.choreIdValue(id);
        return Task.FromResult<FSharpOption<Chore>>(
            _store.TryGetValue(key, out var v)
                ? FSharpOption<Chore>.Some(v)
                : FSharpOption<Chore>.None
        );
    }

    /// <summary>
    /// Retrieves all chores from the in-memory store.
    /// </summary>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{Chore}"/> with all chores.
    /// Returns an empty collection if no chores exist.
    /// </returns>
    /// <remarks>
    /// Returns a snapshot of the current values as a list.
    /// Use with caution on large datasets as it loads all chores into memory.
    /// </remarks>
    public Task<IEnumerable<Chore>> GetAllAsync() =>
        Task.FromResult<IEnumerable<Chore>>(_store.Values.ToList());

    /// <summary>
    /// Adds a new chore to the in-memory store.
    /// </summary>
    /// <param name="chore">The chore to add.</param>
    /// <returns>A task containing the added chore.</returns>
    /// <remarks>
    /// Uses the chore's ID as the dictionary key.
    /// If a chore with the same ID already exists, it will be overwritten.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when chore is null.</exception>
    public Task<Chore> AddAsync(Chore chore)
    {
        if (chore == null)
            throw new ArgumentNullException(nameof(chore));
        var key = HomeId.choreIdValue(chore.Id);
        _store[key] = chore;
        return Task.FromResult(chore);
    }

    /// <summary>
    /// Updates an existing chore in the in-memory store.
    /// </summary>
    /// <param name="chore">The chore with updated values.</param>
    /// <returns>A task containing the updated chore.</returns>
    /// <remarks>
    /// Uses the chore's ID as the dictionary key for the update operation.
    /// If the chore doesn't exist, it will be added as a new entry.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when chore is null.</exception>
    public Task<Chore> UpdateAsync(Chore chore)
    {
        if (chore == null)
            throw new ArgumentNullException(nameof(chore));
        var key = HomeId.choreIdValue(chore.Id);
        _store[key] = chore;
        return Task.FromResult(chore);
    }

    /// <summary>
    /// Deletes a chore from the in-memory store.
    /// </summary>
    /// <param name="id">The unique identifier of the chore to delete.</param>
    /// <returns>
    /// A task containing <see langword="true"/> if the chore was successfully deleted;
    /// <see langword="false"/> if the chore was not found.
    /// </returns>
    /// <remarks>
    /// Uses the TryRemove method for safe deletion.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    public Task<bool> DeleteAsync(ChoreId id)
    {
        var key = HomeId.choreIdValue(id);
        return Task.FromResult(_store.TryRemove(key, out _));
    }
}

/// <summary>
/// In-memory implementation of chore assignment repository for testing and development.
/// Provides thread-safe CRUD operations using ConcurrentDictionary.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository is designed for in-memory storage without persistence.
/// It supports chore assignment management with specialized queries.
/// Ideal for unit testing and development scenarios.
/// </remarks>
public sealed class InMemoryChoreAssignmentRepository : IChoreAssignmentRepository
{
    private readonly ConcurrentDictionary<Guid, ChoreAssignment> _store = new();

    /// <summary>
    /// Retrieves a chore assignment by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the chore assignment.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{ChoreAssignment}"/> with the assignment if found,
    /// or <see cref="FSharpOption{ChoreAssignment}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Uses the assignment's GUID as the dictionary key for efficient lookup.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    public Task<FSharpOption<ChoreAssignment>> GetByIdAsync(ChoreAssignmentId id)
    {
        var key = HomeId.choreAssignmentIdValue(id);
        return Task.FromResult<FSharpOption<ChoreAssignment>>(
            _store.TryGetValue(key, out var v)
                ? FSharpOption<ChoreAssignment>.Some(v)
                : FSharpOption<ChoreAssignment>.None
        );
    }

    /// <summary>
    /// Retrieves all chore assignments from the in-memory store.
    /// </summary>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{ChoreAssignment}"/> with all assignments.
    /// Returns an empty collection if no assignments exist.
    /// </returns>
    /// <remarks>
    /// Returns a snapshot of the current values as a list.
    /// Use with caution on large datasets as it loads all assignments into memory.
    /// </remarks>
    public Task<IEnumerable<ChoreAssignment>> GetAllAsync() =>
        Task.FromResult<IEnumerable<ChoreAssignment>>(_store.Values.ToList());

    /// <summary>
    /// Adds a new chore assignment to the in-memory store.
    /// </summary>
    /// <param name="assignment">The chore assignment to add.</param>
    /// <returns>A task containing the added assignment.</returns>
    /// <remarks>
    /// Uses the assignment's ID as the dictionary key.
    /// If an assignment with the same ID already exists, it will be overwritten.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when assignment is null.</exception>
    public Task<ChoreAssignment> AddAsync(ChoreAssignment assignment)
    {
        if (assignment == null)
            throw new ArgumentNullException(nameof(assignment));
        var key = HomeId.choreAssignmentIdValue(assignment.Id);
        _store[key] = assignment;
        return Task.FromResult(assignment);
    }

    /// <summary>
    /// Updates an existing chore assignment in the in-memory store.
    /// </summary>
    /// <param name="assignment">The chore assignment with updated values.</param>
    /// <returns>A task containing the updated assignment.</returns>
    /// <remarks>
    /// Uses the assignment's ID as the dictionary key for the update operation.
    /// If the assignment doesn't exist, it will be added as a new entry.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when assignment is null.</exception>
    public Task<ChoreAssignment> UpdateAsync(ChoreAssignment assignment)
    {
        if (assignment == null)
            throw new ArgumentNullException(nameof(assignment));
        var key = HomeId.choreAssignmentIdValue(assignment.Id);
        _store[key] = assignment;
        return Task.FromResult(assignment);
    }

    /// <summary>
    /// Deletes a chore assignment from the in-memory store.
    /// </summary>
    /// <param name="id">The unique identifier of the assignment to delete.</param>
    /// <returns>
    /// A task containing <see langword="true"/> if the assignment was successfully deleted;
    /// <see langword="false"/> if the assignment was not found.
    /// </returns>
    /// <remarks>
    /// Uses the TryRemove method for safe deletion.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    public Task<bool> DeleteAsync(ChoreAssignmentId id)
    {
        var key = HomeId.choreAssignmentIdValue(id);
        return Task.FromResult(_store.TryRemove(key, out _));
    }

    /// <summary>
    /// Retrieves all chore assignments assigned to a specific member.
    /// </summary>
    /// <param name="assignee">The unique identifier of the member assigned to chores.</param>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{ChoreAssignment}"/> with all assignments for the member.
    /// Returns an empty collection if no assignments exist for the member.
    /// </returns>
    /// <remarks>
    /// Filters assignments by comparing assignee member IDs.
    /// Essential for workload management and assignment tracking.
    /// </remarks>
    public Task<IEnumerable<ChoreAssignment>> GetByAssigneeAsync(MemberId assignee)
    {
        var a = HomeId.memberIdValue(assignee);
        var results = _store.Values.Where(x => HomeId.memberIdValue(x.Assignee) == a).ToList();
        return Task.FromResult<IEnumerable<ChoreAssignment>>(results);
    }
}

/// <summary>
/// In-memory implementation of chore completion repository for testing and development.
/// Provides thread-safe CRUD operations using ConcurrentDictionary.
/// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
/// </summary>
/// <remarks>
/// This repository is designed for in-memory storage without persistence.
/// It supports chore completion tracking with specialized date-based queries.
/// Ideal for unit testing and development scenarios.
/// </remarks>
public sealed class InMemoryChoreCompletionRepository : IChoreCompletionRepository
{
    private readonly ConcurrentDictionary<Guid, ChoreCompletion> _store = new();

    /// <summary>
    /// Retrieves a chore completion by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the chore completion.</param>
    /// <returns>
    /// A task containing an <see cref="FSharpOption{ChoreCompletion}"/> with the completion if found,
    /// or <see cref="FSharpOption{ChoreCompletion}.None"/> if not found.
    /// </returns>
    /// <remarks>
    /// Uses the completion's GUID as the dictionary key for efficient lookup.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    public Task<FSharpOption<ChoreCompletion>> GetByIdAsync(ChoreCompletionId id)
    {
        var key = HomeId.choreCompletionIdValue(id);
        return Task.FromResult<FSharpOption<ChoreCompletion>>(
            _store.TryGetValue(key, out var v)
                ? FSharpOption<ChoreCompletion>.Some(v)
                : FSharpOption<ChoreCompletion>.None
        );
    }

    /// <summary>
    /// Adds a new chore completion to the in-memory store.
    /// </summary>
    /// <param name="completion">The chore completion to add.</param>
    /// <returns>A task containing the added completion.</returns>
    /// <remarks>
    /// Uses the completion's ID as the dictionary key.
    /// If a completion with the same ID already exists, it will be overwritten.
    /// Returns a completed task since the operation is synchronous.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when completion is null.</exception>
    public Task<ChoreCompletion> AddAsync(ChoreCompletion completion)
    {
        ArgumentNullException.ThrowIfNull(completion);

        var key = HomeId.choreCompletionIdValue(completion.Id);
        _store[key] = completion;
        return Task.FromResult(completion);
    }

    /// <summary>
    /// Retrieves all chore completions for a specific chore assignment.
    /// </summary>
    /// <param name="assignmentId">The unique identifier of the chore assignment.</param>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{ChoreCompletion}"/> with all completions for the assignment.
    /// Returns an empty collection if no completions exist for the assignment.
    /// </returns>
    /// <remarks>
    /// Filters completions by comparing assignment IDs.
    /// Essential for tracking completion history for specific chores.
    /// </remarks>
    public Task<IEnumerable<ChoreCompletion>> GetByAssignmentAsync(ChoreAssignmentId assignmentId)
    {
        var a = HomeId.choreAssignmentIdValue(assignmentId);
        var results = _store
            .Values.Where(x => HomeId.choreAssignmentIdValue(x.AssignmentId) == a)
            .ToList();
        return Task.FromResult<IEnumerable<ChoreCompletion>>(results);
    }

    /// <summary>
    /// Retrieves all chore completions by a specific member within a date range.
    /// </summary>
    /// <param name="memberId">The unique identifier of the member who completed chores.</param>
    /// <param name="fromUtc">The start date for filtering completions (UTC).</param>
    /// <param name="toUtc">The end date for filtering completions (UTC).</param>
    /// <returns>
    /// A task containing an <see cref="IEnumerable{ChoreCompletion}"/> with matching completions.
    /// Returns an empty collection if no completions match the criteria.
    /// </returns>
    /// <remarks>
    /// Filters by both member ID and completion date range.
    /// Essential for productivity tracking and member performance analysis.
    /// Date filtering is inclusive of both start and end dates.
    /// </remarks>
    public Task<IEnumerable<ChoreCompletion>> GetByMemberAsync(
        MemberId memberId,
        DateTime fromUtc,
        DateTime toUtc
    )
    {
        var m = HomeId.memberIdValue(memberId);
        var results = _store
            .Values.Where(x => HomeId.memberIdValue(x.CompletedBy) == m)
            .Where(x => x.CompletedAtUtc >= fromUtc && x.CompletedAtUtc <= toUtc)
            .ToList();
        return Task.FromResult<IEnumerable<ChoreCompletion>>(results);
    }
}

public sealed class InMemoryCalendarRepository : ICalendarRepository
{
    private readonly ConcurrentDictionary<Guid, Calendar> _store = new();

    public Task<FSharpOption<Calendar>> GetByIdAsync(CalendarId id)
    {
        var key = HomeId.calendarIdValue(id);
        return Task.FromResult<FSharpOption<Calendar>>(
            _store.TryGetValue(key, out var v)
                ? FSharpOption<Calendar>.Some(v)
                : FSharpOption<Calendar>.None
        );
    }

    public Task<IEnumerable<Calendar>> GetAllAsync() =>
        Task.FromResult<IEnumerable<Calendar>>([.. _store.Values]);

    public Task<Calendar> AddAsync(Calendar calendar)
    {
        var key = HomeId.calendarIdValue(calendar.Id);
        _store[key] = calendar;
        return Task.FromResult(calendar);
    }

    public Task<Calendar> UpdateAsync(Calendar calendar)
    {
        var key = HomeId.calendarIdValue(calendar.Id);
        _store[key] = calendar;
        return Task.FromResult(calendar);
    }

    public Task<bool> DeleteAsync(CalendarId id)
    {
        var key = HomeId.calendarIdValue(id);
        return Task.FromResult(_store.TryRemove(key, out _));
    }
}

public sealed class InMemoryCalendarEventRepository : ICalendarEventRepository
{
    private readonly ConcurrentDictionary<Guid, CalendarEvent> _store = new();

    public Task<FSharpOption<CalendarEvent>> GetByIdAsync(CalendarEventId id)
    {
        var key = HomeId.calendarEventIdValue(id);
        return Task.FromResult<FSharpOption<CalendarEvent>>(
            _store.TryGetValue(key, out var v)
                ? FSharpOption<CalendarEvent>.Some(v)
                : FSharpOption<CalendarEvent>.None
        );
    }

    public Task<IEnumerable<CalendarEvent>> GetByCalendarAsync(CalendarId calendarId)
    {
        var c = HomeId.calendarIdValue(calendarId);
        var results = _store.Values.Where(x => HomeId.calendarIdValue(x.CalendarId) == c).ToList();
        return Task.FromResult<IEnumerable<CalendarEvent>>(results);
    }

    public Task<CalendarEvent> AddAsync(CalendarEvent ev)
    {
        var key = HomeId.calendarEventIdValue(ev.Id);
        _store[key] = ev;
        return Task.FromResult(ev);
    }

    public Task<CalendarEvent> UpdateAsync(CalendarEvent ev)
    {
        var key = HomeId.calendarEventIdValue(ev.Id);
        _store[key] = ev;
        return Task.FromResult(ev);
    }

    public Task<bool> DeleteAsync(CalendarEventId id)
    {
        var key = HomeId.calendarEventIdValue(id);
        return Task.FromResult(_store.TryRemove(key, out _));
    }
}

public sealed class InMemoryReminderRepository : IReminderRepository
{
    private readonly ConcurrentDictionary<Guid, Reminder> _store = new();

    public Task<FSharpOption<Reminder>> GetByIdAsync(ReminderId id)
    {
        var key = HomeId.reminderIdValue(id);
        return Task.FromResult<FSharpOption<Reminder>>(
            _store.TryGetValue(key, out var v)
                ? FSharpOption<Reminder>.Some(v)
                : FSharpOption<Reminder>.None
        );
    }

    public Task<IEnumerable<Reminder>> GetByEventAsync(CalendarEventId eventId)
    {
        var e = HomeId.calendarEventIdValue(eventId);
        var results = _store
            .Values.Where(x => HomeId.calendarEventIdValue(x.EventId) == e)
            .ToList();
        return Task.FromResult<IEnumerable<Reminder>>(results);
    }

    public Task<Reminder> AddAsync(Reminder reminder)
    {
        var key = HomeId.reminderIdValue(reminder.Id);
        _store[key] = reminder;
        return Task.FromResult(reminder);
    }

    public Task<Reminder> UpdateAsync(Reminder reminder)
    {
        var key = HomeId.reminderIdValue(reminder.Id);
        _store[key] = reminder;
        return Task.FromResult(reminder);
    }

    public Task<bool> DeleteAsync(ReminderId id)
    {
        var key = HomeId.reminderIdValue(id);
        return Task.FromResult(_store.TryRemove(key, out _));
    }
}
