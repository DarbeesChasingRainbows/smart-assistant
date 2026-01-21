namespace LifeOS.Domain.Dojo

open LifeOS.Domain.Common
open System

// Identity Aggregate - Represents a personal identity or role the user is developing
type Identity = {
    Id: IdentityId
    UserId: UserId
    Name: string
    Description: string
    Level: IdentityLevel
    AssociatedHabits: HabitId list
    Milestones: Milestone list
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.AddHabit (habitId: HabitId) =
        if this.AssociatedHabits |> List.contains habitId then
            Error (BusinessRuleViolation "Habit is already associated with this identity")
        else
            Ok
                { this with
                    AssociatedHabits = habitId :: this.AssociatedHabits
                    UpdatedAt = DateTime.utcNow()
                }
    
    member this.RemoveHabit (habitId: HabitId) =
        if not (this.AssociatedHabits |> List.contains habitId) then
            Error (ValidationError "Habit is not associated with this identity")
        else
            Ok
                { this with
                    AssociatedHabits =
                        this.AssociatedHabits |> List.filter ((<>) habitId)
                    UpdatedAt = DateTime.utcNow()
                }
    
    member this.AddMilestone (name: string) (description: string) (requiredStreak: StreakDays) (requiredCompletionRate: CompletionRate) =
        if String.IsNullOrEmpty(name) then
            Error (ValidationError "Milestone name is required")
        elif this.Milestones |> List.exists (fun m -> m.Name = name) then
            Error (BusinessRuleViolation "Milestone with this name already exists")
        else
            let newMilestone =
                {
                    Id = Guid.NewGuid()
                    Name = name
                    Description = description
                    RequiredStreak = requiredStreak
                    RequiredCompletionRate = requiredCompletionRate
                    IsAchieved = false
                    AchievedAt = None
                }
            
            Ok
                { this with
                    Milestones = newMilestone :: this.Milestones
                    UpdatedAt = DateTime.utcNow()
                }
    
    member this.AchieveMilestone (milestoneId: Guid) (currentDate: DateTime) =
        match this.Milestones |> List.tryFind (fun m -> m.Id = milestoneId) with
        | Some milestone when not milestone.IsAchieved ->
            let updatedMilestone =
                { milestone with
                    IsAchieved = true
                    AchievedAt = Some currentDate
                }
            
            let updatedMilestones = 
                this.Milestones 
                |> List.map (fun m -> if m.Id = milestoneId then updatedMilestone else m)
            
            Ok
                { this with
                    Milestones = updatedMilestones
                    UpdatedAt = currentDate
                }
        | Some _ -> Error (BusinessRuleViolation "Milestone is already achieved")
        | None -> Error (NotFoundError "Milestone not found")
    
    member this.PromoteLevel () =
        match this.Level with
        | Master -> Error (BusinessRuleViolation "Already at maximum level")
        | level ->
            let nextLevel = 
                match level with
                | Novice -> Apprentice
                | Apprentice -> Adept
                | Adept -> Expert
                | Expert -> Master
                | Master -> Master // Shouldn't reach here
            
            Ok
                { this with
                    Level = nextLevel
                    UpdatedAt = DateTime.utcNow()
                }
    
    member this.GetProgressPercentage (habits: Habit seq) =
        let associatedHabits = 
            habits 
            |> Seq.filter (fun h -> this.AssociatedHabits |> List.contains h.Id)
            |> Seq.toList
        
        if List.isEmpty associatedHabits then
            0m
        else
            let totalCompletions = associatedHabits |> List.sumBy (fun h -> h.TotalCompletions)
            let habitCount = List.length associatedHabits
            let totalPossible = habitCount * 30 // Assuming 30 days as baseline
            min 100m (decimal totalCompletions / decimal totalPossible * 100m)

// Identity Module for factory methods
module Identity =
    let create userId name description =
        if String.IsNullOrEmpty(name) then
            Error (ValidationError "Identity name is required")
        else
            Ok
                {
                    Id = DojoId.createIdentityId()
                    UserId = userId
                    Name = name
                    Description = description
                    Level = Novice
                    AssociatedHabits = []
                    Milestones = []
                    CreatedAt = DateTime.utcNow()
                    UpdatedAt = DateTime.utcNow()
                }
    
    // Business rules
    let currentLevelOrder = 
        function
        | Novice -> 1
        | Apprentice -> 2
        | Adept -> 3
        | Expert -> 4
        | Master -> 5
    
    let canPromoteToLevel (identity: Identity) (targetLevel: IdentityLevel) (habits: Habit seq) =
        let targetOrder = currentLevelOrder targetLevel
        let currentOrder = currentLevelOrder identity.Level
        
        if targetOrder <= currentOrder then
            Error (BusinessRuleViolation "Target level must be higher than current level")
        elif targetOrder > currentOrder + 1 then
            Error (BusinessRuleViolation "Can only promote one level at a time")
        else
            // Check if enough habits and progress
            let associatedHabits = 
                habits 
                |> Seq.filter (fun h -> identity.AssociatedHabits |> List.contains h.Id)
                |> Seq.length
            
            let minHabitsRequired = targetOrder * 2
            let progressRequired = decimal targetOrder * 20m
            
            if associatedHabits < minHabitsRequired then
                Error (BusinessRuleViolation $"Need at least {minHabitsRequired} habits to promote to {targetLevel}")
            elif identity.GetProgressPercentage habits < progressRequired then
                Error (BusinessRuleViolation $"Need at least {progressRequired:F0}%% progress to promote to {targetLevel}")
            else
                Ok ()
    
    let getRecommendedHabits (identity: Identity) (allHabits: Habit seq) =
        []
    
    let calculateIdentityScore (identity: Identity) (habits: Habit seq) =
        let associatedHabits = 
            habits 
            |> Seq.filter (fun h -> identity.AssociatedHabits |> List.contains h.Id)
            |> Seq.toList
        
        if List.isEmpty associatedHabits then
            0m
        else
            let levelScore = decimal (currentLevelOrder identity.Level) * 20m
            let habitScore = decimal (List.length associatedHabits) * 5m
            let streakScore = 
                associatedHabits 
                |> List.averageBy (fun h -> decimal (StreakDays.value h.CurrentStreak))
                |> min 20m
            let milestoneScore = 
                identity.Milestones 
                |> List.filter (fun m -> m.IsAchieved)
                |> List.length
                |> decimal
                |> (*) 10m
            
            levelScore + habitScore + streakScore + milestoneScore
    
    
