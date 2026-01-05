namespace LifeOS.Domain.Garden

open LifeOS.Domain.Common
open System

// CropBatch Aggregate - Inventory tracking for crops
type CropBatch = {
    Id: CropBatchId
    SpeciesId: SpeciesId
    GardenBedId: GardenBedId option
    BatchName: string
    Status: CropStatus
    Quantity: Quantity
    Unit: string // e.g., "seeds", "plants", "lbs"
    DateSeeded: DateTime option
    DateHarvested: DateTime option
    ExpectedYield: Quantity option
    ActualYield: Quantity option
    Quality: string option // e.g., "Grade A", "Premium"
    Notes: string option
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.Seed (quantity: Quantity) (date: DateTime) =
        match this.Status with
        | Planned ->
            Ok { this with 
                Status = Seeded
                Quantity = quantity
                DateSeeded = Some date
                UpdatedAt = DateTime.utcNow()
            }
        | _ -> Error (BusinessRuleViolation "Only planned batches can be seeded")
    
    member this.Germinate () =
        match this.Status with
        | Seeded ->
            Ok { this with 
                Status = Germinated
                UpdatedAt = DateTime.utcNow()
            }
        | _ -> Error (BusinessRuleViolation "Only seeded batches can germinate")
    
    member this.MarkAsGrowing () =
        match this.Status with
        | Germinated ->
            Ok { this with 
                Status = Growing
                UpdatedAt = DateTime.utcNow()
            }
        | _ -> Error (BusinessRuleViolation "Only germinated batches can be marked as growing")
    
    member this.Flower () =
        match this.Status with
        | Growing ->
            Ok { this with 
                Status = Flowering
                UpdatedAt = DateTime.utcNow()
            }
        | _ -> Error (BusinessRuleViolation "Only growing batches can flower")
    
    member this.Fruit () =
        match this.Status with
        | Flowering ->
            Ok { this with 
                Status = Fruiting
                UpdatedAt = DateTime.utcNow()
            }
        | _ -> Error (BusinessRuleViolation "Only flowering batches can fruit")
    
    member this.Harvest (actualYield: Quantity) (quality: string option) (date: DateTime) =
        match this.Status with
        | Fruiting ->
            Ok { this with 
                Status = Harvested
                ActualYield = Some actualYield
                Quality = quality
                DateHarvested = Some date
                UpdatedAt = DateTime.utcNow()
            }
        | _ -> Error (BusinessRuleViolation "Only fruiting batches can be harvested")
    
    member this.MarkAsFailed (reason: string) =
        match this.Status with
        | status when status <> Harvested && status <> Terminated ->
            Ok { this with 
                Status = Failed
                Notes = Some reason
                UpdatedAt = DateTime.utcNow()
            }
        | _ -> Error (BusinessRuleViolation "Cannot mark completed batches as failed")
    
    member this.Terminate (reason: string) =
        match this.Status with
        | status when status <> Harvested && status <> Terminated ->
            Ok { this with 
                Status = Terminated
                Notes = Some reason
                UpdatedAt = DateTime.utcNow()
            }
        | _ -> Error (BusinessRuleViolation "Cannot terminate completed batches")
    
    member this.IsCompleted =
        match this.Status with
        | Harvested | Failed | Terminated -> true
        | _ -> false
    
    member this.GetDaysSinceSeeded (currentDate: DateTime) =
        match this.DateSeeded with
        | Some seededDate -> (currentDate - seededDate).Days
        | None -> 0

// CropBatch Module for factory methods
module CropBatch =
    let create speciesId gardenBedId batchName quantity unit expectedYield notes =
        result {
            if String.IsNullOrEmpty(batchName) then
                return! Error (ValidationError "Batch name is required")
            
            let! validatedQuantity = Quantity.create quantity
            let validatedExpectedYield = 
                match expectedYield with
                | Some yieldValue -> 
                    match Quantity.create yieldValue with
                    | Ok q -> Some q
                    | Error _ -> None
                | None -> None
            
            return {
                Id = GardenId.createCropBatchId()
                SpeciesId = speciesId
                GardenBedId = gardenBedId
                BatchName = batchName
                Status = Planned
                Quantity = validatedQuantity
                Unit = unit
                DateSeeded = None
                DateHarvested = None
                ExpectedYield = validatedExpectedYield
                ActualYield = None
                Quality = None
                Notes = notes
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            }
        }
    
    // Business rules
    let canPlantInBed (batch: CropBatch) (bed: GardenBed) =
        match batch.GardenBedId with
        | Some _ -> Error (BusinessRuleViolation "Batch is already planted in a bed")
        | None ->
            if not bed.IsActive then
                Error (BusinessRuleViolation "Cannot plant in an inactive bed")
            else
                Ok ()
    
    let calculateYieldPercentage (batch: CropBatch) =
        match batch.ExpectedYield, batch.ActualYield with
        | Some expected, Some actual ->
            let expectedValue = Quantity.value expected
            let actualValue = Quantity.value actual
            if expectedValue > 0m then
                Some (actualValue / expectedValue * 100m)
            else
                None
        | _ -> None
    
    let getProfitability (batch: CropBatch) (resourceConsumption: ResourceConsumption seq) (laborRecords: LaborRecord seq) (salePrice: decimal option) =
        let resourceCost = resourceConsumption |> Seq.sumBy (fun r -> r.TotalCost)
        let laborCost = laborRecords |> Seq.sumBy (fun l -> l.TotalCost)
        let totalCost = resourceCost + laborCost
        
        match salePrice, batch.ActualYield with
        | Some price, Some actualYield ->
            let revenue = price * Quantity.value actualYield
            Some (revenue - totalCost)
        | _ -> Some (-totalCost) // Negative cost if no revenue yet
