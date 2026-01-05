namespace LifeOS.Domain.Dojo

open LifeOS.Domain.Common
open System
open System.Threading.Tasks

// IIdentityRepository - Port for Identity persistence
type IIdentityRepository =
    abstract member GetByIdAsync : IdentityId -> Task<Identity option>
    abstract member GetAllAsync : unit -> Task<Identity seq>
    abstract member AddAsync : Identity -> Task<Identity>
    abstract member UpdateAsync : Identity -> Task<Identity>
    abstract member DeleteAsync : IdentityId -> Task<bool>
    abstract member GetByUserIdAsync : UserId -> Task<Identity seq>
    abstract member GetByLevelAsync : IdentityLevel -> Task<Identity seq>
    abstract member SearchAsync : string -> Task<Identity seq>

// IHabitRepository - Port for Habit persistence
type IHabitRepository =
    abstract member GetByIdAsync : HabitId -> Task<Habit option>
    abstract member GetAllAsync : unit -> Task<Habit seq>
    abstract member AddAsync : Habit -> Task<Habit>
    abstract member UpdateAsync : Habit -> Task<Habit>
    abstract member DeleteAsync : HabitId -> Task<bool>
    abstract member GetByUserIdAsync : UserId -> Task<Habit seq>
    abstract member GetByIdentityIdAsync : IdentityId -> Task<Habit seq>
    abstract member GetByCategoryAsync : HabitCategory -> Task<Habit seq>
    abstract member GetActiveHabitsAsync : UserId -> Task<Habit seq>
    abstract member GetHabitsNeedingAttentionAsync : UserId -> DateTime -> Task<Habit seq>

// IHabitLogRepository - Port for HabitLog persistence
type IHabitLogRepository =
    abstract member GetByIdAsync : HabitLogId -> Task<HabitLog option>
    abstract member AddAsync : HabitLog -> Task<HabitLog>
    abstract member UpdateAsync : HabitLog -> Task<HabitLog>
    abstract member DeleteAsync : HabitLogId -> Task<bool>
    abstract member GetByHabitIdAsync : HabitId -> Task<HabitLog seq>
    abstract member GetByUserIdAsync : UserId -> Task<HabitLog seq>
    abstract member GetByDateRangeAsync : UserId -> DateTime -> DateTime -> Task<HabitLog seq>
    abstract member GetByStatusAsync : LogStatus -> Task<HabitLog seq>
    abstract member GetTodayLogsAsync : UserId -> DateTime -> Task<HabitLog seq>

// Extension methods for dojo repository operations
[<RequireQualifiedAccess>]
module DojoRepository =
    
    // Get identity with associated habits
    let GetIdentityWithHabitsAsync (identityRepo: IIdentityRepository) (habitRepo: IHabitRepository) (identityId: IdentityId) =
        async {
            let! identity = identityRepo.GetByIdAsync identityId |> Async.AwaitTask
            match identity with
            | Some i ->
                let! habits = 
                    i.AssociatedHabits
                    |> List.map (fun habitId -> habitRepo.GetByIdAsync habitId |> Async.AwaitTask)
                    |> Async.Sequential
                    |> AsyncHelpers.map (Seq.choose id)
                
                return Some (i, habits)
            | None ->
                return None
        }
    
    // Get user's habit statistics
    let GetUserHabitStatsAsync (habitRepo: IHabitRepository) (logRepo: IHabitLogRepository) (userId: UserId) =
        async {
            let! habits = habitRepo.GetByUserIdAsync userId |> Async.AwaitTask
            let! logs = logRepo.GetByUserIdAsync userId |> Async.AwaitTask
            
            return 
                habits
                |> Seq.map (fun habit ->
                    let daysSinceCreation = (DateTime.utcNow() - habit.CreatedAt).Days
                    let stats = HabitStats.fromHabit habit daysSinceCreation
                    
                    // Calculate recent completion rate (last 30 days)
                    let recentLogs = 
                        logs
                        |> Seq.filter (fun l -> 
                            l.HabitId = habit.Id && 
                            (DateTime.utcNow() - l.Date).Days <= 30)
                    
                    let recentCompletions = recentLogs |> Seq.filter (fun l -> l.Status = Completed) |> Seq.length
                    let recentRate = if Seq.isEmpty recentLogs then 0m else decimal recentCompletions / decimal (Seq.length recentLogs) * 100m
                    
                    { stats with 
                        CompletionRate = CompletionRate recentRate
                    })
                |> Seq.toList
        }
    
    // Check for streak achievements
    let CheckStreakAchievementsAsync (habitRepo: IHabitRepository) (userId: UserId) =
        async {
            let! habits = habitRepo.GetActiveHabitsAsync userId |> Async.AwaitTask
            
            let streakAchievements = 
                habits
                |> Seq.filter (fun h -> StreakDays.value h.CurrentStreak >= 30) // 30 day streak
                |> Seq.map (fun (h: Habit) -> 
                    {
                        HabitId = h.Id
                        HabitName = h.Name
                        StreakDays = h.CurrentStreak
                        AchievementType = 
                            if StreakDays.value h.CurrentStreak >= 100 then "Century"
                            elif StreakDays.value h.CurrentStreak >= 66 then "Double Month"
                            elif StreakDays.value h.CurrentStreak >= 30 then "Month"
                            else "Building"
                    } : StreakAchievement)
                |> Seq.toList
            
            return streakAchievements
        }
    
    // Get identity progress summary
    let GetIdentityProgressAsync (identityRepo: IIdentityRepository) (habitRepo: IHabitRepository) (identityId: IdentityId) =
        async {
            let! identity = identityRepo.GetByIdAsync identityId |> Async.AwaitTask
            match identity with
            | Some i ->
                let! associatedHabits = 
                    i.AssociatedHabits
                    |> List.map (fun habitId -> habitRepo.GetByIdAsync habitId |> Async.AwaitTask)
                    |> Async.Sequential
                    |> AsyncHelpers.map (Seq.choose id)
                
                let activeCount = associatedHabits |> Seq.filter (fun h -> h.IsActive) |> Seq.length
                let avgStreak = 
                    if Seq.length associatedHabits > 0 then
                        associatedHabits 
                        |> Seq.averageBy (fun h -> decimal (StreakDays.value h.CurrentStreak))
                    else 0m
                
                let overallRate = i.GetProgressPercentage (Seq.toList associatedHabits)
                
                return {
                    IdentityId = i.Id
                    UserId = i.UserId
                    CurrentLevel = i.Level
                    TotalHabits = List.length i.AssociatedHabits
                    ActiveHabits = activeCount
                    AverageStreak = avgStreak
                    OverallCompletionRate = CompletionRate overallRate
                    LastUpdated = i.UpdatedAt
                }
            | None ->
                return {
                    IdentityId = identityId
                    UserId = UserId (Guid.Empty)
                    CurrentLevel = Novice
                    TotalHabits = 0
                    ActiveHabits = 0
                    AverageStreak = 0m
                    OverallCompletionRate = CompletionRate 0m
                    LastUpdated = DateTime.utcNow()
                }
        }
