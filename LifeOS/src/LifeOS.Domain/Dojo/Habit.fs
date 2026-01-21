namespace LifeOS.Domain.Dojo

open LifeOS.Domain.Common
open System

// Habit Aggregate - Represents a recurring habit
type Habit = {
    Id: HabitId
    IdentityId: IdentityId option
    UserId: UserId
    Name: string
    Description: string
    Category: HabitCategory
    Frequency: HabitFrequency
    TargetFrequency: Frequency
    Status: HabitStatus
    CurrentStreak: StreakDays
    LongestStreak: StreakDays
    TotalCompletions: int
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.IsActive =
        this.Status = Active
    
    member this.Pause () =
        if this.Status = Active then
            Ok
                { this with
                    Status = Paused
                    UpdatedAt = DateTime.utcNow()
                }
        else
            Error (BusinessRuleViolation "Only active habits can be paused")
    
    member this.Resume () =
        if this.Status = Paused then
            Ok
                { this with
                    Status = Active
                    UpdatedAt = DateTime.utcNow()
                }
        else
            Error (BusinessRuleViolation "Only paused habits can be resumed")
    
    member this.Complete () =
        if this.Status = Active then
            Ok
                { this with
                    Status = HabitStatus.Completed
                    UpdatedAt = DateTime.utcNow()
                }
        else
            Error (BusinessRuleViolation "Only active habits can be marked as completed")
    
    member this.Archive () =
        if this.Status <> Archived then
            Ok
                { this with
                    Status = Archived
                    UpdatedAt = DateTime.utcNow()
                }
        else
            Error (BusinessRuleViolation "Habit is already archived")
    
    member this.UpdateStreak (completed: bool) (currentDate: DateTime) =
        if completed then
            let newStreak = StreakDays (StreakDays.value this.CurrentStreak + 1)
            let newLongest = 
                if StreakDays.value newStreak > StreakDays.value this.LongestStreak then newStreak
                else this.LongestStreak
            
            { this with
                CurrentStreak = newStreak
                LongestStreak = newLongest
                TotalCompletions = this.TotalCompletions + 1
                UpdatedAt = currentDate
            }
        else
            { this with
                CurrentStreak = StreakDays.zero
                UpdatedAt = currentDate
            }
    
    member this.GetCompletionRate (totalDays: int) =
        if totalDays > 0 then
            CompletionRate (decimal this.TotalCompletions / decimal totalDays * 100m)
        else
            CompletionRate 0m
    
    member this.ShouldCompleteOn (date: DateTime) =
        match this.Frequency with
        | Daily -> true
        | Weekly days ->
            let dayOfWeek = int date.DayOfWeek
            (days &&& (1 <<< dayOfWeek)) <> 0
        | Monthly day ->
            date.Day = day
        | Custom _ -> true // Would need cron parser
    
    member this.GetStreakPercentage () =
        if StreakDays.value this.LongestStreak > 0 then
            decimal (StreakDays.value this.CurrentStreak) / decimal (StreakDays.value this.LongestStreak) * 100m
        else
            0m

// Habit Module for factory methods
module Habit =
    let create userId identityId name description category frequency targetFrequency =
        result {
            if String.IsNullOrEmpty(name) then
                return! Error (ValidationError "Habit name is required")
            
            let! validatedTargetFrequency = Frequency.create targetFrequency
            
            return {
                Id = DojoId.createHabitId()
                IdentityId = identityId
                UserId = userId
                Name = name
                Description = description
                Category = category
                Frequency = frequency
                TargetFrequency = validatedTargetFrequency
                Status = Active
                CurrentStreak = StreakDays.zero
                LongestStreak = StreakDays.zero
                TotalCompletions = 0
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            }
        }
    
    // Business rules
    let canAssociateWithIdentity (habit: Habit) (identityUserId: UserId) =
        match habit.IdentityId with
        | Some _ -> Error (BusinessRuleViolation "Habit is already associated with an identity")
        | None ->
            if identityUserId <> habit.UserId then
                Error (BusinessRuleViolation "Cannot associate habit with different user's identity")
            else
                Ok ()
    
    let associateWithIdentity (habit: Habit) (identityId: IdentityId) =
        match habit.IdentityId with
        | Some _ -> Error (BusinessRuleViolation "Habit is already associated with an identity")
        | None ->
            Ok
                { habit with
                    IdentityId = Some identityId
                    UpdatedAt = DateTime.utcNow()
                }
    
    let disassociateFromIdentity (habit: Habit) =
        match habit.IdentityId with
        | None -> Error (BusinessRuleViolation "Habit is not associated with any identity")
        | Some _ ->
            Ok
                { habit with
                    IdentityId = None
                    UpdatedAt = DateTime.utcNow()
                }
    
    let calculateSuccessRate (habit: Habit) (daysSinceCreation: int) =
        if daysSinceCreation > 0 && habit.IsActive then
            let expectedCompletions = 
                match habit.Frequency with
                | Daily -> daysSinceCreation
                | Weekly _ -> daysSinceCreation / 7
                | Monthly _ -> daysSinceCreation / 30
                | Custom _ -> daysSinceCreation // Assume daily for custom
            
            if expectedCompletions > 0 then
                decimal habit.TotalCompletions / decimal expectedCompletions * 100m
            else
                0m
        else
            0m
    
    let getHabitsByCategory (habits: Habit seq) (category: HabitCategory) =
        habits
        |> Seq.filter (fun h -> h.Category = category)
        |> Seq.toList
    
    let getActiveHabits (habits: Habit seq) =
        habits
        |> Seq.filter (fun h -> h.IsActive)
        |> Seq.toList
    
    let getHabitsNeedingAttention (habits: Habit seq) (currentDate: DateTime) =
        habits
        |> Seq.filter (fun h -> 
            h.IsActive && 
            StreakDays.value h.CurrentStreak = 0 && 
            h.ShouldCompleteOn (currentDate.AddDays(-1.0)))
        |> Seq.toList

// Habit statistics
type HabitStats = {
    HabitId: HabitId
    Name: string
    Category: HabitCategory
    CurrentStreak: StreakDays
    LongestStreak: StreakDays
    TotalCompletions: int
    CompletionRate: CompletionRate
    SuccessRate: decimal
    IsActive: bool
}

// Habit statistics module
module HabitStats =
    let fromHabit (habit: Habit) (daysSinceCreation: int) =
        {
            HabitId = habit.Id
            Name = habit.Name
            Category = habit.Category
            CurrentStreak = habit.CurrentStreak
            LongestStreak = habit.LongestStreak
            TotalCompletions = habit.TotalCompletions
            CompletionRate = habit.GetCompletionRate daysSinceCreation
            SuccessRate = Habit.calculateSuccessRate habit daysSinceCreation
            IsActive = habit.IsActive
        }
    
    let getTopStreaks (habits: Habit seq) (count: int) =
        habits
        |> Seq.filter (fun h -> h.IsActive)
        |> Seq.sortByDescending (fun h -> StreakDays.value h.CurrentStreak)
        |> Seq.take count
        |> Seq.toList
    
    let getCategoryBreakdown (habits: Habit seq) =
        habits
        |> Seq.groupBy (fun h -> h.Category)
        |> Seq.map (fun (category, categoryHabits) ->
            let count = Seq.length categoryHabits
            let avgStreak = 
                categoryHabits 
                |> Seq.averageBy (fun h -> decimal (StreakDays.value h.CurrentStreak))
            
            {
                Category = category
                Count = count
                AverageStreak = avgStreak
            } : CategoryBreakdown)
        |> Seq.toList
