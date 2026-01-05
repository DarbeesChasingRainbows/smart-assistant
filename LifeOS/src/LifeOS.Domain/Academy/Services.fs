namespace LifeOS.Domain.Academy

open System.Threading.Tasks
open LifeOS.Domain.Common
open LifeOS.Domain.SharedKernel
open System

// Domain Services for Academy operations
type IAcademyDomainService =
    abstract member CompleteTaskAsync : AcademyTask -> int option -> Task<Result<AcademyTask * UserSkill list, DomainError>>
    abstract member ApproveTaskAsync : AcademyTask -> UserId -> Task<Result<AcademyTask, DomainError>>
    abstract member GetLeaderboardAsync : int -> Task<LeaderboardEntry list>

type AcademyDomainService(
    taskRepo: ITaskRepository,
    skillRepo: ISkillRepository,
    userSkillRepo: IUserSkillRepository,
    userRepo: IUserRepository,
    achievementRepo: IAchievementRepository) =
    
    interface IAcademyDomainService with
        
        member _.CompleteTaskAsync task duration =
            async {
                // Complete the task
                match task.Complete duration (DateTime.utcNow()) with
                | Ok completedTask ->
                    // Get or create user skills for each skill the task develops
                    let mutable userSkills = []
                    let mutable errors = []
                    
                    for skillId in task.SkillIds do
                        match! userSkillRepo.GetByUserIdAndSkillIdAsync task.AssignedTo skillId |> Async.AwaitTask with
                        | Some userSkill ->
                            // Award XP for using the skill
                            match! skillRepo.GetByIdAsync skillId |> Async.AwaitTask with
                            | Some skill ->
                                match UserSkill.useSkill userSkill skill (DateTime.utcNow()) with
                                | Ok updatedSkill ->
                                    let! savedSkill = userSkillRepo.UpdateAsync updatedSkill |> Async.AwaitTask
                                    userSkills <- savedSkill :: userSkills
                                | Error e -> errors <- e :: errors
                            | None -> errors <- (NotFoundError $"Skill {skillId} not found") :: errors
                        | None ->
                            // Create new user skill
                            match UserSkill.create task.AssignedTo skillId with
                            | Ok newUserSkill ->
                                match! skillRepo.GetByIdAsync skillId |> Async.AwaitTask with
                                | Some skill ->
                                    match UserSkill.useSkill newUserSkill skill (DateTime.utcNow()) with
                                    | Ok updatedSkill ->
                                        let! savedSkill = userSkillRepo.AddAsync updatedSkill |> Async.AwaitTask
                                        userSkills <- savedSkill :: userSkills
                                    | Error e -> errors <- e :: errors
                                | None -> errors <- (NotFoundError $"Skill {skillId} not found") :: errors
                            | Error e -> errors <- e :: errors
                    
                    // Save the completed task
                    let! savedTask = taskRepo.UpdateAsync completedTask |> Async.AwaitTask
                    
                    if List.isEmpty errors then
                        return Ok (savedTask, userSkills)
                    else
                        return Error errors.Head
                | Error e -> return Error e
            } |> Async.StartAsTask
        
        member _.ApproveTaskAsync task approverId =
            async {
                // Check if approver can approve tasks
                let! approver = userRepo.GetByIdAsync approverId |> Async.AwaitTask
                match approver with
                | Some user when user.CanApproveTasks ->
                    match task.Approve approverId (DateTime.utcNow()) with
                    | Ok approvedTask ->
                        let! savedTask = taskRepo.UpdateAsync approvedTask |> Async.AwaitTask
                        
                        // Achievement checking would be done here or in a separate service
                        // Skipping for now to avoid circular dependency
                        
                        return Ok savedTask
                    | Error e -> return Error e
                | _ -> return Error (BusinessRuleViolation "User does not have approval privileges")
            } |> Async.StartAsTask
        
        member _.GetLeaderboardAsync count =
            async {
                let! allUsers = userRepo.GetAllAsync() |> Async.AwaitTask
                
                let! leaderboardEntries = 
                    allUsers
                    |> Seq.map (fun user -> async {
                        let! userSkills = userSkillRepo.GetByUserIdAsync user.Id |> Async.AwaitTask
                        let totalXP = userSkills |> Seq.sumBy (fun us -> XP.value us.TotalXP)
                        
                        return {
                            UserId = user.Id
                            Username = Username.value user.Username
                            TotalXP = XP totalXP
                            Level = Level.levelFromXP (XP totalXP)
                            SkillsCount = Seq.length userSkills
                            Rank = 0 // Will be calculated after sorting
                        }
                    })
                    |> Async.Sequential
                
                let leaderboard =
                    leaderboardEntries
                    |> Seq.sortByDescending (fun e -> XP.value e.TotalXP)
                    |> Seq.take count
                    |> Seq.mapi (fun index entry -> { entry with Rank = index + 1 })
                    |> Seq.toList
                
                return leaderboard
            } |> Async.StartAsTask

