namespace LifeOS.Domain.Home

open LifeOS.Domain.Common
open System

type Chore = {
    Id: ChoreId
    Title: string
    Description: string option
    Category: ChoreCategory
    EstimatedMinutes: int option
    DefaultPoints: int option
    IsActive: bool
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.Archive () =
        Ok { this with IsActive = false; UpdatedAt = DateTime.utcNow() }

module Chore =
    let create (title: string) (description: string option) (category: ChoreCategory) (estimatedMinutes: int option) (defaultPoints: int option) =
        result {
            if String.IsNullOrWhiteSpace(title) then
                return! Error (ValidationError "Chore title is required")

            let now = DateTime.utcNow()
            return {
                Id = HomeId.createChoreId()
                Title = title
                Description = description
                Category = category
                EstimatedMinutes = estimatedMinutes
                DefaultPoints = defaultPoints
                IsActive = true
                CreatedAt = now
                UpdatedAt = now
            }
        }

type ChoreAssignment = {
    Id: ChoreAssignmentId
    ChoreId: ChoreId
    Assignee: MemberId
    Window: AssignmentWindow
    Status: AssignmentStatus
    Recurrence: Recurrence option
    StartDateUtc: DateTime
    DueTimeLocal: TimeSpan option
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.Pause () =
        if this.Status = Active then
            Ok { this with Status = Paused; UpdatedAt = DateTime.utcNow() }
        else
            Error (BusinessRuleViolation "Only active assignments can be paused")

    member this.Resume () =
        if this.Status = Paused then
            Ok { this with Status = Active; UpdatedAt = DateTime.utcNow() }
        else
            Error (BusinessRuleViolation "Only paused assignments can be resumed")

module ChoreAssignment =
    let create (choreId: ChoreId) (assignee: MemberId) (window: AssignmentWindow) (recurrence: Recurrence option) (startDateUtc: DateTime) (dueTimeLocal: TimeSpan option) =
        let now = DateTime.utcNow()
        {
            Id = HomeId.createChoreAssignmentId()
            ChoreId = choreId
            Assignee = assignee
            Window = window
            Status = Active
            Recurrence = recurrence
            StartDateUtc = startDateUtc
            DueTimeLocal = dueTimeLocal
            CreatedAt = now
            UpdatedAt = now
        }

type ChoreCompletion = {
    Id: ChoreCompletionId
    AssignmentId: ChoreAssignmentId
    CompletedBy: MemberId
    CompletedAtUtc: DateTime
    Outcome: CompletionOutcome
    Notes: string option
    PointsAwarded: int option
} 

module ChoreCompletion =
    let create (assignmentId: ChoreAssignmentId) (completedBy: MemberId) (completedAtUtc: DateTime) (outcome: CompletionOutcome) (notes: string option) (pointsAwarded: int option) =
        {
            Id = HomeId.createChoreCompletionId()
            AssignmentId = assignmentId
            CompletedBy = completedBy
            CompletedAtUtc = completedAtUtc
            Outcome = outcome
            Notes = notes
            PointsAwarded = pointsAwarded
        }
