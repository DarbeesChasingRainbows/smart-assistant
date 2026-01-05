namespace LifeOS.Domain.Home

open LifeOS.Domain.Common
open System

type Calendar = {
    Id: CalendarId
    Name: string
    CreatedAt: DateTime
    UpdatedAt: DateTime
}

module Calendar =
    let create (name: string) =
        result {
            if String.IsNullOrWhiteSpace(name) then
                return! Error (ValidationError "Calendar name is required")

            let now = DateTime.utcNow()
            return {
                Id = HomeId.createCalendarId()
                Name = name
                CreatedAt = now
                UpdatedAt = now
            }
        }

type EventVisibility =
    | Household
    | ParentsOnly
    | ChildVisible

type CalendarEvent = {
    Id: CalendarEventId
    CalendarId: CalendarId
    Title: string
    Description: string option
    StartUtc: DateTime
    EndUtc: DateTime option
    Location: string option
    Visibility: EventVisibility
    Recurrence: Recurrence option
    CreatedAt: DateTime
    UpdatedAt: DateTime
}

module CalendarEvent =
    let create (calendarId: CalendarId) (title: string) (description: string option) (startUtc: DateTime) (endUtc: DateTime option) (location: string option) (visibility: EventVisibility) (recurrence: Recurrence option) =
        result {
            if String.IsNullOrWhiteSpace(title) then
                return! Error (ValidationError "Event title is required")

            let now = DateTime.utcNow()
            return {
                Id = HomeId.createCalendarEventId()
                CalendarId = calendarId
                Title = title
                Description = description
                StartUtc = startUtc
                EndUtc = endUtc
                Location = location
                Visibility = visibility
                Recurrence = recurrence
                CreatedAt = now
                UpdatedAt = now
            }
        }

type ReminderTrigger =
    | AtTime
    | BeforeMinutes of int

type ReminderChannel =
    | InApp
    | Email
    | Push

type Reminder = {
    Id: ReminderId
    EventId: CalendarEventId
    Trigger: ReminderTrigger
    Channel: ReminderChannel
    Enabled: bool
}

module Reminder =
    let create (eventId: CalendarEventId) (trigger: ReminderTrigger) (channel: ReminderChannel) =
        {
            Id = HomeId.createReminderId()
            EventId = eventId
            Trigger = trigger
            Channel = channel
            Enabled = true
        }
