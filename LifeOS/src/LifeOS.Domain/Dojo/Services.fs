namespace LifeOS.Domain.Dojo

open LifeOS.Domain.Common
open System
open System.Threading.Tasks

// Domain Services for Dojo operations
type IDojoDomainService =
    abstract member LogHabitAsync : Habit -> LogStatus -> string option -> int option -> int option -> Task<Result<Habit * HabitLog, DomainError>>
    abstract member PromoteIdentityAsync : Identity -> Task<Result<Identity, DomainError>>
    abstract member GetDojoDashboardAsync : UserId -> Task<DojoDashboard>

type DojoDomainService(
    identityRepo: IIdentityRepository,
    habitRepo: IHabitRepository,
    logRepo: IHabitLogRepository) =
    
    interface IDojoDomainService with
        
        member _.LogHabitAsync habit status notes duration quality =
            async {
                let currentDate = DateTime.utcNow()
                
                // Create habit log
                let log = {
                    Id = DojoId.createHabitLogId()
                    HabitId = habit.Id
                    UserId = habit.UserId
                    Date = currentDate
                    Status = status
                    Notes = notes
                    DurationMinutes = duration
                    Quality = quality
                    CreatedAt = currentDate
                }
                
                // Save log
                let! savedLog = logRepo.AddAsync log |> Async.AwaitTask
                
                // Update habit streak
                let completed = status = Completed
                let updatedHabit = habit.UpdateStreak completed currentDate
                
                // Save updated habit
                let! savedHabit = habitRepo.UpdateAsync updatedHabit |> Async.AwaitTask
                
                return Ok (savedHabit, savedLog)
            } |> Async.StartAsTask
        
        member _.PromoteIdentityAsync identity =
            async {
                // Get associated habits to check promotion criteria
                let! associatedHabits = 
                    identity.AssociatedHabits
                    |> List.map (fun habitId -> habitRepo.GetByIdAsync habitId |> Async.AwaitTask)
                    |> Async.Sequential
                    |> AsyncHelpers.map (Seq.choose id)
                
                match Identity.canPromoteToLevel identity (Apprentice) (Seq.toList associatedHabits) with
                | Ok () ->
                    match identity.PromoteLevel () with
                    | Ok promotedIdentity ->
                        let! savedIdentity = identityRepo.UpdateAsync promotedIdentity |> Async.AwaitTask
                        return Ok savedIdentity
                    | Error e -> return Error e
                | Error e -> return Error e
            } |> Async.StartAsTask
        
        member _.GetDojoDashboardAsync userId =
            async {
                let! identities = identityRepo.GetByUserIdAsync userId |> Async.AwaitTask
                let! habits = habitRepo.GetByUserIdAsync userId |> Async.AwaitTask
                let! todayLogs = logRepo.GetTodayLogsAsync userId (DateTime.utcNow()) |> Async.AwaitTask
                
                let activeIdentities = identities |> Seq.filter (fun i -> true) // All identities are active
                let activeHabits = habits |> Seq.filter (fun h -> h.IsActive)
                
                let todayCompleted = todayLogs |> Seq.filter (fun l -> l.Status = Completed) |> Seq.length
                let todayPending = activeHabits |> Seq.filter (fun h -> h.ShouldCompleteOn (DateTime.utcNow())) |> Seq.length
                
                let totalStreakDays = activeHabits |> Seq.sumBy (fun h -> StreakDays.value h.CurrentStreak)
                let longestStreak = 
                    activeHabits 
                    |> Seq.map (fun h -> StreakDays.value h.LongestStreak) 
                    |> Seq.sortDescending 
                    |> Seq.tryHead 
                    |> Option.defaultValue 0
                
                return {
                    UserId = userId
                    ActiveIdentities = Seq.length activeIdentities
                    ActiveHabits = Seq.length activeHabits
                    TodayCompleted = todayCompleted
                    TodayPending = todayPending
                    TotalStreakDays = totalStreakDays
                    LongestStreak = longestStreak
                    TopIdentities = 
                        identities
                        |> Seq.sortByDescending (fun i -> Identity.calculateIdentityScore i habits)
                        |> Seq.take 3
                        |> Seq.map (fun i -> {
                            IdentityId = i.Id
                            Name = i.Name
                            Level = i.Level
                            Progress = i.GetProgressPercentage habits
                        })
                        |> Seq.toList
                    HabitCategories = HabitStats.getCategoryBreakdown habits
                }
            } |> Async.StartAsTask

