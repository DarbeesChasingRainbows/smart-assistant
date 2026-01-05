namespace LifeOS.Domain.Academy

open LifeOS.Domain.Common
open System

// Task Aggregate - RPG-style task system
type AcademyTask = {
    Id: TaskId
    Title: string
    Description: string
    AssignedTo: UserId
    AssignedBy: UserId
    SkillIds: SkillId list // Skills this task develops
    Difficulty: Difficulty
    Priority: Priority
    Status: TaskStatus
    XPReward: XP
    EstimatedDuration: int option // in minutes
    ActualDuration: int option
    DueDate: DateTime option
    CompletedAt: DateTime option
    ApprovedAt: DateTime option
    ApprovedBy: UserId option
    RejectionReason: string option
    Tags: string list
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
  member this.CanStart =
      match this.Status with
      | Pending -> true
      | _ -> false
  
  member this.Start (currentDate: DateTime) =
      match this.CanStart with
      | true ->
          Ok { this with 
              Status = InProgress
              UpdatedAt = currentDate
          }
      | false ->
          Error (BusinessRuleViolation "Task cannot be started in current status")
  
  member this.Complete (duration: int option) (currentDate: DateTime) =
      match this.Status with
      | InProgress ->
          Ok { this with 
              Status = Completed
              ActualDuration = duration
              CompletedAt = Some currentDate
              UpdatedAt = currentDate
          }
      | _ ->
          Error (BusinessRuleViolation "Only in-progress tasks can be completed")
  
  member this.Approve (approverId: UserId) (currentDate: DateTime) =
      match this.Status with
      | Completed ->
          Ok { this with 
              Status = Approved
              ApprovedAt = Some currentDate
              ApprovedBy = Some approverId
              UpdatedAt = currentDate
          }
      | _ ->
          Error (BusinessRuleViolation "Only completed tasks can be approved")
  
  member this.Reject (rejectorId: UserId) (reason: string) (currentDate: DateTime) =
      match this.Status with
      | Completed ->
          Ok { this with 
              Status = Rejected
              ApprovedBy = Some rejectorId
              RejectionReason = Some reason
              UpdatedAt = currentDate
          }
      | _ ->
          Error (BusinessRuleViolation "Only completed tasks can be rejected")
  
  member this.Cancel (reason: string) (currentDate: DateTime) =
      match this.Status with
      | status when status <> Approved && status <> Completed ->
          Ok { this with 
              Status = Cancelled
              RejectionReason = Some reason
              UpdatedAt = currentDate
          }
      | _ ->
          Error (BusinessRuleViolation "Cannot cancel approved or completed tasks")
  
  member this.IsOverdue (currentDate: DateTime) =
      match this.DueDate with
      | Some dueDate -> currentDate > dueDate && this.Status <> Completed && this.Status <> Approved
      | None -> false
  
  member this.GetCompletionRate =
      match this.ActualDuration, this.EstimatedDuration with
      | Some actual, Some estimated ->
          if estimated > 0 then decimal actual / decimal estimated * 100m
          else 100m
      | _ -> 0m

// Task Module for factory methods
module AcademyTask =
    let create title description assignedTo assignedBy skillIds difficulty priority xpReward estimatedDuration dueDate tags =
        result {
            if String.IsNullOrEmpty(title) then
                return! Error (ValidationError "Task title is required")
            
            let! validatedXPReward = XP.create xpReward
            
            return {
                Id = AcademyId.createTaskId()
                Title = title
                Description = description
                AssignedTo = assignedTo
                AssignedBy = assignedBy
                SkillIds = skillIds
                Difficulty = difficulty
                Priority = priority
                Status = Pending
                XPReward = validatedXPReward
                EstimatedDuration = estimatedDuration
                ActualDuration = None
                DueDate = dueDate
                CompletedAt = None
                ApprovedAt = None
                ApprovedBy = None
                RejectionReason = None
                Tags = tags
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            } : AcademyTask
        }
    
    let calculateXPReward (baseXP: XP) (difficulty: Difficulty) (completionRate: decimal) =
        let difficultyMultiplier =
            match difficulty with
            | Beginner -> 0.5m
            | Easy -> 0.75m
            | Medium -> 1.0m
            | Hard -> 1.5m
            | Expert -> 2.0m
            | Master -> 3.0m
        
        let completionMultiplier = min 1.5m (max 0.5m completionRate)
        let adjustedXP = decimal (XP.value baseXP) * difficultyMultiplier * completionMultiplier
        XP (int adjustedXP)
    
    let getTasksBySkill (tasks: AcademyTask seq) (skillId: SkillId) =
        tasks
        |> Seq.filter (fun t -> t.SkillIds |> List.contains skillId)
        |> Seq.toList
    
    let getTasksForUser (tasks: AcademyTask seq) (userId: UserId) =
        tasks
        |> Seq.filter (fun t -> t.AssignedTo = userId)
        |> Seq.toList
    
    let getOverdueTasks (tasks: AcademyTask seq) (currentDate: DateTime) =
        tasks
        |> Seq.filter (fun t -> t.IsOverdue currentDate)
        |> Seq.toList

// Task template for recurring tasks
type TaskTemplate = {
    Id: Guid
    Name: string
    Description: string
    SkillIds: SkillId list
    Difficulty: Difficulty
    Priority: Priority
    XPReward: XP
    EstimatedDuration: int option
    RecurrencePattern: RecurrencePattern
    IsActive: bool
    CreatedAt: DateTime
    UpdatedAt: DateTime
}

and RecurrencePattern =
    | Daily
    | Weekly of int // Day of week (0-6)
    | Monthly of int // Day of month
    | Custom of string // Cron expression

// TaskTemplate Module
module TaskTemplate =
    let create name description skillIds difficulty priority xpReward estimatedDuration recurrencePattern =
        result {
            if String.IsNullOrEmpty(name) then
                return! Error (ValidationError "Template name is required")
            
            let! validatedXPReward = XP.create xpReward
            
            return {
                Id = Guid.NewGuid()
                Name = name
                Description = description
                SkillIds = skillIds
                Difficulty = difficulty
                Priority = priority
                XPReward = validatedXPReward
                EstimatedDuration = estimatedDuration
                RecurrencePattern = recurrencePattern
                IsActive = true
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            }
        }
    
    let generateTask (template: TaskTemplate) (assignedTo: UserId) (assignedBy: UserId) (dueDate: DateTime option) =
        AcademyTask.create 
            template.Name 
            template.Description 
            assignedTo 
            assignedBy 
            template.SkillIds 
            template.Difficulty 
            template.Priority 
            (XP.value template.XPReward)
            template.EstimatedDuration 
            dueDate 
            []