// Additional domain services
type ISkillProgressionService =
    abstract member GetSkillPathAsync : SkillId -> Task<SkillPath>
    abstract member RecommendSkillsAsync : UserId -> Task<SkillRecommendation list>

type SkillProgressionService(skillRepo: ISkillRepository, userSkillRepo: IUserSkillRepository) =
    
    interface ISkillProgressionService with
        
        member _.GetSkillPathAsync skillId =
            async {
                let! allSkills = skillRepo.GetAllAsync() |> Async.AwaitTask
                let targetSkill = allSkills |> Seq.find (fun s -> s.Id = skillId)
                
                // Build skill tree showing prerequisites and related skills
                let rec buildPath skill =
                    let prerequisites = 
                        skill.Prerequisites
                        |> List.map (fun prereqId -> 
                            allSkills |> Seq.find (fun s -> s.Id = prereqId))
                        |> List.collect buildPath
                    
                    let related = 
                        skill.RelatedSkills
                        |> List.map (fun relatedId ->
                            allSkills |> Seq.find (fun s -> s.Id = relatedId))
                        |> List.map (fun s -> {
                            Id = s.Id
                            Name = s.Name
                            Category = s.Category
                            IsPrerequisite = false
                            IsCompleted = false // Would need user context
                        })
                    
                    [{
                        Id = skill.Id
                        Name = skill.Name
                        Category = skill.Category
                        IsPrerequisite = true
                        IsCompleted = false // Would need user context
                    }] @ prerequisites @ related
                
                return {
                    TargetSkill = {
                        Id = targetSkill.Id
                        Name = targetSkill.Name
                        Category = targetSkill.Category
                        IsPrerequisite = false
                        IsCompleted = false
                    }
                    RequiredSkills = buildPath targetSkill
                    TotalPrerequisites = List.length targetSkill.Prerequisites
                }
            } |> Async.StartAsTask
        
        member _.RecommendSkillsAsync userId =
            async {
                let! userSkills = userSkillRepo.GetByUserIdAsync userId |> Async.AwaitTask
                let! allSkills = skillRepo.GetActiveSkillsAsync() |> Async.AwaitTask
                
                let userSkillIds = userSkills |> Seq.map (fun us -> us.SkillId) |> Set.ofSeq
                
                // Get categories from skills the user already has
                let userCategories = 
                    userSkills 
                    |> Seq.choose (fun us -> 
                        allSkills |> Seq.tryFind (fun s -> s.Id = us.SkillId))
                    |> Seq.map (fun skill -> skill.Category)
                    |> Set.ofSeq
                
                // Recommend skills in categories user is already learning
                let recommendations = 
                    allSkills
                    |> Seq.filter (fun skill ->
                        not (Set.contains skill.Id userSkillIds) &&
                        Set.contains skill.Category userCategories)
                    |> Seq.map (fun skill ->
                        let prerequisiteCount = List.length skill.Prerequisites
                        let prerequisitesMet = 
                            skill.Prerequisites
                            |> List.forall (fun prereqId -> Set.contains prereqId userSkillIds)
                        
                        {
                            SkillId = skill.Id
                            SkillName = skill.Name
                            Category = skill.Category
                            Difficulty = skill.BaseXPReward
                            PrerequisiteCount = prerequisiteCount
                            PrerequisitesMet = prerequisitesMet
                            RecommendationScore = 
                                if prerequisitesMet then decimal (100 - prerequisiteCount * 10)
                                else decimal (50 - prerequisiteCount * 5)
                        })
                    |> Seq.sortByDescending (fun r -> r.RecommendationScore)
                    |> Seq.take 10
                    |> Seq.toList
                
                return recommendations
            } |> Async.StartAsTask

// Factory for creating academy domain services
module AcademyServiceFactory =
    let createAcademyDomainService taskRepo skillRepo userSkillRepo userRepo achievementRepo =
        AcademyDomainService(taskRepo, skillRepo, userSkillRepo, userRepo, achievementRepo) :> IAcademyDomainService
    
    let createSkillProgressionService skillRepo userSkillRepo =
        SkillProgressionService(skillRepo, userSkillRepo) :> ISkillProgressionService
