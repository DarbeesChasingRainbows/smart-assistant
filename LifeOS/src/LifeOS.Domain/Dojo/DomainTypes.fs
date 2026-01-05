namespace LifeOS.Domain.Dojo

open LifeOS.Domain.Common
open System

// Value Objects for Dojo domain
type IdentityId = IdentityId of Guid
type HabitId = HabitId of Guid
type HabitLogId = HabitLogId of Guid

// Module for creating IDs
module DojoId =
    let createIdentityId () = IdentityId (Guid.NewGuid())
    let createHabitId () = HabitId (Guid.NewGuid())
    let createHabitLogId () = HabitLogId (Guid.NewGuid())
    
    let identityIdValue (IdentityId id) = id
    let habitIdValue (HabitId id) = id
    let habitLogIdValue (HabitLogId id) = id

// Frequency and tracking value objects
type Frequency = Frequency of int // Times per period
type StreakDays = StreakDays of int
type CompletionRate = CompletionRate of decimal

// Frequency utilities
module Frequency =
    let create (value: int) =
        if value <= 0 then
            Error (ValidationError "Frequency must be positive")
        else
            Ok (Frequency value)
    
    let value (Frequency f) = f

// Streak utilities
module StreakDays =
    let create (value: int) =
        if value < 0 then
            Error (ValidationError "Streak days cannot be negative")
        else
            Ok (StreakDays value)
    
    let value (StreakDays s) = s
    let zero = StreakDays 0

// Completion rate utilities
module CompletionRate =
    let create (value: decimal) =
        if value < 0m || value > 100m then
            Error (ValidationError "Completion rate must be between 0 and 100")
        else
            Ok (CompletionRate value)
    
    let value (CompletionRate cr) = cr

// Habit frequency patterns
type HabitFrequency =
    | Daily
    | Weekly of int // Days of week (0-6 bitmask)
    | Monthly of int // Day of month
    | Custom of string // Cron expression

// Habit categories
type HabitCategory =
    | Physical
    | Mental
    | Spiritual
    | Social
    | Intellectual
    | Creative
    | Financial
    | Health
    | Productivity
    | Other of string

// Identity levels
type IdentityLevel =
    | Novice
    | Apprentice
    | Adept
    | Expert
    | Master

// Habit status
type HabitStatus =
    | Active
    | Paused
    | Completed
    | Archived

// Log status
type LogStatus =
    | Completed
    | Skipped
    | Failed

// Milestone type (used by Identity)
type Milestone = {
    Id: Guid
    Name: string
    Description: string
    RequiredStreak: StreakDays
    RequiredCompletionRate: CompletionRate
    IsAchieved: bool
    AchievedAt: DateTime option
}

// Habit log entry
type HabitLog = {
    Id: HabitLogId
    HabitId: HabitId
    UserId: UserId
    Date: DateTime
    Status: LogStatus
    Notes: string option
    DurationMinutes: int option
    Quality: int option // 1-5 rating
    CreatedAt: DateTime
}

// Identity progress tracking
type IdentityProgress = {
    IdentityId: IdentityId
    UserId: UserId
    CurrentLevel: IdentityLevel
    TotalHabits: int
    ActiveHabits: int
    AverageStreak: decimal
    OverallCompletionRate: CompletionRate
    LastUpdated: DateTime
}

// Dojo dashboard type
type DojoDashboard = {
    UserId: UserId
    ActiveIdentities: int
    ActiveHabits: int
    TodayCompleted: int
    TodayPending: int
    TotalStreakDays: int
    LongestStreak: int
    TopIdentities: IdentitySummary list
    HabitCategories: CategoryBreakdown list
}

// Identity summary for dashboard
and IdentitySummary = {
    IdentityId: IdentityId
    Name: string
    Level: IdentityLevel
    Progress: decimal
}

// Category breakdown for dashboard
and CategoryBreakdown = {
    Category: HabitCategory
    Count: int
    AverageStreak: decimal
}

// Streak analysis type
type StreakAnalysis = {
    HabitId: HabitId
    HabitName: string
    CurrentStreak: StreakDays
    LongestStreak: StreakDays
    TotalCompletions: int
    MissedDays: int
    BestMonth: (DateTime * int) option
    ConsistencyRate: decimal
}

// Habit insight type
type HabitInsight = {
    HabitId: HabitId
    HabitName: string
    Category: HabitCategory
    CurrentStreak: StreakDays
    AverageDuration: decimal option
    AverageQuality: decimal option
    BestTimeOfDay: int option
    Recommendation: string
}

// Streak achievement for milestone tracking
type StreakAchievement = {
    HabitId: HabitId
    HabitName: string
    StreakDays: StreakDays
    AchievementType: string
}
