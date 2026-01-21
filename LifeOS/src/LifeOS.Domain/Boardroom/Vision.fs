namespace LifeOS.Domain.Boardroom

open LifeOS.Domain.Common
open System

// Vision Aggregate - High-level strategic vision
type Vision = {
    Id: VisionId
    Title: string
    Description: string
    Timeframe: Timeframe
    Status: VisionStatus
    OwnerId: UserId
    MissionStatement: string option
    CoreValues: string list
    StrategicPriorities: string list
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.Activate () =
        match this.Status with
        | Draft ->
            Ok
                { this with
                    Status = Active
                    UpdatedAt = DateTime.utcNow()
                }
        | _ -> Error (BusinessRuleViolation "Only draft visions can be activated")
    
    member this.PutOnHold (reason: string) =
        match this.Status with
        | Active ->
            Ok
                { this with
                    Status = OnHold
                    UpdatedAt = DateTime.utcNow()
                }
        | _ -> Error (BusinessRuleViolation "Only active visions can be put on hold")
    
    member this.Resume () =
        match this.Status with
        | OnHold ->
            Ok
                { this with
                    Status = Active
                    UpdatedAt = DateTime.utcNow()
                }
        | _ -> Error (BusinessRuleViolation "Only on-hold visions can be resumed")
    
    member this.Complete () =
        match this.Status with
        | Active | OnHold ->
            Ok
                { this with
                    Status = VisionStatus.Completed
                    UpdatedAt = DateTime.utcNow()
                }
        | _ -> Error (BusinessRuleViolation "Only active or on-hold visions can be completed")
    
    member this.Archive () =
        match this.Status with
        | status when status <> Archived ->
            Ok
                { this with
                    Status = Archived
                    UpdatedAt = DateTime.utcNow()
                }
        | _ -> Error (BusinessRuleViolation "Vision is already archived")
    
    member this.UpdateTitle (newTitle: string) =
        if String.IsNullOrEmpty(newTitle) then
            Error (ValidationError "Vision title cannot be empty")
        else
            Ok
                { this with
                    Title = newTitle
                    UpdatedAt = DateTime.utcNow()
                }
    
    member this.AddCoreValue (value: string) =
        if String.IsNullOrEmpty(value) then
            Error (ValidationError "Core value cannot be empty")
        elif this.CoreValues |> List.contains value then
            Error (BusinessRuleViolation "Core value already exists")
        else
            Ok
                { this with
                    CoreValues = value :: this.CoreValues
                    UpdatedAt = DateTime.utcNow()
                }
    
    member this.RemoveCoreValue (value: string) =
        if not (this.CoreValues |> List.contains value) then
            Error (ValidationError "Core value not found")
        else
            Ok
                { this with
                    CoreValues = this.CoreValues |> List.filter ((<>) value)
                    UpdatedAt = DateTime.utcNow()
                }
    
    member this.AddStrategicPriority (priority: string) =
        if String.IsNullOrEmpty(priority) then
            Error (ValidationError "Strategic priority cannot be empty")
        elif this.StrategicPriorities |> List.contains priority then
            Error (BusinessRuleViolation "Strategic priority already exists")
        else
            Ok
                { this with
                    StrategicPriorities = priority :: this.StrategicPriorities
                    UpdatedAt = DateTime.utcNow()
                }
    
    member this.GetProgressPercentage (kras: KRA seq) =
        let visionKRAs = kras |> Seq.filter (fun k -> k.VisionId = this.Id)
        if Seq.isEmpty visionKRAs then 0m
        else
            let completedCount = visionKRAs |> Seq.filter (fun k -> k.Status = Completed) |> Seq.length
            decimal completedCount / decimal (Seq.length visionKRAs) * 100m

// Vision Module for factory methods
module Vision =
    let create title description timeframe ownerId missionStatement coreValues strategicPriorities =
        result {
            if String.IsNullOrEmpty(title) then
                return! Error (ValidationError "Vision title is required")
            
            return {
                Id = BoardroomId.createVisionId()
                Title = title
                Description = description
                Timeframe = timeframe
                Status = Draft
                OwnerId = ownerId
                MissionStatement = missionStatement
                CoreValues = coreValues
                StrategicPriorities = strategicPriorities
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            }
        }
    
    // Business rules
    let canHaveKRAs (vision: Vision) =
        match vision.Status with
        | Active -> true
        | Draft -> false
        | _ -> false
    
    let getTimeframeInYears (timeframe: Timeframe) =
        match timeframe with
        | Timeframe.Quarterly -> 0.25m
        | Timeframe.Annually -> 1m
        | Timeframe.ThreeYear -> 3m
        | Timeframe.FiveYear -> 5m
        | Timeframe.TenYear -> 10m
    
    let isExpired (vision: Vision) =
        let yearsSinceCreation = decimal ((DateTime.utcNow() - vision.CreatedAt).Days) / 365.25m
        yearsSinceCreation > getTimeframeInYears vision.Timeframe
    
    let getRecommendedKRACount (timeframe: Timeframe) =
        match timeframe with
        | Timeframe.Quarterly -> 3
        | Timeframe.Annually -> 5
        | Timeframe.ThreeYear -> 7
        | Timeframe.FiveYear -> 10
        | Timeframe.TenYear -> 12
    
    let validateVisionCompleteness (vision: Vision) =
        let errors = []
        let errors = 
            if String.IsNullOrEmpty(vision.Description) then
                "Vision description is required" :: errors
            else errors
        
        let errors = 
            if List.isEmpty vision.CoreValues then
                "At least one core value is required" :: errors
            else errors
        
        let errors = 
            if List.isEmpty vision.StrategicPriorities then
                "At least one strategic priority is required" :: errors
            else errors
        
        if List.isEmpty errors then
            Ok ()
        else
            Error (BusinessRuleViolation (String.concat "; " errors))