// Helper module for habit recommendations
module HabitRecommendations =
    let generateRecommendation (habit: Habit) (logs: HabitLog seq) =
        if StreakDays.value habit.CurrentStreak = 0 then
            "Start fresh tomorrow! Every day is a new opportunity."
        elif StreakDays.value habit.CurrentStreak < 7 then
            $"Great start! You're on a {StreakDays.value habit.CurrentStreak} day streak. Keep it going!"
        elif StreakDays.value habit.CurrentStreak < 30 then
            $"Excellent consistency! {StreakDays.value habit.CurrentStreak} days strong. You're building a great habit!"
        elif StreakDays.value habit.CurrentStreak < 100 then
            $"Incredible dedication! {StreakDays.value habit.CurrentStreak} days and counting. You're mastering this habit!"
        else
            $"Legendary! {StreakDays.value habit.CurrentStreak} day streak. This habit is part of who you are now!"

// Additional domain services
type IHabitTrackingService =
    abstract member GetStreakAnalysisAsync : HabitId -> Task<StreakAnalysis>
    abstract member GetHabitInsightsAsync : UserId -> Task<HabitInsight list>

type HabitTrackingService(habitRepo: IHabitRepository, logRepo: IHabitLogRepository) =
    
    interface IHabitTrackingService with
        
        member _.GetStreakAnalysisAsync habitId =
            async {
                let! habit = habitRepo.GetByIdAsync habitId |> Async.AwaitTask
                let! logs = logRepo.GetByHabitIdAsync habitId |> Async.AwaitTask
                
                match habit with
                | Some h ->
                    let completionHistory = 
                        logs
                        |> Seq.sortBy (fun l -> l.Date)
                        |> Seq.map (fun l -> l.Date, l.Status = Completed)
                        |> Seq.toList
                    
                    let missedDays = 
                        completionHistory
                        |> List.filter (fun (_, completed) -> not completed)
                        |> List.length
                    
                    let bestMonth = 
                        completionHistory
                        |> List.groupBy (fun (date, _) -> DateTime(date.Year, date.Month, 1))
                        |> List.map (fun (month, entries) -> 
                            month, entries |> List.filter (fun (_, completed) -> completed) |> List.length)
                        |> List.sortByDescending snd
                        |> List.tryHead
                    
                    return {
                        HabitId = h.Id
                        HabitName = h.Name
                        CurrentStreak = h.CurrentStreak
                        LongestStreak = h.LongestStreak
                        TotalCompletions = h.TotalCompletions
                        MissedDays = missedDays
                        BestMonth = bestMonth
                        ConsistencyRate = 
                            if List.length completionHistory > 0 then
                                decimal h.TotalCompletions / decimal (List.length completionHistory) * 100m
                            else 0m
                    }
                | None -> 
                    return {
                        HabitId = habitId
                        HabitName = ""
                        CurrentStreak = StreakDays.zero
                        LongestStreak = StreakDays.zero
                        TotalCompletions = 0
                        MissedDays = 0
                        BestMonth = None
                        ConsistencyRate = 0m
                    }
            } |> Async.StartAsTask
        
        member _.GetHabitInsightsAsync userId =
            async {
                let! habits = habitRepo.GetByUserIdAsync userId |> Async.AwaitTask
                let! logs = logRepo.GetByUserIdAsync userId |> Async.AwaitTask
                
                let insights = 
                    habits
                    |> Seq.filter (fun h -> h.IsActive)
                    |> Seq.map (fun habit ->
                        let habitLogs = logs |> Seq.filter (fun l -> l.HabitId = habit.Id)
                        let avgDuration = 
                            let durations = habitLogs |> Seq.choose (fun l -> l.DurationMinutes)
                            if Seq.isEmpty durations then None
                            else Some (durations |> Seq.averageBy decimal)
                        
                        let avgQuality = 
                            let qualities = habitLogs |> Seq.choose (fun l -> l.Quality)
                            if Seq.isEmpty qualities then None
                            else Some (qualities |> Seq.averageBy decimal)
                        
                        let bestTimeOfDay = 
                            habitLogs
                            |> Seq.filter (fun l -> l.Status = Completed)
                            |> Seq.groupBy (fun l -> l.Date.Hour)
                            |> Seq.map (fun (hour, entries) -> hour, Seq.length entries)
                            |> Seq.sortByDescending snd
                            |> Seq.tryHead
                            |> Option.map fst
                        
                        {
                            HabitId = habit.Id
                            HabitName = habit.Name
                            Category = habit.Category
                            CurrentStreak = habit.CurrentStreak
                            AverageDuration = avgDuration
                            AverageQuality = avgQuality
                            BestTimeOfDay = bestTimeOfDay
                            Recommendation = HabitRecommendations.generateRecommendation habit habitLogs
                        })
                    |> Seq.toList
                
                return insights
            } |> Async.StartAsTask

// Factory for creating dojo domain services
module DojoServiceFactory =
    let createDojoDomainService identityRepo habitRepo logRepo =
        DojoDomainService(identityRepo, habitRepo, logRepo) :> IDojoDomainService
    
    let createHabitTrackingService habitRepo logRepo =
        HabitTrackingService(habitRepo, logRepo) :> IHabitTrackingService
