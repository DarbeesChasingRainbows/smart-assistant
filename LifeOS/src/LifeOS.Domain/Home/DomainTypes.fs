namespace LifeOS.Domain.Home

open LifeOS.Domain.Common
open System

// Value Objects for Home domain

type HouseholdId = HouseholdId of Guid
    with
        static member FromGuid(guid: Guid) = HouseholdId guid
        member this.Value = match this with HouseholdId id -> id

type MemberId = MemberId of Guid
    with
        static member FromGuid(guid: Guid) = MemberId guid
        member this.Value = match this with MemberId id -> id

type ChoreId = ChoreId of Guid
    with
        static member FromGuid(guid: Guid) = ChoreId guid
        member this.Value = match this with ChoreId id -> id

type ChoreAssignmentId = ChoreAssignmentId of Guid
    with
        static member FromGuid(guid: Guid) = ChoreAssignmentId guid
        member this.Value = match this with ChoreAssignmentId id -> id

type ChoreCompletionId = ChoreCompletionId of Guid
    with
        static member FromGuid(guid: Guid) = ChoreCompletionId guid
        member this.Value = match this with ChoreCompletionId id -> id

type CalendarId = CalendarId of Guid
    with
        static member FromGuid(guid: Guid) = CalendarId guid
        member this.Value = match this with CalendarId id -> id

type CalendarEventId = CalendarEventId of Guid
    with
        static member FromGuid(guid: Guid) = CalendarEventId guid
        member this.Value = match this with CalendarEventId id -> id

type ReminderId = ReminderId of Guid
    with
        static member FromGuid(guid: Guid) = ReminderId guid
        member this.Value = match this with ReminderId id -> id

[<RequireQualifiedAccess>]
module HomeId =
    let createHouseholdId () = HouseholdId (Guid.NewGuid())
    let createMemberId () = MemberId (Guid.NewGuid())
    let createChoreId () = ChoreId (Guid.NewGuid())
    let createChoreAssignmentId () = ChoreAssignmentId (Guid.NewGuid())
    let createChoreCompletionId () = ChoreCompletionId (Guid.NewGuid())
    let createCalendarId () = CalendarId (Guid.NewGuid())
    let createCalendarEventId () = CalendarEventId (Guid.NewGuid())
    let createReminderId () = ReminderId (Guid.NewGuid())

    let householdIdValue (HouseholdId id) = id
    let memberIdValue (MemberId id) = id
    let choreIdValue (ChoreId id) = id
    let choreAssignmentIdValue (ChoreAssignmentId id) = id
    let choreCompletionIdValue (ChoreCompletionId id) = id
    let calendarIdValue (CalendarId id) = id
    let calendarEventIdValue (CalendarEventId id) = id
    let reminderIdValue (ReminderId id) = id

type MemberRole =
    | Parent
    | Child

type ChoreCategory =
    | Cleaning
    | Kitchen
    | Laundry
    | Yard
    | Pets
    | School
    | Other of string

type AssignmentWindow =
    | Anytime
    | Morning
    | Afternoon
    | Evening

type AssignmentStatus =
    | Active
    | Paused
    | Archived

type CompletionOutcome =
    | Done
    | Skipped
    | Partial
    | Failed

// Recurrence modeled as RRULE string (RFC5545). Store as-is for interoperability.
// Context7 reference: rrule.js supports parsing/serializing RRULE strings and sets.
type Recurrence = {
    DtStartUtc: DateTime
    RRule: string
    RDatesUtc: DateTime list
    ExDatesUtc: DateTime list
}

[<RequireQualifiedAccess>]
module Recurrence =
    let single (dtStartUtc: DateTime) = {
        DtStartUtc = dtStartUtc
        RRule = ""
        RDatesUtc = []
        ExDatesUtc = []
    }
