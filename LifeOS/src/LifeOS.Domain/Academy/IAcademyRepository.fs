namespace LifeOS.Domain.Academy

open System.Threading.Tasks
open LifeOS.Domain.Common
open LifeOS.Domain.SharedKernel
open System

// ISkillRepository - Port for Skill persistence
type ISkillRepository =
    abstract member GetByIdAsync : SkillId -> Task<Skill option>
    abstract member GetAllAsync : unit -> Task<Skill seq>
    abstract member AddAsync : Skill -> Task<Skill>
    abstract member UpdateAsync : Skill -> Task<Skill>
    abstract member DeleteAsync : SkillId -> Task<bool>
    abstract member GetByCategoryAsync : SkillCategory -> Task<Skill seq>
    abstract member GetActiveSkillsAsync : unit -> Task<Skill seq>
    abstract member GetByPrerequisiteAsync : SkillId -> Task<Skill seq>
    abstract member SearchAsync : string -> Task<Skill seq>

// IUserSkillRepository - Port for UserSkill persistence
type IUserSkillRepository =
    abstract member GetByUserIdAndSkillIdAsync : UserId -> SkillId -> Task<UserSkill option>
    abstract member GetByUserIdAsync : UserId -> Task<UserSkill seq>
    abstract member GetBySkillIdAsync : SkillId -> Task<UserSkill seq>
    abstract member AddAsync : UserSkill -> Task<UserSkill>
    abstract member UpdateAsync : UserSkill -> Task<UserSkill>
    abstract member DeleteAsync : UserId -> SkillId -> Task<bool>
    abstract member GetTopSkillsByUserAsync : UserId -> int -> Task<UserSkill seq>
    abstract member GetSkillsByLevelAsync : UserId -> Level -> Task<UserSkill seq>

// ITaskRepository - Port for Task persistence
type ITaskRepository =
    abstract member GetByIdAsync : TaskId -> Task<AcademyTask option>
    abstract member GetAllAsync : unit -> Task<AcademyTask seq>
    abstract member AddAsync : AcademyTask -> Task<AcademyTask>
    abstract member UpdateAsync : AcademyTask -> Task<AcademyTask>
    abstract member DeleteAsync : TaskId -> Task<bool>
    abstract member GetByAssignedToAsync : UserId -> Task<AcademyTask seq>
    abstract member GetByAssignedByAsync : UserId -> Task<AcademyTask seq>
    abstract member GetByStatusAsync : TaskStatus -> Task<AcademyTask seq>
    abstract member GetBySkillIdAsync : SkillId -> Task<AcademyTask seq>
    abstract member GetOverdueTasksAsync : DateTime -> Task<AcademyTask seq>
    abstract member GetPendingApprovalAsync : unit -> Task<AcademyTask seq>

// IAchievementRepository - Port for Achievement persistence
type IAchievementRepository =
    abstract member GetAllAsync : unit -> Task<Achievement seq>
    abstract member GetByIdAsync : AchievementId -> Task<Achievement option>
    abstract member GetUserAchievementsAsync : UserId -> Task<UserAchievement seq>
    abstract member UnlockAchievementAsync : UserId -> AchievementId -> Task<UserAchievement>
    abstract member UpdateProgressAsync : UserId -> AchievementId -> decimal -> Task<UserAchievement>

// Extension methods for academy repository operations
[<RequireQualifiedAccess>]
module AcademyRepository =
    
    // Get user's skill progression summary
    let GetUserSkillSummaryAsync (userSkillRepo: IUserSkillRepository) (skillRepo: ISkillRepository) (userId: UserId) =
        async {
            let! userSkills = userSkillRepo.GetByUserIdAsync userId |> Async.AwaitTask
            let! allSkills = skillRepo.GetAllAsync() |> Async.AwaitTask
            
            return 
                userSkills
                |> Seq.map (fun us ->
                    let skill = allSkills |> Seq.find (fun s -> s.Id = us.SkillId)
                    {
                        SkillId = us.SkillId
                        SkillName = skill.Name
                        Category = skill.Category
                        CurrentLevel = us.CurrentLevel
                        CurrentXP = us.CurrentXP
                        TotalXP = us.TotalXP
                        ProgressPercentage = Skill.getProgressPercentage us
                        Streak = us.Streak
                    } : UserSkillSummary)
                |> Seq.toList
        }
    
    // Get available skills for user (not started or prerequisites met)
    let GetAvailableSkillsForUserAsync (skillRepo: ISkillRepository) (userSkillRepo: IUserSkillRepository) (userId: UserId) =
        async {
            let! allSkills = skillRepo.GetActiveSkillsAsync() |> Async.AwaitTask
            let! userSkills = userSkillRepo.GetByUserIdAsync userId |> Async.AwaitTask
            
            let userSkillIds = userSkills |> Seq.map (fun us -> us.SkillId) |> Set.ofSeq
            
            return 
                allSkills
                |> Seq.filter (fun skill ->
                    not (Set.contains skill.Id userSkillIds) &&
                    match Skill.canLearnSkill skill userSkills with
                    | Ok () -> true
                    | Error _ -> false)
                |> Seq.toList
        }
    
    // Calculate user's total XP and level
    let GetUserTotalStatsAsync (userSkillRepo: IUserSkillRepository) (userId: UserId) =
        async {
            let! userSkills = userSkillRepo.GetByUserIdAsync userId |> Async.AwaitTask
            
            let totalXP = userSkills |> Seq.sumBy (fun us -> XP.value us.TotalXP)
            let totalLevel = userSkills |> Seq.sumBy (fun us -> Level.value us.CurrentLevel)
            let activeStreaks = userSkills |> Seq.filter (fun us -> Streak.value us.Streak > 0) |> Seq.length
            
            return {
                TotalXP = XP totalXP
                OverallLevel = Level.levelFromXP (XP totalXP)
                SkillsLearned = Seq.length userSkills
                ActiveStreaks = activeStreaks
                AverageLevel = if Seq.length userSkills > 0 then decimal totalLevel / decimal (Seq.length userSkills) else 0m
            } : UserTotalStats
        }
