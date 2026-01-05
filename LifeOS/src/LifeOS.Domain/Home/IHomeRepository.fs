namespace LifeOS.Domain.Home

open System
open System.Threading.Tasks

// Ports for Home persistence

type IHouseholdRepository =
    abstract member GetByIdAsync : HouseholdId -> Task<Household option>
    abstract member GetAllAsync : unit -> Task<Household seq>
    abstract member AddAsync : Household -> Task<Household>
    abstract member UpdateAsync : Household -> Task<Household>

// Members are modeled both inside Household and as their own nodes; keep a direct repo for fast ops.
type IHouseholdMemberRepository =
    abstract member GetByIdAsync : MemberId -> Task<HouseholdMember option>
    abstract member GetAllAsync : unit -> Task<HouseholdMember seq>
    abstract member AddAsync : HouseholdMember -> Task<HouseholdMember>
    abstract member UpdateAsync : HouseholdMember -> Task<HouseholdMember>
    abstract member DeleteAsync : MemberId -> Task<bool>

// Chores

type IChoreRepository =
    abstract member GetByIdAsync : ChoreId -> Task<Chore option>
    abstract member GetAllAsync : unit -> Task<Chore seq>
    abstract member AddAsync : Chore -> Task<Chore>
    abstract member UpdateAsync : Chore -> Task<Chore>
    abstract member DeleteAsync : ChoreId -> Task<bool>

// Assignments

type IChoreAssignmentRepository =
    abstract member GetByIdAsync : ChoreAssignmentId -> Task<ChoreAssignment option>
    abstract member GetAllAsync : unit -> Task<ChoreAssignment seq>
    abstract member AddAsync : ChoreAssignment -> Task<ChoreAssignment>
    abstract member UpdateAsync : ChoreAssignment -> Task<ChoreAssignment>
    abstract member DeleteAsync : ChoreAssignmentId -> Task<bool>
    abstract member GetByAssigneeAsync : MemberId -> Task<ChoreAssignment seq>

// Completions (immutable history)

type IChoreCompletionRepository =
    abstract member GetByIdAsync : ChoreCompletionId -> Task<ChoreCompletion option>
    abstract member AddAsync : ChoreCompletion -> Task<ChoreCompletion>
    abstract member GetByAssignmentAsync : ChoreAssignmentId -> Task<ChoreCompletion seq>
    abstract member GetByMemberAsync : MemberId -> DateTime -> DateTime -> Task<ChoreCompletion seq>

// Calendar

type ICalendarRepository =
    abstract member GetByIdAsync : CalendarId -> Task<Calendar option>
    abstract member GetAllAsync : unit -> Task<Calendar seq>
    abstract member AddAsync : Calendar -> Task<Calendar>
    abstract member UpdateAsync : Calendar -> Task<Calendar>
    abstract member DeleteAsync : CalendarId -> Task<bool>

type ICalendarEventRepository =
    abstract member GetByIdAsync : CalendarEventId -> Task<CalendarEvent option>
    abstract member GetByCalendarAsync : CalendarId -> Task<CalendarEvent seq>
    abstract member AddAsync : CalendarEvent -> Task<CalendarEvent>
    abstract member UpdateAsync : CalendarEvent -> Task<CalendarEvent>
    abstract member DeleteAsync : CalendarEventId -> Task<bool>

// Reminders

type IReminderRepository =
    abstract member GetByIdAsync : ReminderId -> Task<Reminder option>
    abstract member GetByEventAsync : CalendarEventId -> Task<Reminder seq>
    abstract member AddAsync : Reminder -> Task<Reminder>
    abstract member UpdateAsync : Reminder -> Task<Reminder>
    abstract member DeleteAsync : ReminderId -> Task<bool>
